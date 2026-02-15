import * as SQLite from "expo-sqlite";
import { CONSULATES } from "../constants/consulates";
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
  `);

  const count = await database.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM consulates"
  );

  if (!count || count.cnt === 0) {
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
