import * as SQLite from "expo-sqlite";
import { CONSULATES } from "../constants/consulates";
import { TRAVEL_ADVISORIES } from "../constants/travelAdvisories";
import { Consulate, EmergencyContact } from "../types";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("travel_emergency.db");
  await initDatabase(db);
  return db;
}

async function initDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS consulates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country_code TEXT NOT NULL,
      country_name_ko TEXT NOT NULL,
      country_name_en TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      emergency_phone TEXT
    );

    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      relationship TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS travel_advisories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country_code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      items TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS local_data_versions (
      table_name TEXT PRIMARY KEY,
      version INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 영사관 초기 데이터 시드
  const consulateCount = await database.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM consulates"
  );

  if (!consulateCount || consulateCount.cnt === 0) {
    for (const c of CONSULATES) {
      await database.runAsync(
        `INSERT INTO consulates (country_code, country_name_ko, country_name_en, name, phone, address, emergency_phone)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        c.country_code,
        c.country_name_ko,
        c.country_name_en,
        c.name,
        c.phone,
        c.address,
        c.emergency_phone ?? null
      );
    }
  }

  // 여행 주의사항 초기 데이터 시드
  const advisoryCount = await database.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM travel_advisories"
  );

  if (!advisoryCount || advisoryCount.cnt === 0) {
    for (const [code, data] of Object.entries(TRAVEL_ADVISORIES)) {
      await database.runAsync(
        `INSERT INTO travel_advisories (country_code, title, items) VALUES (?, ?, ?)`,
        code,
        data.title,
        JSON.stringify(data.items)
      );
    }
  }

  // 로컬 데이터 버전 초기화
  const versionCount = await database.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM local_data_versions"
  );

  if (!versionCount || versionCount.cnt === 0) {
    await database.runAsync(
      `INSERT INTO local_data_versions (table_name, version) VALUES ('master_consulates', 0), ('master_travel_advisories', 0)`
    );
  }
}

export async function getConsulatesByCountry(countryCode: string): Promise<Consulate[]> {
  const database = await getDatabase();
  return database.getAllAsync<Consulate>(
    "SELECT * FROM consulates WHERE country_code = ?",
    countryCode
  );
}

export async function getAllCountries(): Promise<{ country_code: string; country_name_ko: string; country_name_en: string }[]> {
  const database = await getDatabase();
  return database.getAllAsync(
    "SELECT DISTINCT country_code, country_name_ko, country_name_en FROM consulates ORDER BY country_name_ko"
  );
}

export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  const database = await getDatabase();
  return database.getAllAsync<EmergencyContact>(
    "SELECT * FROM emergency_contacts ORDER BY created_at DESC"
  );
}

export async function addEmergencyContact(
  name: string,
  phone: string,
  relationship: string
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    "INSERT INTO emergency_contacts (name, phone, relationship) VALUES (?, ?, ?)",
    name,
    phone,
    relationship
  );
}

export async function deleteEmergencyContact(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync("DELETE FROM emergency_contacts WHERE id = ?", id);
}

export async function getSetting(key: string): Promise<string | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    key
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    key,
    value
  );
}

// ─── 여행 주의사항 (로컬 DB) ───

export async function getTravelAdvisory(
  countryCode: string
): Promise<{ title: string; items: string[] } | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ title: string; items: string }>(
    "SELECT title, items FROM travel_advisories WHERE country_code = ?",
    countryCode
  );
  if (!row) return null;
  return { title: row.title, items: JSON.parse(row.items) };
}

// ─── 로컬 데이터 버전 관리 ───

export async function getLocalDataVersion(
  tableName: string
): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ version: number }>(
    "SELECT version FROM local_data_versions WHERE table_name = ?",
    tableName
  );
  return row?.version ?? 0;
}

export async function setLocalDataVersion(
  tableName: string,
  version: number
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    "INSERT OR REPLACE INTO local_data_versions (table_name, version, updated_at) VALUES (?, ?, datetime('now'))",
    tableName,
    version
  );
}

// ─── 마스터 데이터 일괄 갱신 ───

export async function replaceAllConsulates(
  data: Omit<Consulate, "id">[]
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync("DELETE FROM consulates");
  for (const c of data) {
    await database.runAsync(
      `INSERT INTO consulates (country_code, country_name_ko, country_name_en, name, phone, address, emergency_phone)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      c.country_code,
      c.country_name_ko,
      c.country_name_en,
      c.name,
      c.phone,
      c.address,
      c.emergency_phone ?? null
    );
  }
}

export async function replaceAllTravelAdvisories(
  data: { country_code: string; title: string; items: string[] }[]
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync("DELETE FROM travel_advisories");
  for (const d of data) {
    await database.runAsync(
      `INSERT INTO travel_advisories (country_code, title, items) VALUES (?, ?, ?)`,
      d.country_code,
      d.title,
      JSON.stringify(d.items)
    );
  }
}
