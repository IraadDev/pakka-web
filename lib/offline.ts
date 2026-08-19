/**
 * Offline capture queue (NFR-3, TDR §B7).
 *
 * Rental counters and roadside handovers have bad signal. Photos MUST survive
 * a dead connection, because a missing condition record is the one failure this
 * product cannot have.
 *
 * Three rules from the TDR:
 *  1. request persistent storage on first run
 *  2. upload each photo immediately, never batch at the end
 *  3. catch QuotaExceededError and surface it loudly
 */
const DB_NAME = "pakka-offline";
const STORE = "pending-uploads";

export type PendingUpload = {
  id: string;
  dealId?: string;
  listingId?: string;
  angle: string;
  blob: Blob;
  capturedAt: number;
};

export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(item: PendingUpload): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => {
      const err = tx.error;
      if (err?.name === "QuotaExceededError") {
        reject(new Error("Storage full — upload pending photos before capturing more."));
      } else {
        reject(err);
      }
    };
  });
}

export async function pending(): Promise<PendingUpload[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as PendingUpload[]);
    req.onerror = () => reject(req.error);
  });
}

export async function dequeue(id: string): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
