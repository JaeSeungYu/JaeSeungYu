import { UserProfile, CloudSyncResponse } from "../types";
import { getSetting, setSetting, getEmergencyContacts } from "../db/database";
import {
  upsertUserProfile,
  syncEmergencyContacts,
  updateUserLocation,
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
