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
