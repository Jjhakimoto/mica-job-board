import { openDB } from 'idb'
import { normalize } from './defaults'
import type { AppState } from './types'

const DB_NAME = 'life-dashboard'
const STORE = 'kv'
const LOCAL = 'life-dashboard'

function localKey(key: 'state' | 'demo') {
  return `${LOCAL}:${key}`
}

/** Synchronous copy so a reload cannot lose the last tap. */
export function readLocal(key: 'state' | 'demo'): AppState | null {
  try {
    const raw = localStorage.getItem(localKey(key))
    if (!raw) return null
    return normalize(JSON.parse(raw))
  } catch {
    return null
  }
}

export function writeLocal(key: 'state' | 'demo', state: AppState) {
  localStorage.setItem(localKey(key), JSON.stringify(state))
}

async function db() {
  return openDB(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE)
    },
  })
}

export async function loadSlot(key: 'state' | 'demo'): Promise<AppState | null> {
  const local = readLocal(key)
  if (local) return local
  try {
    const database = await db()
    const raw = await database.get(STORE, key)
    if (!raw) return null
    return normalize(raw)
  } catch {
    return null
  }
}

export async function saveSlot(key: 'state' | 'demo', state: AppState): Promise<void> {
  const database = await db()
  await database.put(STORE, state, key)
}

const pending = new Map<'state' | 'demo', AppState>()
const timers = new Map<'state' | 'demo', number>()

export function queueSave(key: 'state' | 'demo', state: AppState) {
  writeLocal(key, state)
  pending.set(key, state)
  const prev = timers.get(key)
  if (prev) window.clearTimeout(prev)
  timers.set(
    key,
    window.setTimeout(() => {
      pending.delete(key)
      timers.delete(key)
      void saveSlot(key, state)
    }, 120),
  )
}

export function flushSaves() {
  for (const [key, state] of pending) {
    const timer = timers.get(key)
    if (timer) window.clearTimeout(timer)
    void saveSlot(key, state)
  }
  pending.clear()
  timers.clear()
}
