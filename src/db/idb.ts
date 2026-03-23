import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

interface SettingsDB extends DBSchema {
  settings: {
    key: string
    value: { key: string; value: unknown }
  }
}

let dbPromise: Promise<IDBPDatabase<SettingsDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<SettingsDB>('passinho-settings-v1', 1, {
      upgrade(db) {
        db.createObjectStore('settings', { keyPath: 'key' })
      },
    })
  }
  return dbPromise
}

export async function dbGetSetting<T>(key: string): Promise<T | undefined> {
  const db = await getDB()
  const row = await db.get('settings', key)
  return row?.value as T | undefined
}

export async function dbSetSetting(key: string, value: unknown): Promise<void> {
  const db = await getDB()
  await db.put('settings', { key, value })
}

export { type ExchangeRateCache } from '../types'

export async function dbGetRateCache() {
  return dbGetSetting<import('../types').ExchangeRateCache>('exchangeRateCache')
}

export async function dbSetRateCache(cache: import('../types').ExchangeRateCache): Promise<void> {
  return dbSetSetting('exchangeRateCache', cache)
}
