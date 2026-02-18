import { UserProfile, CloudSyncResponse } from "../types";
import { getSetting, setSetting, getEmergencyContacts } from "../db/database";
import {
  upsertUserProfile,
  syncEmergencyContacts,
  updateUserLocation,
  checkPhoneDuplicate,
  requestVerificationCode,
  verifyVerificationCode,
} from "./supabaseClient";

/**
 * 디바이스 고유 ID 생성/조회
 */
function generateDeviceId(): string {
  return "device-" + Math.random().toString(36).substring(2, 10);
}

let cachedDeviceId: string | null = null;

export async function getOrCreateDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  const saved = await getSetting("device_id");
  if (saved) {
    cachedDeviceId = saved;
    return saved;
  }

  const newId = generateDeviceId();
  await setSetting("device_id", newId);
  cachedDeviceId = newId;
  return newId;
}

/**
 * 현재 로컬에 저장된 사용자 프로필을 수집
 */
export async function collectUserProfile(): Promise<UserProfile> {
  const [userName, userPhone, travelCountry, gpsLat, gpsLng, gpsUpdatedAt] =
    await Promise.all([
      getSetting("user_name"),
      getSetting("user_phone"),
      getSetting("selected_country"),
      getSetting("gps_latitude"),
      getSetting("gps_longitude"),
      getSetting("gps_updated_at"),
    ]);

  const contacts = await getEmergencyContacts();
  const deviceId = await getOrCreateDeviceId();

  return {
    user_name: userName ?? "",
    user_phone: userPhone ?? "",
    travel_country: travelCountry ?? "",
    emergency_contacts: contacts,
    gps_latitude: gpsLat ? parseFloat(gpsLat) : null,
    gps_longitude: gpsLng ? parseFloat(gpsLng) : null,
    gps_updated_at: gpsUpdatedAt ?? null,
    device_id: deviceId,
    updated_at: new Date().toISOString(),
  };
}

/**
 * 사용자 프로필을 Supabase에 동기화
 *
 * - users 테이블에 프로필 upsert
 * - emergency_contacts 테이블에 비상연락처 동기화
 */
export async function syncProfileToServer(
  profile?: UserProfile
): Promise<CloudSyncResponse> {
  try {
    const data = profile ?? (await collectUserProfile());

    if (!data.user_name || !data.user_phone) {
      return {
        success: false,
        message: "이름과 휴대폰번호를 먼저 입력해주세요.",
        synced_at: "",
      };
    }

    // 1. 사용자 프로필 upsert
    await upsertUserProfile({
      user_phone: data.user_phone,
      user_name: data.user_name,
      travel_country: data.travel_country,
      gps_latitude: data.gps_latitude,
      gps_longitude: data.gps_longitude,
      device_id: data.device_id,
    });

    // 2. 비상연락처 동기화
    await syncEmergencyContacts(
      data.user_phone,
      data.emergency_contacts.map((c) => ({
        name: c.name,
        phone: c.phone,
        relationship: c.relationship,
      }))
    );

    const syncedAt = new Date().toISOString();
    await setSetting("last_synced_at", syncedAt);

    return {
      success: true,
      message: "서버 동기화 완료",
      synced_at: syncedAt,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "네트워크 연결을 확인해주세요.";

    return {
      success: false,
      message,
      synced_at: "",
    };
  }
}

/**
 * 비상연락처 변경 시 서버 동기화
 */
export async function syncContactsToServer(): Promise<CloudSyncResponse> {
  return syncProfileToServer();
}

/**
 * GPS 위치 업데이트 시 서버 동기화
 */
export async function syncLocationToServer(
  latitude: number,
  longitude: number
): Promise<CloudSyncResponse> {
  try {
    const userPhone = await getSetting("user_phone");
    if (!userPhone) {
      return {
        success: false,
        message: "휴대폰번호를 먼저 입력해주세요.",
        synced_at: "",
      };
    }

    await updateUserLocation(userPhone, latitude, longitude);

    return {
      success: true,
      message: "위치 동기화 완료",
      synced_at: new Date().toISOString(),
    };
  } catch {
    return {
      success: false,
      message: "위치 동기화 실패 - 네트워크를 확인해주세요.",
      synced_at: "",
    };
  }
}

/**
 * 백그라운드 GPS 위치 업데이트
 *
 * 긴급연락 화면에서 버튼 클릭 시 자동 호출
 * - UI를 블로킹하지 않음 (fire-and-forget)
 * - 데이터 연결이 없으면 서버 동기화만 스킵
 */
export async function updateGpsInBackground(): Promise<void> {
  try {
    let Location: any;
    try {
      Location = require("expo-location");
    } catch {
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const lat = location.coords.latitude;
    const lng = location.coords.longitude;
    const now = new Date().toISOString();

    // 로컬 저장
    await setSetting("gps_latitude", lat.toString());
    await setSetting("gps_longitude", lng.toString());
    await setSetting("gps_updated_at", now);

    // 서버에 위치 동기화 (데이터 연결 없으면 무시)
    await syncLocationToServer(lat, lng);
  } catch {
    // 위치 서비스 불가 또는 네트워크 오류 시 무시
  }
}

/**
 * 휴대폰번호 중복 확인
 *
 * 서버에 동일한 번호가 존재하고 다른 기기에서 등록된 경우
 * 인증코드 검증이 필요함
 */
export async function checkPhoneOwnership(
  phone: string
): Promise<{ needsVerification: boolean }> {
  try {
    const deviceId = await getOrCreateDeviceId();
    const result = await checkPhoneDuplicate(phone, deviceId);

    if (result.exists && !result.sameDevice) {
      return { needsVerification: true };
    }

    return { needsVerification: false };
  } catch {
    // 네트워크 오류 시 검증 불필요로 처리 (오프라인 허용)
    return { needsVerification: false };
  }
}

/**
 * 인증코드 요청 (앱 PUSH로 발송)
 */
export async function sendVerificationCode(
  phone: string
): Promise<{ success: boolean; message: string }> {
  try {
    await requestVerificationCode(phone);
    return {
      success: true,
      message: "인증코드가 앱 PUSH로 발송되었습니다.",
    };
  } catch {
    return {
      success: false,
      message: "인증코드 발송 실패 - 네트워크를 확인해주세요.",
    };
  }
}

/**
 * 인증코드 검증
 */
export async function verifyPhoneCode(
  phone: string,
  code: string
): Promise<{ success: boolean; message: string }> {
  try {
    const verified = await verifyVerificationCode(phone, code);
    if (verified) {
      return { success: true, message: "인증이 완료되었습니다." };
    }
    return { success: false, message: "인증코드가 일치하지 않습니다." };
  } catch {
    return {
      success: false,
      message: "인증 실패 - 네트워크를 확인해주세요.",
    };
  }
}
