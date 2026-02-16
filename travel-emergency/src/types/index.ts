export interface Consulate {
  id: number;
  country_code: string;
  country_name_ko: string;
  country_name_en: string;
  name: string;
  phone: string;
  address: string;
  emergency_phone?: string;
}

export interface EmergencyContact {
  id: number;
  name: string;
  phone: string;
  relationship: string;
  created_at: string;
}

export interface AlimtalkPayload {
  template_code: string;
  recipient_phone: string;
  template_params: {
    sender_name: string;
    country_name: string;
    consulate_name: string;
    timestamp: string;
    timezone: string;
  };
}

/** 서버 동기화용 사용자 프로필 */
export interface UserProfile {
  user_name: string;
  user_phone: string;
  travel_country: string;
  emergency_contacts: EmergencyContact[];
  gps_latitude: number | null;
  gps_longitude: number | null;
  gps_updated_at: string | null;
  device_id: string;
  updated_at: string;
}

/** 서버 동기화 응답 */
export interface CloudSyncResponse {
  success: boolean;
  message: string;
  synced_at: string;
}

/** 긴급구조 SOS 요청 페이로드 */
export interface SOSPayload {
  user_name: string;
  user_phone: string;
  travel_country: string;
  emergency_contacts: { name: string; phone: string; relationship: string }[];
  gps_latitude: number | null;
  gps_longitude: number | null;
  sos_timestamp: string;
  sos_type: "CALL_ONLY" | "CALL_AND_API";
  device_id: string;
}

/** 긴급구조 SOS 응답 */
export interface SOSResponse {
  success: boolean;
  sos_id: string;
  message: string;
}
