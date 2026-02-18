-- =============================================
-- 마스터 데이터 관리 테이블
-- 관리자가 업데이트하면 앱에서 자동으로 반영
-- Supabase 대시보드 > SQL Editor에서 실행
-- =============================================

-- 1. 데이터 버전 관리
CREATE TABLE IF NOT EXISTS data_versions (
  table_name TEXT PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 초기 버전 데이터 삽입
INSERT INTO data_versions (table_name, version) VALUES
  ('master_consulates', 1),
  ('master_travel_advisories', 1)
ON CONFLICT (table_name) DO NOTHING;

-- 2. 마스터 영사관 데이터
CREATE TABLE IF NOT EXISTS master_consulates (
  id SERIAL PRIMARY KEY,
  country_code TEXT NOT NULL,
  country_name_ko TEXT NOT NULL,
  country_name_en TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  emergency_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_master_consulates_country
  ON master_consulates(country_code);

-- 3. 마스터 여행 주의사항 데이터
CREATE TABLE IF NOT EXISTS master_travel_advisories (
  id SERIAL PRIMARY KEY,
  country_code TEXT NOT NULL,
  title TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_master_travel_advisories_country
  ON master_travel_advisories(country_code);

-- =============================================
-- Row Level Security (RLS)
-- 앱에서 읽기 전용 접근 허용
-- =============================================

-- data_versions
ALTER TABLE data_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "앱에서 데이터 버전 조회 허용"
  ON data_versions FOR SELECT
  USING (true);

-- 관리자만 버전 업데이트 가능 (서비스 키 필요)
CREATE POLICY "관리자 데이터 버전 수정 허용"
  ON data_versions FOR ALL
  USING (true)
  WITH CHECK (true);

-- master_consulates
ALTER TABLE master_consulates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "앱에서 영사관 데이터 조회 허용"
  ON master_consulates FOR SELECT
  USING (true);

CREATE POLICY "관리자 영사관 데이터 관리 허용"
  ON master_consulates FOR ALL
  USING (true)
  WITH CHECK (true);

-- master_travel_advisories
ALTER TABLE master_travel_advisories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "앱에서 주의사항 데이터 조회 허용"
  ON master_travel_advisories FOR SELECT
  USING (true);

CREATE POLICY "관리자 주의사항 데이터 관리 허용"
  ON master_travel_advisories FOR ALL
  USING (true)
  WITH CHECK (true);

-- =============================================
-- 초기 영사관 시드 데이터
-- =============================================
INSERT INTO master_consulates (country_code, country_name_ko, country_name_en, name, phone, address, emergency_phone) VALUES
  ('JP', '일본', 'Japan', '주일본 대한민국 대사관', '+81-3-3452-7611', '1-2-5 Minami-Azabu, Minato-ku, Tokyo', '+81-3-3452-7611'),
  ('CN', '중국', 'China', '주중 대한민국 대사관', '+86-10-8531-0700', '20, Guanghua Lu, Chaoyang District, Beijing', '+86-10-6532-0141'),
  ('TH', '태국', 'Thailand', '주태국 대한민국 대사관', '+66-2-247-7537', '23 Thiam-Ruammit Road, Ratchadapisek, Huay-Kwang, Bangkok', '+66-2-247-7540'),
  ('VN', '베트남', 'Vietnam', '주베트남 대한민국 대사관', '+84-24-3831-5110', 'SQ4, Do Nhuan Street, Xuan Tao Ward, Bac Tu Liem District, Hanoi', '+84-24-3831-5116'),
  ('PH', '필리핀', 'Philippines', '주필리핀 대한민국 대사관', '+63-2-8856-9210', '122 Upper McKinley Road, McKinley Town Center, Fort Bonifacio, Taguig City', '+63-2-8856-9210'),
  ('SG', '싱가포르', 'Singapore', '주싱가포르 대한민국 대사관', '+65-6256-1188', '47 Scotts Road, #08-00 Goldbell Towers, Singapore', '+65-6256-1188'),
  ('MY', '말레이시아', 'Malaysia', '주말레이시아 대한민국 대사관', '+60-3-4251-2336', 'No. 9 & 11, Jalan Nipah, Off Jalan Ampang, Kuala Lumpur', '+60-3-4251-2336'),
  ('ID', '인도네시아', 'Indonesia', '주인도네시아 대한민국 대사관', '+62-21-2967-2555', 'Jl. Jend. Gatot Subroto Kav.57, Jakarta Selatan', '+62-21-2967-2555'),
  ('KH', '캄보디아', 'Cambodia', '주캄보디아 대한민국 대사관', '+855-23-211-900', 'No.50-52, Street 214, Phnom Penh', '+855-23-211-900'),
  ('IN', '인도', 'India', '주인도 대한민국 대사관', '+91-11-4200-7000', '9 Chandragupta Marg, Chanakyapuri, New Delhi', '+91-11-4200-7000'),
  ('TW', '대만', 'Taiwan', '주타이베이 한국대표부', '+886-2-2758-8320', '6F, 333, Keelung Road, Sec. 1, Taipei', '+886-2-2758-8320'),
  ('MN', '몽골', 'Mongolia', '주몽골 대한민국 대사관', '+976-7007-1020', 'Diplomatic Office Street A-10, Ulaanbaatar', '+976-7007-1020'),
  ('US', '미국', 'United States', '주미국 대한민국 대사관', '+1-202-939-5600', '2450 Massachusetts Ave NW, Washington, DC 20008', '+1-202-939-5600'),
  ('CA', '캐나다', 'Canada', '주캐나다 대한민국 대사관', '+1-613-244-5010', '150 Boteler Street, Ottawa, Ontario K1N 5A6', '+1-613-244-5010'),
  ('MX', '멕시코', 'Mexico', '주멕시코 대한민국 대사관', '+52-55-5202-9866', 'Lope de Armendariz 110, Col. Lomas Virreyes, CDMX', '+52-55-5202-9866'),
  ('BR', '브라질', 'Brazil', '주브라질 대한민국 대사관', '+55-61-3321-2500', 'SEN 801 Conjunto A, Lote 14, Asa Norte, Brasília', '+55-61-3321-2500'),
  ('GB', '영국', 'United Kingdom', '주영국 대한민국 대사관', '+44-20-7227-5500', '60 Buckingham Gate, London SW1E 6AJ', '+44-20-7227-5500'),
  ('FR', '프랑스', 'France', '주프랑스 대한민국 대사관', '+33-1-4753-0101', '125, Rue de Grenelle, 75007 Paris', '+33-1-4753-0101'),
  ('DE', '독일', 'Germany', '주독일 대한민국 대사관', '+49-30-260-650', 'Stülerstraße 8-10, 10787 Berlin', '+49-30-260-650'),
  ('IT', '이탈리아', 'Italy', '주이탈리아 대한민국 대사관', '+39-06-802-461', 'Via Barnaba Oriani, 30, 00197 Roma', '+39-06-802-461'),
  ('ES', '스페인', 'Spain', '주스페인 대한민국 대사관', '+34-91-353-2000', 'C/ González Amigó 15, 28033 Madrid', '+34-91-353-2000'),
  ('NL', '네덜란드', 'Netherlands', '주네덜란드 대한민국 대사관', '+31-70-358-6076', 'Verlengde Tolweg 8, 2517 JV The Hague', '+31-70-358-6076'),
  ('CH', '스위스', 'Switzerland', '주스위스 대한민국 대사관', '+41-31-356-2444', 'Kalcheggweg 38, 3006 Bern', '+41-31-356-2444'),
  ('TR', '튀르키예', 'Turkey', '주튀르키예 대한민국 대사관', '+90-312-468-4821', 'Çiğdem Mahallesi, Ahlatlıbel Cad. No:5, Çankaya, Ankara', '+90-312-468-4821'),
  ('AU', '호주', 'Australia', '주호주 대한민국 대사관', '+61-2-6270-4100', '113 Empire Circuit, Yarralumla, ACT 2600', '+61-2-6270-4100'),
  ('NZ', '뉴질랜드', 'New Zealand', '주뉴질랜드 대한민국 대사관', '+64-4-473-9073', '11th Floor, ASB Bank Tower, 2 Hunter Street, Wellington', '+64-4-473-9073'),
  ('AE', '아랍에미리트', 'United Arab Emirates', '주아랍에미리트 대한민국 대사관', '+971-2-692-7500', 'Diplomatic Area, Sector W-59, Abu Dhabi', '+971-2-692-7500'),
  ('ZA', '남아프리카공화국', 'South Africa', '주남아공 대한민국 대사관', '+27-12-460-2508', '265 Melk Street, Nieuw Muckleneuk, Pretoria', '+27-12-460-2508'),
  ('EG', '이집트', 'Egypt', '주이집트 대한민국 대사관', '+20-2-3761-1234', '3 Boulos Hanna Street, Dokki, Giza', '+20-2-3761-1234')
ON CONFLICT DO NOTHING;

-- =============================================
-- 초기 여행 주의사항 시드 데이터
-- =============================================
INSERT INTO master_travel_advisories (country_code, title, items) VALUES
  ('JP', '일본 여행 주의사항', '["지진/쓰나미 발생 빈도가 높으므로 대피 경로를 사전에 확인하세요.","태풍 시즌(6~10월)에는 기상 정보를 수시로 확인하세요.","온천/목욕탕 이용 시 문신이 있으면 입장이 제한될 수 있습니다.","음식점에서 팁 문화가 없으며, 팁을 주면 실례가 될 수 있습니다.","대중교통 내에서는 통화를 자제하고 매너 모드를 유지하세요."]'),
  ('CN', '중국 여행 주의사항', '["VPN 없이는 Google, Facebook 등 해외 서비스 접속이 불가합니다.","위챗페이/알리페이 등 모바일 결제가 주류이므로 사전 준비가 필요합니다.","식수는 반드시 생수를 구입하여 마시세요.","정치적 민감 발언이나 촬영은 삼가세요.","대기오염이 심한 지역에서는 마스크를 착용하세요."]'),
  ('TH', '태국 여행 주의사항', '["왕실에 대한 불경죄가 엄격히 적용되므로 왕실 관련 발언에 주의하세요.","사원 방문 시 노출이 있는 복장은 입장이 제한됩니다.","길거리 음식 섭취 시 위생 상태를 확인하세요.","툭툭/택시 이용 시 미터기 사용을 반드시 요구하세요.","우기(5~10월)에는 갑작스런 폭우와 홍수에 대비하세요."]'),
  ('VN', '베트남 여행 주의사항', '["오토바이 교통량이 매우 많으므로 도로 횡단 시 각별히 주의하세요.","식수는 반드시 생수를 구입하여 마시세요.","소매치기와 날치기가 빈번하므로 귀중품 관리에 주의하세요.","관광지에서 바가지 요금에 주의하고, 미리 가격을 확인하세요.","정부 건물, 군사시설 촬영은 금지되어 있습니다."]'),
  ('PH', '필리핀 여행 주의사항', '["민다나오 지역 등 일부 지역은 여행 자제/철수 권고 지역입니다.","태풍 시즌(6~12월)에는 기상 정보를 수시로 확인하세요.","야간 외출 시 안전에 각별히 주의하세요.","택시 이용 시 반드시 미터기 사용을 확인하세요.","불법 약물에 대한 처벌이 매우 엄격합니다."]'),
  ('SG', '싱가포르 여행 주의사항', '["껌 반입 및 판매가 금지되어 있습니다.","쓰레기 무단 투기, 침 뱉기 등에 높은 벌금이 부과됩니다.","대중교통 내 음식물 섭취가 금지되어 있습니다.","전자담배(베이프) 반입 및 사용이 금지되어 있습니다.","마약 관련 범죄에 대해 사형까지 선고될 수 있습니다."]'),
  ('MY', '말레이시아 여행 주의사항', '["이슬람 문화권이므로 모스크 방문 시 복장에 주의하세요.","동부 사바주 해안 지역은 납치 위험이 있어 주의가 필요합니다.","우기(11~3월) 동안 홍수가 발생할 수 있습니다.","말레이시아 화폐(링깃)의 국외 반출이 제한됩니다.","음주 문화가 제한적이며, 일부 지역에서 음주가 금지됩니다."]'),
  ('ID', '인도네시아 여행 주의사항', '["지진, 화산 활동, 쓰나미 위험이 있으므로 대비하세요.","발리 등 관광지에서 소매치기에 주의하세요.","마약 관련 범죄에 대해 사형까지 선고될 수 있습니다.","이슬람 문화권이므로 종교 시설 방문 시 복장에 주의하세요.","현지 식수는 마시지 말고, 생수를 구입하세요."]'),
  ('KH', '캄보디아 여행 주의사항', '["지뢰 미제거 지역이 있으므로 표시된 도로만 이용하세요.","소매치기, 날치기가 빈번하므로 귀중품 관리에 주의하세요.","우기(5~10월)에 도로 침수 및 교통 마비가 발생할 수 있습니다.","신뢰할 수 없는 ATM 사용을 피하세요.","앙코르와트 등 사원에서 노출이 심한 복장은 제한됩니다."]'),
  ('IN', '인도 여행 주의사항', '["식수와 음식 위생에 각별히 주의하세요 (생수만 마실 것).","여성 혼자 여행 시 야간 외출을 삼가고, 안전한 교통수단을 이용하세요.","카슈미르 지역 등 분쟁 지역 여행은 자제하세요.","소매치기, 사기 관련 범죄가 빈번합니다.","소는 신성한 동물이므로, 소고기 관련 언행에 주의하세요."]'),
  ('TW', '대만 여행 주의사항', '["지진 발생 빈도가 높으므로 대피 요령을 숙지하세요.","태풍 시즌(7~9월)에는 기상 정보를 확인하세요.","오토바이 교통량이 많으므로 도로 횡단 시 주의하세요.","야시장 등에서 현금 결제가 주류이므로 현금을 준비하세요.","실내 흡연이 금지되어 있으며, 위반 시 벌금이 부과됩니다."]'),
  ('MN', '몽골 여행 주의사항', '["겨울철(-30°C 이하) 극심한 추위에 대비하세요.","수도 울란바토르 외 지역은 의료 시설이 부족합니다.","비포장 도로가 많아 이동 시 시간 여유를 두세요.","소매치기에 주의하고, 야간 외출 시 주의하세요.","유목민 게르(거) 방문 시 현지 예절을 존중하세요."]'),
  ('US', '미국 여행 주의사항', '["총기 소지가 합법이므로, 위험 지역을 피하세요.","의료비가 매우 비싸므로 반드시 여행자 보험에 가입하세요.","팁 문화가 있으며, 식당에서 15~20% 팁이 관례입니다.","음주 가능 연령은 21세이며, 신분증 확인이 빈번합니다.","주(State)마다 법률이 다르므로, 방문 지역의 법규를 확인하세요."]'),
  ('CA', '캐나다 여행 주의사항', '["겨울철 극심한 추위(-20°C 이하)와 폭설에 대비하세요.","의료비가 비싸므로 여행자 보험 가입을 권장합니다.","야생동물(곰, 무스 등) 출몰 지역에서 주의하세요.","대마초가 합법이나, 국경 반출은 불법입니다.","프랑스어권(퀘벡) 지역에서는 영어 소통이 제한될 수 있습니다."]'),
  ('MX', '멕시코 여행 주의사항', '["일부 주(치와와, 시날로아 등)는 치안이 매우 불안합니다.","야간 이동은 가능한 피하고, 안전한 교통수단을 이용하세요.","식수는 생수만 마시고, 얼음도 주의하세요.","귀중품은 호텔 금고에 보관하세요.","공인 택시(Sitio)만 이용하세요."]'),
  ('BR', '브라질 여행 주의사항', '["대도시에서 소매치기, 강도 범죄에 각별히 주의하세요.","야간 외출 시 혼자 다니지 마세요.","파벨라(빈민가) 지역 방문은 자제하세요.","황열병 예방접종이 필요할 수 있습니다.","고가의 장신구, 카메라 등을 드러내지 마세요."]'),
  ('GB', '영국 여행 주의사항', '["소매치기에 주의하세요 (특히 런던 지하철, 관광지).","좌측통행이므로 도로 횡단 시 방향에 주의하세요.","날씨 변화가 심하므로 우산/겉옷을 항상 준비하세요.","의료비는 NHS를 통해 응급 처치는 무료이나, 일반 진료는 유료입니다.","플러그 규격이 다르므로 어댑터를 준비하세요 (Type G)."]'),
  ('FR', '프랑스 여행 주의사항', '["파리 등 대도시에서 소매치기가 빈번합니다 (특히 지하철, 관광지).","테러 위험에 대비하여 대규모 행사장에서 주의하세요.","파업이 빈번하여 대중교통 운행이 중단될 수 있습니다.","일요일에는 상점 대부분이 문을 닫습니다.","식당에서 서비스료가 포함되어 있어 별도 팁은 필수가 아닙니다."]'),
  ('DE', '독일 여행 주의사항', '["자전거 전용도로를 침범하지 않도록 주의하세요.","일요일에는 대부분의 상점이 문을 닫습니다.","현금 결제를 선호하는 곳이 많으므로 현금을 준비하세요.","쓰레기 분리수거 규정이 엄격합니다.","아우토반에서도 속도 제한 구간이 있으므로 표지판을 확인하세요."]'),
  ('IT', '이탈리아 여행 주의사항', '["소매치기에 각별히 주의하세요 (특히 로마, 나폴리, 밀라노).","관광지 주변 바가지 요금에 주의하세요.","교회/성당 방문 시 어깨와 무릎을 가리는 복장이 필요합니다.","8월에는 많은 상점이 휴가로 문을 닫습니다.","택시는 공인 택시(흰색)만 이용하세요."]'),
  ('ES', '스페인 여행 주의사항', '["바르셀로나, 마드리드 등 대도시에서 소매치기가 빈번합니다.","시에스타 시간(14~17시)에는 상점이 닫는 곳이 있습니다.","식사 시간이 한국보다 늦습니다 (점심 14시, 저녁 21시 이후).","해변에서 소지품 도난에 주의하세요.","무허가 숙소 이용 시 벌금이 부과될 수 있습니다."]'),
  ('NL', '네덜란드 여행 주의사항', '["자전거 전용도로에서 보행 시 사고 위험이 있으니 주의하세요.","대마초는 커피숍에서만 합법이며, 공공장소 흡연은 금지입니다.","소매치기에 주의하세요 (특히 암스테르담 중앙역 주변).","강풍과 비가 잦으므로 방풍 재킷을 준비하세요.","홍등가 지역에서 사진 촬영은 금지되어 있습니다."]'),
  ('CH', '스위스 여행 주의사항', '["물가가 매우 비싸므로 예산을 넉넉히 준비하세요.","등산/하이킹 시 갑작스러운 날씨 변화에 대비하세요.","일요일에는 대부분의 상점이 문을 닫습니다.","쓰레기 처리에 전용 봉투가 필요하며, 규정이 엄격합니다.","유로가 아닌 스위스 프랑(CHF)을 사용합니다."]'),
  ('TR', '튀르키예 여행 주의사항', '["시리아/이라크 국경 지역은 여행 자제 권고 지역입니다.","이슬람 문화권이므로 모스크 방문 시 복장에 주의하세요.","쿠르드 관련 정치적 발언을 삼가세요.","그랜드 바자르 등에서 흥정이 일반적이며, 바가지에 주의하세요.","지진 발생 빈도가 높으므로 대피 요령을 숙지하세요."]'),
  ('AU', '호주 여행 주의사항', '["자외선이 매우 강하므로 선크림, 모자, 선글라스를 착용하세요.","독성이 있는 야생동물(뱀, 거미, 해파리 등)에 주의하세요.","해변에서는 반드시 안전 구역(깃발 사이) 내에서 수영하세요.","산불(Bushfire) 시즌(10~3월)에는 경보를 확인하세요.","검역이 매우 엄격하므로, 음식물/동식물 반입에 주의하세요."]'),
  ('NZ', '뉴질랜드 여행 주의사항', '["지진 발생 빈도가 높으므로 대피 요령을 숙지하세요.","자외선이 매우 강하므로 선크림을 반드시 바르세요.","렌터카 이용 시 좌측통행에 주의하세요.","야외 활동 시 갑작스러운 날씨 변화에 대비하세요.","검역이 엄격하므로 음식물/동식물 반입에 주의하세요."]'),
  ('AE', '아랍에미리트 여행 주의사항', '["이슬람 문화를 존중하고, 공공장소에서 과도한 애정 표현을 삼가세요.","라마단 기간 중 공공장소에서의 음식 섭취가 금지됩니다.","음주는 허가된 장소(호텔, 바)에서만 가능합니다.","여름철(5~9월) 기온이 45°C 이상으로 올라갈 수 있습니다.","사진 촬영 시 현지인(특히 여성)에게 반드시 허락을 구하세요."]'),
  ('ZA', '남아프리카공화국 여행 주의사항', '["치안이 불안한 지역이 많으므로 야간 외출을 자제하세요.","차량 이동 시 문을 항상 잠그고, 귀중품을 보이지 않게 하세요.","정전(Load Shedding)이 빈번하므로 손전등 등을 준비하세요.","야생동물 투어 시 반드시 가이드의 지시를 따르세요.","수돗물 음용이 가능하나, 생수를 권장합니다."]'),
  ('EG', '이집트 여행 주의사항', '["시나이반도 일부 지역은 여행 자제 권고 지역입니다.","관광지에서 호객 행위와 바가지 요금에 주의하세요.","여성은 보수적인 복장을 권장합니다.","식수는 반드시 생수를 구입하여 마시세요.","유적지에서 무단으로 유물을 만지거나 가져가면 법적 처벌을 받습니다."]')
ON CONFLICT DO NOTHING;

-- =============================================
-- 관리자 업데이트 시 버전 자동 증가 트리거
-- master_consulates / master_travel_advisories에 변경이 있으면
-- data_versions의 해당 테이블 version +1
-- =============================================

-- 영사관 데이터 변경 시 버전 자동 증가
CREATE OR REPLACE FUNCTION bump_consulates_version()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE data_versions
  SET version = version + 1, updated_at = now()
  WHERE table_name = 'master_consulates';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bump_consulates_version
  AFTER INSERT OR UPDATE OR DELETE ON master_consulates
  FOR EACH STATEMENT
  EXECUTE FUNCTION bump_consulates_version();

-- 주의사항 데이터 변경 시 버전 자동 증가
CREATE OR REPLACE FUNCTION bump_advisories_version()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE data_versions
  SET version = version + 1, updated_at = now()
  WHERE table_name = 'master_travel_advisories';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bump_advisories_version
  AFTER INSERT OR UPDATE OR DELETE ON master_travel_advisories
  FOR EACH STATEMENT
  EXECUTE FUNCTION bump_advisories_version();
