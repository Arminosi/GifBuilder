
import { HistorySnapshot, FrameData } from '../types';

const DB_NAME = 'GifBuilderDB';
const STORE_NAME = 'snapshots';
const DB_VERSION = 1;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveSnapshotToDB = async (snapshot: HistorySnapshot, thumbnailBlob?: Blob): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Prepare data for storage
    // We strip previewUrls as they are session-specific and can be recreated from the File
    // We store the thumbnail BLOB, not the URL string
    const framesToStore = snapshot.frames.map(f => ({
      id: f.id,
      file: f.file, // File objects are clonable and persisted in IDB
      duration: f.duration,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      originalWidth: f.originalWidth,
      originalHeight: f.originalHeight,
    }));

    const record = {
      id: snapshot.id,
      timestamp: snapshot.timestamp,
      name: snapshot.name,
      canvasConfig: snapshot.canvasConfig,
      frames: framesToStore,
      thumbnailBlob: thumbnailBlob || null // Store the blob data
    };

    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getSnapshotsFromDB = async (): Promise<HistorySnapshot[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const records = request.result;
      // Convert stored records back to app HistorySnapshot types
      const snapshots: HistorySnapshot[] = records.map((record: any) => {
        // Recreate preview URLs from stored Files
        const frames: FrameData[] = record.frames.map((f: any) => ({
           ...f,
           previewUrl: URL.createObjectURL(f.file)
        }));

        let thumbnail: string | undefined = undefined;
        if (record.thumbnailBlob) {
          thumbnail = URL.createObjectURL(record.thumbnailBlob);
        }

        return {
          id: record.id,
          timestamp: record.timestamp,
          name: record.name,
          canvasConfig: record.canvasConfig,
          frames,
          thumbnail
        };
      });
      
      // Sort by timestamp desc (newest first)
      snapshots.sort((a, b) => b.timestamp - a.timestamp);
      
      resolve(snapshots);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteSnapshotFromDB = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const clearSnapshotsFromDB = async (): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
