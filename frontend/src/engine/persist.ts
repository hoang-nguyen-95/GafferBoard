// Lưu dữ liệu vào IndexedDB của trình duyệt: dữ liệu game (thay mới mỗi lần nhập) và dữ liệu cá nhân (giữ lại) tách riêng.
import { emptyGameData, emptyUserData, type Store } from "./store";

const DB_NAME = "counterpick-fc";
const KV = "kv";
const SCHEMA = 1;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(KV);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function get<T>(key: string): Promise<T | undefined> {
  const db = await open();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const req = db.transaction(KV, "readonly").objectStore(KV).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

async function put(key: string, value: unknown): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(KV, "readwrite");
      tx.objectStore(KV).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** Nạp dữ liệu đã lưu vào store. Không có IndexedDB hoặc dữ liệu hỏng/khác phiên bản thì để store trống. */
export async function loadStore(store: Store): Promise<void> {
  try {
    const [game, user] = await Promise.all([
      get<{ v: number; data: Store["data"] }>("game"),
      get<{ v: number; user: Store["user"] }>("user"),
    ]);
    if (game?.v === SCHEMA) store.data = { ...emptyGameData(), ...game.data };
    if (user?.v === SCHEMA) store.user = { ...emptyUserData(), ...user.user };
  } catch {
    store.data = emptyGameData();
    store.user = emptyUserData();
  }
  store.reindex();
}

export const saveGame = (store: Store) => put("game", { v: SCHEMA, data: store.data });
export const saveUser = (store: Store) => put("user", { v: SCHEMA, user: store.user });

export async function clearSaved(): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(KV, "readwrite");
      tx.objectStore(KV).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
