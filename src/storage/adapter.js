import { idb, idbSupported } from './idb.js'

/**
 * Progress adapters are the single seam between the app and where progress lives.
 * Today everything is on-device; a backend can be added later without touching
 * the UI by writing an adapter with the same three methods.
 *
 * @typedef {Object} LessonRecord
 * @property {string}  id          `lesson:<lessonId>` — the storage key
 * @property {string}  lessonId
 * @property {number}  attempts    how many times the lesson has been finished
 * @property {number}  bestScore   best correct-answer count
 * @property {number}  lastScore   most recent correct-answer count
 * @property {number}  total       questions in the lesson at the time of the attempt
 * @property {number}  completedAt epoch ms of the first completion
 * @property {number}  updatedAt   epoch ms of the last write — the merge key for sync
 * @property {boolean} dirty       true until a remote adapter has acknowledged the record
 *
 * @typedef {Object} ProgressAdapter
 * @property {string} name
 * @property {() => Promise<LessonRecord[]>} load
 * @property {(records: LessonRecord[]) => Promise<void>} save
 * @property {() => Promise<void>} clear
 */

/** Fallback when IndexedDB is unavailable (private windows, blocked storage). */
function createMemoryAdapter() {
  let records = []
  return {
    name: 'memory',
    load: async () => records,
    save: async (incoming) => {
      const byId = new Map(records.map((r) => [r.id, r]))
      incoming.forEach((r) => byId.set(r.id, r))
      records = [...byId.values()]
    },
    clear: async () => {
      records = []
    },
  }
}

/** @returns {ProgressAdapter} */
export function createLocalAdapter() {
  if (!idbSupported) return createMemoryAdapter()
  const memory = createMemoryAdapter()
  return {
    name: 'indexeddb',
    load: async () => {
      try {
        return await idb.getAll()
      } catch {
        return memory.load()
      }
    },
    save: async (records) => {
      try {
        await idb.putMany(records)
      } catch {
        await memory.save(records)
      }
    },
    clear: async () => {
      try {
        await idb.clear()
      } catch {
        await memory.clear()
      }
    },
  }
}

/**
 * Records still awaiting a push to a remote adapter. Nothing consumes this yet —
 * it is the hook a future sync loop drains after a successful upload.
 * @param {LessonRecord[]} records
 */
export function pendingSync(records) {
  return records.filter((record) => record.dirty)
}

/**
 * Creates a progress export payload suitable for backup and cross-device restore.
 * @param {Record<string, LessonRecord>} records
 */
export function exportProgressPayload(records) {
  return {
    version: 1,
    app: 'mpt-ai',
    exportedAt: Date.now(),
    recordCount: Object.keys(records).length,
    records: Object.values(records),
  }
}

/**
 * Parses and validates an imported progress payload.
 * Merges with existing records by preserving highest score and most recent timestamp.
 * @param {string|object} input
 * @param {Record<string, LessonRecord>} existingRecords
 * @returns {LessonRecord[]} merged records array
 */
export function parseAndMergeProgress(input, existingRecords = {}) {
  const data = typeof input === 'string' ? JSON.parse(input) : input
  if (!data || !Array.isArray(data.records)) {
    throw new Error('Invalid progress file: expected a records array.')
  }

  const merged = { ...existingRecords }
  for (const incoming of data.records) {
    if (!incoming.lessonId) continue
    const curr = merged[incoming.lessonId]
    if (!curr) {
      merged[incoming.lessonId] = { ...incoming, dirty: true }
    } else {
      merged[incoming.lessonId] = {
        ...curr,
        attempts: Math.max(curr.attempts ?? 1, incoming.attempts ?? 1),
        bestScore: Math.max(curr.bestScore ?? 0, incoming.bestScore ?? 0),
        lastScore: incoming.updatedAt > (curr.updatedAt ?? 0) ? incoming.lastScore : curr.lastScore,
        total: incoming.total ?? curr.total,
        completedAt: Math.min(curr.completedAt ?? Date.now(), incoming.completedAt ?? Date.now()),
        updatedAt: Math.max(curr.updatedAt ?? 0, incoming.updatedAt ?? 0),
        dirty: true,
      }
    }
  }
  return Object.values(merged)
}

/**
 * Remote sync queue abstraction designed for Firebase / Supabase / REST backends.
 * Consumes pendingSync() to drain dirty records.
 */
export function createSyncQueue({ onPush, onPull } = {}) {
  let isSyncing = false
  let lastSyncedAt = null
  let lastError = null

  return {
    getStatus: () => ({ isSyncing, lastSyncedAt, lastError }),
    /**
     * Drains dirty records through onPush and optionally pulls remote updates.
     * @param {LessonRecord[]} records
     * @param {(updated: LessonRecord[]) => Promise<void>} persistLocally
     */
    async sync(records, persistLocally) {
      if (isSyncing) return { status: 'in-progress' }
      const dirty = pendingSync(records)
      if (!onPush && !onPull) {
        return { status: 'no-remote', dirtyCount: dirty.length }
      }

      isSyncing = true
      lastError = null
      try {
        let updatedRecords = [...records]
        if (onPush && dirty.length > 0) {
          const ackedIds = await onPush(dirty)
          if (Array.isArray(ackedIds)) {
            const ackSet = new Set(ackedIds)
            updatedRecords = updatedRecords.map((r) =>
              ackSet.has(r.id) ? { ...r, dirty: false } : r,
            )
          }
        }
        if (onPull) {
          const pulled = await onPull(lastSyncedAt)
          if (Array.isArray(pulled)) {
            const byId = new Map(updatedRecords.map((r) => [r.id, r]))
            pulled.forEach((r) => byId.set(r.id, r))
            updatedRecords = [...byId.values()]
          }
        }
        if (persistLocally) {
          await persistLocally(updatedRecords)
        }
        lastSyncedAt = Date.now()
        return { status: 'ok', syncedCount: dirty.length }
      } catch (err) {
        lastError = err.message
        return { status: 'error', error: err.message }
      } finally {
        isSyncing = false
      }
    },
  }
}
