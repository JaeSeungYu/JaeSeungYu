/**
 * 마스터 데이터 동기화 서비스
 *
 * 앱 실행 시 서버의 데이터 버전과 로컬 버전을 비교하여
 * 변경된 데이터만 다운로드하여 로컬 SQLite에 반영
 *
 * 동작 흐름:
 * 1. 서버 data_versions 테이블 조회
 * 2. 로컬 local_data_versions와 버전 비교
 * 3. 버전 불일치 시 해당 테이블 전체 다운로드 → 로컬 교체
 * 4. 오프라인이면 기존 로컬 데이터 유지 (서비스 중단 없음)
 */

import {
  getLocalDataVersion,
  setLocalDataVersion,
  replaceAllConsulates,
  replaceAllTravelAdvisories,
} from "../db/database";

import {
  fetchDataVersions,
  fetchMasterConsulates,
  fetchMasterTravelAdvisories,
} from "./supabaseClient";

export interface MasterSyncResult {
  success: boolean;
  updated: string[];
  message: string;
}

/**
 * 마스터 데이터 동기화 (메인)
 *
 * 앱 시작 시 백그라운드로 호출
 * 네트워크 오류 시 조용히 실패 (오프라인 데이터 유지)
 */
export async function syncMasterData(): Promise<MasterSyncResult> {
  try {
    // 1. 서버 데이터 버전 조회
    const remoteVersions = await fetchDataVersions();

    if (!remoteVersions || remoteVersions.length === 0) {
      return {
        success: true,
        updated: [],
        message: "서버 데이터 버전 정보 없음 (초기 상태)",
      };
    }

    const updated: string[] = [];

    // 2. 각 테이블별 버전 비교 및 동기화
    for (const remote of remoteVersions) {
      const localVersion = await getLocalDataVersion(remote.table_name);

      if (remote.version > localVersion) {
        // 버전 불일치 → 데이터 갱신
        await syncTable(remote.table_name);
        await setLocalDataVersion(remote.table_name, remote.version);
        updated.push(remote.table_name);
      }
    }

    if (updated.length > 0) {
      console.log("[MasterSync] 업데이트됨:", updated.join(", "));
    }

    return {
      success: true,
      updated,
      message:
        updated.length > 0
          ? `${updated.length}개 데이터 업데이트 완료`
          : "최신 상태",
    };
  } catch (error) {
    // 네트워크 오류 등 → 기존 로컬 데이터 유지
    console.log("[MasterSync] 동기화 스킵 (오프라인 또는 오류):", error);
    return {
      success: false,
      updated: [],
      message: "오프라인 - 기존 데이터 사용",
    };
  }
}

/**
 * 개별 테이블 데이터 동기화
 */
async function syncTable(tableName: string): Promise<void> {
  switch (tableName) {
    case "master_consulates":
      await syncConsulates();
      break;
    case "master_travel_advisories":
      await syncTravelAdvisories();
      break;
    default:
      console.log("[MasterSync] 알 수 없는 테이블:", tableName);
  }
}

/**
 * 영사관 데이터 동기화
 * 서버에서 전체 다운로드 → 로컬 전체 교체
 */
async function syncConsulates(): Promise<void> {
  const data = await fetchMasterConsulates();
  if (data.length > 0) {
    await replaceAllConsulates(
      data.map((row) => ({
        country_code: row.country_code,
        country_name_ko: row.country_name_ko,
        country_name_en: row.country_name_en,
        name: row.name,
        phone: row.phone,
        address: row.address,
        emergency_phone: row.emergency_phone ?? undefined,
      }))
    );
    console.log(`[MasterSync] 영사관 데이터 갱신: ${data.length}건`);
  }
}

/**
 * 여행 주의사항 동기화
 * 서버에서 전체 다운로드 → 로컬 전체 교체
 */
async function syncTravelAdvisories(): Promise<void> {
  const data = await fetchMasterTravelAdvisories();
  if (data.length > 0) {
    await replaceAllTravelAdvisories(data);
    console.log(`[MasterSync] 여행 주의사항 갱신: ${data.length}건`);
  }
}
