import * as Linking from "expo-linking";
import { SOSPayload, SOSResponse } from "../types";
import { getSetting, getEmergencyContacts } from "../db/database";
import { getOrCreateDeviceId } from "./cloudSync";

const API_BASE_URL = "https://api.travel-emergency.co.kr/v1";
const REQUEST_TIMEOUT = 8000;

/**
 * 긴급구조 SOS 프로세스
 *
 * 플로우:
 * 1. 전화발신 (필수) - 인터넷 없어도 동작
 * 2. 당사 서버에 SOS 신호 전송 (필수 시도, 실패 허용)
 *    - 성공 시: 서버에서 발신번호 캡처 → DB 매칭 → 비상연락처 알림톡 → 운영정책 실행
 *    - 실패 시: 전화발신만으로 발신번호 기반 후속조치 가능
 *
 * @returns SOS 처리 결과 (전화발신 성공 여부, 서버 전송 결과)
 */
export async function executeEmergencySOS(
  phoneNumber: string
): Promise<{
  callInitiated: boolean;
  serverNotified: boolean;
  serverMessage: string;
}> {
  // 1단계: 전화발신 (필수)
  let callInitiated = false;
  try {
    const telUrl = `tel:${phoneNumber}`;
    const canOpen = await Linking.canOpenURL(telUrl);
    if (canOpen) {
      await Linking.openURL(telUrl);
      callInitiated = true;
    }
  } catch {
    // 전화발신 실패 시에도 서버 전송은 시도
    callInitiated = false;
  }

  // 2단계: 당사 서버에 SOS 신호 전송 (필수 시도, 실패 허용)
  let serverNotified = false;
  let serverMessage = "";

  try {
    const payload = await buildSOSPayload(callInitiated);
    const result = await sendSOSToServer(payload);
    serverNotified = result.success;
    serverMessage = result.message;
  } catch {
    serverNotified = false;
    serverMessage = "서버 전송 실패 - 전화발신으로 구조 요청이 접수됩니다.";
  }

  return { callInitiated, serverNotified, serverMessage };
}

/**
 * SOS 페이로드 구성
 */
async function buildSOSPayload(callInitiated: boolean): Promise<SOSPayload> {
  const [userName, userPhone, travelCountry, gpsLat, gpsLng] =
    await Promise.all([
      getSetting("user_name"),
      getSetting("user_phone"),
      getSetting("selected_country"),
      getSetting("gps_latitude"),
      getSetting("gps_longitude"),
    ]);

  const contacts = await getEmergencyContacts();
  const deviceId = await getOrCreateDeviceId();

  return {
    user_name: userName ?? "",
    user_phone: userPhone ?? "",
    travel_country: travelCountry ?? "",
    emergency_contacts: contacts.map((c) => ({
      name: c.name,
      phone: c.phone,
      relationship: c.relationship,
    })),
    gps_latitude: gpsLat ? parseFloat(gpsLat) : null,
    gps_longitude: gpsLng ? parseFloat(gpsLng) : null,
    sos_timestamp: new Date().toISOString(),
    sos_type: callInitiated ? "CALL_AND_API" : "CALL_ONLY",
    device_id: deviceId,
  };
}

/**
 * SOS 신호를 당사 서버에 전송
 *
 * 서버 수신 후 자동 후속조치:
 * - 발신번호 캡처 및 DB 검색
 * - 이용자 확인 (이름, 전화번호, 여행국가 매칭)
 * - 비상연락망에 알림톡 발송
 * - 경찰신고 등 당사 운영정책 실행
 */
async function sendSOSToServer(payload: SOSPayload): Promise<SOSResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE_URL}/sos/emergency`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SOS-Priority": "CRITICAL",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        success: false,
        sos_id: "",
        message: `SOS 서버 전송 실패 (${response.status})`,
      };
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      sos_id: "",
      message:
        error instanceof Error && error.name === "AbortError"
          ? "서버 연결 시간 초과 - 전화로 구조 요청이 접수됩니다."
          : "인터넷 연결 불가 - 전화로 구조 요청이 접수됩니다.",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 긴급 알림톡 발송 요청 (비상연락처에 알림)
 *
 * 서버에서 실행되는 후속 조치:
 * - 등록된 비상연락처 전원에게 알림톡 발송
 * - 알림 내용: 여행자 이름, 여행국가, 현재위치(GPS), 긴급상황 발생 시각
 */
export async function requestAlimtalkNotification(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const [userName, userPhone, travelCountry, gpsLat, gpsLng] =
      await Promise.all([
        getSetting("user_name"),
        getSetting("user_phone"),
        getSetting("selected_country"),
        getSetting("gps_latitude"),
        getSetting("gps_longitude"),
      ]);

    const contacts = await getEmergencyContacts();
    const deviceId = await getOrCreateDeviceId();

    if (contacts.length === 0) {
      return { success: false, message: "등록된 비상연락처가 없습니다." };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(`${API_BASE_URL}/sos/alimtalk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_name: userName,
          user_phone: userPhone,
          travel_country: travelCountry,
          gps_latitude: gpsLat ? parseFloat(gpsLat) : null,
          gps_longitude: gpsLng ? parseFloat(gpsLng) : null,
          contacts: contacts.map((c) => ({
            name: c.name,
            phone: c.phone,
            relationship: c.relationship,
          })),
          device_id: deviceId,
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        return {
          success: false,
          message: `알림톡 발송 실패 (${response.status})`,
        };
      }

      const result = await response.json();
      return {
        success: true,
        message: `${contacts.length}명에게 긴급 알림톡이 발송되었습니다.`,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    return {
      success: false,
      message: "네트워크 연결을 확인해주세요.\n알림톡 발송에 인터넷 연결이 필요합니다.",
    };
  }
}
