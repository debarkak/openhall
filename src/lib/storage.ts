import { openDB, IDBPDatabase } from "idb";
import { ItemStatus, AttemptSubmissionPayload } from "./types";

const DB_NAME = "openhall_client_db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("attempts")) {
          const store = db.createObjectStore("attempts", {
            keyPath: ["sessionId", "questionId"],
          });
          store.createIndex("by_session", "sessionId");
        }
        if (!db.objectStoreNames.contains("offline_queue")) {
          db.createObjectStore("offline_queue", {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      },
    });
  }
  return dbPromise;
}

export async function persistAttemptLocally(
  sessionId: string,
  questionId: string,
  optionId: string | null,
  status: ItemStatus
): Promise<void> {
  try {
    const db = await getDB();
    if (db) {
      await db.put("attempts", {
        sessionId,
        questionId,
        optionId,
        status,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch {
    // LocalStorage fallback for private browsing or restricted environments
    try {
      const key = `oh_attempt_${sessionId}_${questionId}`;
      localStorage.setItem(key, JSON.stringify({ optionId, status }));
    } catch {
      // Ignored if storage is completely blocked
    }
  }
}

export async function getLocalAttempts(
  sessionId: string
): Promise<Record<string, { optionId: string | null; status: ItemStatus }>> {
  const result: Record<string, { optionId: string | null; status: ItemStatus }> = {};
  try {
    const db = await getDB();
    if (db) {
      const tx = db.transaction("attempts", "readonly");
      const index = tx.store.index("by_session");
      const records = await index.getAll(sessionId);
      for (const r of records) {
        result[r.questionId] = { optionId: r.optionId, status: r.status };
      }
    }
  } catch {
    // Fallback read from localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`oh_attempt_${sessionId}_`)) {
          const qId = k.replace(`oh_attempt_${sessionId}_`, "");
          const val = JSON.parse(localStorage.getItem(k) || "{}");
          result[qId] = val;
        }
      }
    } catch {
      // Return whatever was collected
    }
  }
  return result;
}

export async function queueOfflineAttempt(
  payload: AttemptSubmissionPayload
): Promise<void> {
  try {
    const db = await getDB();
    if (db) {
      const transaction = db.transaction("offline_queue", "readwrite");
      const queued = await transaction.store.getAll();
      for (const item of queued) {
        if (item.sessionId === payload.sessionId && item.questionId === payload.questionId) {
          await transaction.store.delete(item.id);
        }
      }
      await transaction.store.add(payload);
      await transaction.done;
      return;
    }
  } catch {
    // Fall through to localStorage when IndexedDB is unavailable.
  }

  try {
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index);
      if (!key?.startsWith("oh_queue_")) continue;
      const queued = JSON.parse(localStorage.getItem(key) || "null") as AttemptSubmissionPayload | null;
      if (queued?.sessionId === payload.sessionId && queued.questionId === payload.questionId) {
        localStorage.removeItem(key);
      }
    }
    const key = `oh_queue_${payload.sessionId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // The attempt record remains in the local attempts store when storage is blocked.
  }
}

export async function flushOfflineQueue(
  sendFn: (payload: AttemptSubmissionPayload) => Promise<boolean>,
  sessionId?: string
): Promise<number> {
  let sentCount = 0;
  try {
    const db = await getDB();
    if (db) {
      const all = (await db.getAll("offline_queue")).filter((item) => !sessionId || item.sessionId === sessionId);
      for (const item of all) {
        const success = await sendFn(item);
        if (!success) return sentCount;
        await db.delete("offline_queue", item.id);
        sentCount++;
      }
    }
  } catch {
    // Fall through to localStorage when IndexedDB is unavailable.
  }

  try {
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
      .filter((key): key is string => !!key && key.startsWith("oh_queue_"))
      .sort();
    for (const key of keys) {
      const payload = JSON.parse(localStorage.getItem(key) || "null") as AttemptSubmissionPayload | null;
      if (!payload || (sessionId && payload.sessionId !== sessionId)) continue;
      let success = false;
      try {
        success = await sendFn(payload);
      } catch {
        success = false;
      }
      if (!success) break;
      localStorage.removeItem(key);
      sentCount++;
    }
  } catch {
    return sentCount;
  }
  return sentCount;
}

export async function countOfflineAttempts(sessionId: string): Promise<number> {
  let count = 0;
  try {
    const db = await getDB();
    if (!db) throw new Error("IndexedDB is unavailable");
    const queued = await db.getAll("offline_queue");
    count = queued.filter((item) => item.sessionId === sessionId).length;
  } catch {
    // Continue counting the localStorage fallback queue.
  }

  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith("oh_queue_")) continue;
      const payload = JSON.parse(localStorage.getItem(key) || "null") as AttemptSubmissionPayload | null;
      if (payload?.sessionId === sessionId) count++;
    }
  } catch {
    return count;
  }
  return count;
}

export async function discardOfflineQueue(sessionId: string): Promise<void> {
  try {
    const db = await getDB();
    if (db) {
      const transaction = db.transaction("offline_queue", "readwrite");
      const queued = await transaction.store.getAll();
      for (const item of queued) {
        if (item.sessionId === sessionId) await transaction.store.delete(item.id);
      }
      await transaction.done;
    }
  } catch {
    // The localStorage queue is cleared below when IndexedDB is unavailable.
  }

  try {
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index);
      if (!key?.startsWith("oh_queue_")) continue;
      const queued = JSON.parse(localStorage.getItem(key) || "null") as AttemptSubmissionPayload | null;
      if (queued?.sessionId === sessionId) localStorage.removeItem(key);
    }
  } catch {
    // The scorecard still reports that some answers could not be submitted.
  }
}
