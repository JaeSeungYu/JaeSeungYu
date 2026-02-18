import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase 클라이언트 설정
 *
 * 환경변수는 .env 파일에서 관리 (.env.example 참고)
 * Expo에서 EXPO_PUBLIC_ 접두사 환경변수는 빌드 시 자동 주입됨
 */
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  "https://tknvnbvqfgmwrbtkpqrs.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbnZuYnZxZmdtd3JidGtwcXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTQzMTksImV4cCI6MjA4Njc5MDMxOX0.mDLj_1n6eETiOVX_feN2L3I60FcAEwET_reGs0j4cmw";

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ─── 사용자 프로필 ───

export async function upsertUserProfile(profile: {
  user_phone: string;
  user_name: string;
  travel_country: string;
  gps_latitude: number | null;
  gps_longitude: number | null;
  device_id: string;
}) {
  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        ...profile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_phone" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── 비상연락처 동기화 ───

export async function syncEmergencyContacts(
  userPhone: string,
  contacts: { name: string; phone: string; relationship: string }[]
) {
  // 기존 연락처 삭제 후 새로 삽입
  await supabase
    .from("emergency_contacts")
    .delete()
    .eq("user_phone", userPhone);

  if (contacts.length === 0) return;

  const { error } = await supabase.from("emergency_contacts").insert(
    contacts.map((c) => ({
      user_phone: userPhone,
      name: c.name,
      phone: c.phone,
      relationship: c.relationship,
    }))
  );

  if (error) throw error;
}

// ─── GPS 위치 업데이트 ───

export async function updateUserLocation(
  userPhone: string,
  latitude: number,
  longitude: number
) {
  const { error } = await supabase
    .from("users")
    .update({
      gps_latitude: latitude,
      gps_longitude: longitude,
      gps_updated_at: new Date().toISOString(),
    })
    .eq("user_phone", userPhone);

  if (error) throw error;
}

// ─── SOS 긴급구조 신호 ───

export async function sendSOSSignal(payload: {
  user_phone: string;
  user_name: string;
  travel_country: string;
  gps_latitude: number | null;
  gps_longitude: number | null;
  sos_type: "CALL_ONLY" | "CALL_AND_API";
  device_id: string;
}) {
  const { data, error } = await supabase
    .from("sos_logs")
    .insert({
      ...payload,
      sos_timestamp: new Date().toISOString(),
      status: "RECEIVED",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── 알림톡 발송 요청 ───

export async function requestAlimtalk(
  userPhone: string,
  userName: string,
  travelCountry: string
) {
  // Edge Function 호출 (서버사이드에서 카카오 알림톡 API 실행)
  const { data, error } = await supabase.functions.invoke("send-alimtalk", {
    body: {
      user_phone: userPhone,
      user_name: userName,
      travel_country: travelCountry,
      timestamp: new Date().toISOString(),
    },
  });

  if (error) throw error;
  return data;
}

// ─── 전화번호 중복 확인 ───

export async function checkPhoneDuplicate(
  userPhone: string,
  deviceId: string
): Promise<{ exists: boolean; sameDevice: boolean }> {
  const { data, error } = await supabase
    .from("users")
    .select("device_id")
    .eq("user_phone", userPhone)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return { exists: false, sameDevice: false };
  }

  return {
    exists: true,
    sameDevice: data.device_id === deviceId,
  };
}

// ─── 인증코드 요청 (앱 PUSH 발송) ───

export async function requestVerificationCode(
  userPhone: string
): Promise<void> {
  const { error } = await supabase.functions.invoke("send-verification-code", {
    body: { user_phone: userPhone },
  });
  if (error) throw error;
}

// ─── 인증코드 검증 ───

export async function verifyVerificationCode(
  userPhone: string,
  code: string
): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke("verify-code", {
    body: { user_phone: userPhone, code },
  });
  if (error) throw error;
  return data?.verified === true;
}
