import { SOSPayload } from "../types";
import { getSetting, getEmergencyContacts } from "../db/database";
import { getOrCreateDeviceId } from "./cloudSync";
import { sendSOSSignal, requestAlimtalk } from "./supabaseClient";

/**
 * 긴급구조 SOS 신호 전송 (서버 전송 전용)
 *
 * 플로우:
 * 1. Supabase에 SOS 신호 전송
 * 2. 비상연락망 SMS/알림톡 발송 트리거
 */
export async function sendSOSSignalOnly(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const payload = await buildSOSPayload();

    await sendSOSSignal({
      user_phone: payload.user_phone,
      user_name: payload.user_name,
      travel_country: payload.travel_country,
      gps_latitude: payload.gps_latitude,
      gps_longitude: payload.gps_longitude,
      sos_type: "CALL_AND_API",
      device_id: payload.device_id,
    });

    return {
      success: true,
      message: "SOS 신호가 서버에 접수되었습니다.",
    };
  } catch {
    return {
      success: false,
      message: "서버 전송 실패",
    };
  }
}

/**
 * SOS 페이로드 구성
 */
async function buildSOSPayload(): Promise<SOSPayload> {
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
    sos_type: "CALL_AND_API",
    device_id: deviceId,
  };
}

/**
 * 긴급 알림톡 발송 요청 (비상연락처에 알림)
 *
 * Supabase Edge Function을 호출하여 카카오 알림톡 발송
 */
export async function requestAlimtalkNotification(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const [userName, userPhone, travelCountry] = await Promise.all([
      getSetting("user_name"),
      getSetting("user_phone"),
      getSetting("selected_country"),
    ]);

    const contacts = await getEmergencyContacts();

    if (contacts.length === 0) {
      return { success: false, message: "등록된 비상연락처가 없습니다." };
    }

    await requestAlimtalk(
      userPhone ?? "",
      userName ?? "",
      travelCountry ?? ""
    );

    return {
      success: true,
      message: `${contacts.length}명에게 긴급 알림톡이 발송되었습니다.`,
    };
  } catch {
    return {
      success: false,
      message:
        "네트워크 연결을 확인해주세요.\n알림톡 발송에 인터넷 연결이 필요합니다.",
    };
  }
}
