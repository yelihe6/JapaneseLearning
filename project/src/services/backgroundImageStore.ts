export type BackgroundImageRecord = {
  key: string;
  blob: Blob;
  updatedAt: string;
};

const DB_NAME = 'kana_notes_db';
const DB_VERSION = 3;
const STORE_NAME = 'app_background';

const BG_OPACITY_KEY = 'app_background_opacity';
const BG_POSITION_KEY = 'app_background_position';
const BG_SCALE_KEY = 'app_background_scale';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('kana_images')) {
        db.createObjectStore('kana_images', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class BackgroundImageStore {
  private readonly recordKey = 'background';

  setOpacity(opacity: number): void {
    const clamped = Math.min(1, Math.max(0, opacity));
    localStorage.setItem(BG_OPACITY_KEY, String(clamped));
  }

  getOpacity(): number {
    const raw = localStorage.getItem(BG_OPACITY_KEY);
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n)) {
      return Math.min(1, Math.max(0, n));
    }
    return 0.25;
  }

  setPosition(x: number, y: number): void {
    const clampedX = Math.min(100, Math.max(0, x));
    const clampedY = Math.min(100, Math.max(0, y));
    localStorage.setItem(BG_POSITION_KEY, JSON.stringify({ x: clampedX, y: clampedY }));
  }

  getPosition(): { x: number; y: number } {
    const raw = localStorage.getItem(BG_POSITION_KEY);
    if (!raw) return { x: 50, y: 50 };
    try {
      const { x, y } = JSON.parse(raw) as { x?: number; y?: number };
      const nx = Number.isFinite(x) ? Math.min(100, Math.max(0, x)) : 50;
      const ny = Number.isFinite(y) ? Math.min(100, Math.max(0, y)) : 50;
      return { x: nx, y: ny };
    } catch {
      return { x: 50, y: 50 };
    }
  }

  setScale(scale: number): void {
    const clamped = Math.min(2, Math.max(0.5, scale));
    localStorage.setItem(BG_SCALE_KEY, String(clamped));
  }

  getScale(): number {
    const raw = localStorage.getItem(BG_SCALE_KEY);
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n)) {
      return Math.min(2, Math.max(0.5, n));
    }
    return 1;
  }

  async setBackground(blob: Blob): Promise<void> {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record: BackgroundImageRecord = {
      key: this.recordKey,
      blob,
      updatedAt: new Date().toISOString(),
    };

    await requestToPromise(store.put(record));

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    db.close();
  }

  async getBackgroundBlob(): Promise<Blob | undefined> {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const rec = await requestToPromise<BackgroundImageRecord | undefined>(store.get(this.recordKey) as IDBRequest<BackgroundImageRecord | undefined>);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    db.close();
    return rec?.blob;
  }

  async clearBackground(): Promise<void> {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await requestToPromise(store.delete(this.recordKey));

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    db.close();
  }
}

export const backgroundImageStore = new BackgroundImageStore();
