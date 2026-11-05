import fs from 'fs';
import path from 'path';
import { uploadBufferToStorage } from './storageService.js';
import { registerSimulatedMedia } from './whatsappService.js';

// In-memory media cache for fast lookups
const mediaMemoryCache = new Map<string, { buffer: Buffer; mimeType: string; timestamp: number }>();

// Directory for local persistent media
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'catalog');

// Ensure directory exists
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[MediaStorage] Failed to create uploads directory:', e);
}

/**
 * Saves an uploaded product catalog image cleanly to storage without bloating Firestore.
 * - Stores actual binary to disk and/or Firebase Cloud Storage.
 * - Returns a clean, lightweight URL path `/api/media/:mediaId` suitable for storing in Firestore (< 50 bytes).
 */
export async function saveCatalogMedia(
  buffer: Buffer,
  mimeType: string = 'image/jpeg',
  customId?: string
): Promise<{ mediaId: string; publicUrl: string; localPath: string }> {
  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
  const cleanId = customId || `prod_img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const localPath = path.join(UPLOADS_DIR, cleanId);

  // 1. In-memory cache
  mediaMemoryCache.set(cleanId, { buffer, mimeType, timestamp: Date.now() });

  // 2. Register with simulated media cache for bot simulator / tester
  registerSimulatedMedia(cleanId, buffer, mimeType);

  // 3. Write to local file disk asynchronously
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    fs.writeFileSync(localPath, buffer);
  } catch (err) {
    console.warn(`[MediaStorage] Could not write ${cleanId} to disk:`, err);
  }

  // 4. Background cloud storage sync if storage bucket available
  uploadBufferToStorage(buffer, `catalog/${cleanId}`, mimeType)
    .then((cloudUrl) => {
      if (cloudUrl) {
        console.log(`[MediaStorage] Synced ${cleanId} to Firebase Storage: ${cloudUrl}`);
      }
    })
    .catch((err) => {
      // Non-blocking notice
    });

  const publicUrl = `/api/media/${cleanId}`;
  return {
    mediaId: cleanId,
    publicUrl,
    localPath,
  };
}

/**
 * Retrieves catalog media by ID
 */
export async function getCatalogMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const cleanId = path.basename(mediaId); // Prevent path traversal

  // 1. Check in-memory cache
  if (mediaMemoryCache.has(cleanId)) {
    const cached = mediaMemoryCache.get(cleanId)!;
    return { buffer: cached.buffer, mimeType: cached.mimeType };
  }

  // 2. Check local disk
  const localPath = path.join(UPLOADS_DIR, cleanId);
  try {
    if (fs.existsSync(localPath)) {
      const buffer = fs.readFileSync(localPath);
      const mimeType = cleanId.endsWith('.png') ? 'image/png' : cleanId.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      mediaMemoryCache.set(cleanId, { buffer, mimeType, timestamp: Date.now() });
      return { buffer, mimeType };
    }
  } catch (err) {
    console.warn(`[MediaStorage] Error reading ${cleanId} from disk:`, err);
  }

  return null;
}
