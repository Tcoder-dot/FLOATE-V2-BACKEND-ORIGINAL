import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import path from 'path';
import fs from 'fs';

const defaultConfig = {
  projectId: "gen-lang-client-0100438151",
  appId: "1:328819263704:web:a51c1a314660eb577a6fad",
  apiKey: "AIzaSyB2_TEAHF-hSkKyrQva8HTI0F95OnIji6M",
  authDomain: "gen-lang-client-0100438151.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-10224e22-6d13-470a-8a28-6cc942bc5d67",
  storageBucket: "gen-lang-client-0100438151.firebasestorage.app",
  messagingSenderId: "328819263704",
};

let firebaseConfig: any = { ...defaultConfig };
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const fileData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    firebaseConfig = { ...defaultConfig, ...fileData };
  }
} catch (e) {
  console.warn('[StorageInit] Using default firebase config:', e);
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const storage = getStorage(app, firebaseConfig.storageBucket ? `gs://${firebaseConfig.storageBucket}` : undefined);

/**
 * Downloads a media file (photo or video) from Telegram and uploads it to Firebase Storage.
 * Returns public download URL.
 */
export async function uploadTelegramMediaToStorage(
  botToken: string,
  filePath: string,
  destinationPath: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  try {
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download Telegram media: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const storageRef = ref(storage, destinationPath);
    await uploadBytes(storageRef, buffer, {
      contentType: mimeType,
      customMetadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (err: any) {
    console.warn(`[Firebase Storage Upload Notice] Storage upload fallback for ${destinationPath}:`, err?.message || err);
    // Fallback: return a data or telegram file path reference if storage bucket is in cold-start
    return `https://api.telegram.org/file/bot${botToken}/${filePath}`;
  }
}

/**
 * Direct buffer upload to Firebase Storage
 */
export async function uploadBufferToStorage(
  buffer: Buffer | Uint8Array,
  destinationPath: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  try {
    const storageRef = ref(storage, destinationPath);
    await uploadBytes(storageRef, buffer, {
      contentType: mimeType,
      customMetadata: {
        uploadedAt: new Date().toISOString(),
      },
    });
    return await getDownloadURL(storageRef);
  } catch (err: any) {
    console.warn(`[Buffer Storage Upload Notice]`, err?.message || err);
    return '';
  }
}
