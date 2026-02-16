import { UserProfile, CloudSyncResponse, EmergencyContact } from "../types";
import { getSetting, getEmergencyContacts } from "../db/database";

/**
 * 당사 클라우드 DB 서버 API 기본 URL
 * TODO: 실제 서버 URL로 교체 필요
 */
const API_BASE_URL = "https://api.travel-emergency.co.kr/v1";

/** 요청 타임아웃 (ms) */
const REQUEST_TIMEOUT = 10000;

/**
 * 디바이스 고유 ID 생성/조회
 * 실제 환경에서는 expo-device 또는 expo-application에서 가져옴
 */
export function getDeviceId(): string {
  // TODO: expo-application의 installationId 등으로 교체
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

  const newId = getDeviceId();
  const { setSetting } = await import("../db/database");
  await setSetting("device_id", newId);
  cachedDeviceId = newId;
  return newId;
}

/**
 * 타임아웃이 적용된 fetch
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 네트워크 연결 상태 확인
 */
export async function checkNetworkAvailable(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/health`,
      { method: "HEAD" },
      5000
    );
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 현재 로컬에 저장된 사용자 프로필을 수집하여 UserProfile 객체로 반환
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
 * 사용자 프로필을 당사 클라우드 DB 서버에 동기화
 *
 * 서버 동기화 실패 시에도 로컬 저장은 이미 완료된 상태이므로
 * 에러를 throw하지 않고 실패 결과를 반환합니다.
 */
export async function syncProfileToServer(
  profile?: UserProfile
): Promise<CloudSyncResponse> {
  try {
    const data = profile ?? (await collectUserProfile());

    // 필수 정보가 없으면 동기화 스킵
    if (!data.user_name || !data.user_phone) {
      return {
        success: false,
        message: "이름과 휴대폰번호를 먼저 입력해주세요.",
        synced_at: "",
      };
    }

    const response = await fetchWithTimeout(`${API_BASE_URL}/users/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      return {
        success: false,
        message: `서버 응답 오류 (${response.status})`,
        synced_at: "",
      };
    }

    const result: CloudSyncResponse = await response.json();

    // 마지막 동기화 시간 로컬 저장
    const { setSetting } = await import("../db/database");
    await setSetting("last_synced_at", result.synced_at || new Date().toISOString());

    return result;
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "서버 연결 시간 초과"
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
    const deviceId = await getOrCreateDeviceId();
    const userPhone = await getSetting("user_phone");

    const response = await fetchWithTimeout(`${API_BASE_URL}/users/location`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_id: deviceId,
        user_phone: userPhone,
        gps_latitude: latitude,
        gps_longitude: longitude,
        gps_updated_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        message: `위치 동기화 실패 (${response.status})`,
        synced_at: "",
      };
    }

    return await response.json();
  } catch {
    return {
      success: false,
      message: "위치 동기화 실패 - 네트워크를 확인해주세요.",
      synced_at: "",
    };
  }
}
