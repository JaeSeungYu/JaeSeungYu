-- =============================================
-- 여행 긴급 도우미 - Supabase 초기 스키마
-- Supabase 대시보드 > SQL Editor에서 실행
-- =============================================

-- 1. 사용자 프로필
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_phone TEXT UNIQUE NOT NULL,
  user_name TEXT NOT NULL,
  travel_country TEXT,
  gps_latitude DOUBLE PRECISION,
  gps_longitude DOUBLE PRECISION,
  gps_updated_at TIMESTAMPTZ,
  device_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 비상연락처
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_phone TEXT NOT NULL REFERENCES users(user_phone) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. SOS 이력
CREATE TABLE IF NOT EXISTS sos_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_phone TEXT NOT NULL,
  user_name TEXT,
  travel_country TEXT,
  gps_latitude DOUBLE PRECISION,
  gps_longitude DOUBLE PRECISION,
  sos_type TEXT CHECK (sos_type IN ('CALL_ONLY', 'CALL_AND_API')),
  device_id TEXT,
  sos_timestamp TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'RECEIVED',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 인덱스
-- =============================================
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_phone
  ON emergency_contacts(user_phone);

CREATE INDEX IF NOT EXISTS idx_sos_logs_user_phone
  ON sos_logs(user_phone);

CREATE INDEX IF NOT EXISTS idx_sos_logs_timestamp
  ON sos_logs(sos_timestamp DESC);

-- =============================================
-- Row Level Security (RLS)
-- anon 키로 접근 가능하도록 정책 설정
-- =============================================

-- users 테이블
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "앱에서 사용자 프로필 생성/수정 허용"
  ON users FOR ALL
  USING (true)
  WITH CHECK (true);

-- emergency_contacts 테이블
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "앱에서 비상연락처 관리 허용"
  ON emergency_contacts FOR ALL
  USING (true)
  WITH CHECK (true);

-- sos_logs 테이블
ALTER TABLE sos_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "앱에서 SOS 기록 생성 허용"
  ON sos_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "앱에서 SOS 기록 조회 허용"
  ON sos_logs FOR SELECT
  USING (true);
