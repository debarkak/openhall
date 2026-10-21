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
      await db.add("offline_queue", payload);
    }
  } catch {
    // Fallback
  }
}

export async function flushOfflineQueue(
  sendFn: (payload: AttemptSubmissionPayload) => Promise<boolean>
): Promise<number> {
  try {
    const db = await getDB();
    if (!db) return 0;
    const tx = db.transaction("offline_queue", "readwrite");
    const all = await tx.store.getAll();
    let sentCount = 0;
    for (const item of all) {
      const success = await sendFn(item);
      if (success) {
        await tx.store.delete(item.id);
        sentCount++;
      } else {
        break; // Stop flushing if still offline
      }
    }
    return sentCount;
  } catch {
    return 0;
  }
}
