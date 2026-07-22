// Encrypted document-image sync.
//
// Images are encrypted ON DEVICE with the account's encKey and uploaded as
// opaque ciphertext (the server can't view your passport scans). On another
// device, the encrypted blob is downloaded, decrypted, and written to the local
// cache so it can be displayed.
import { Platform } from 'react-native';
import { FileSystem, hasFileSystem } from '../../utils/fileSystem';
import { cloud, isCloudEnabled, CloudError } from './api';
import { getSessionSync, loadSession } from './keys';
import { encryptBytes, decryptToBytes, base64ToBytes, bytesToBase64 } from './e2ee';
import { log } from '../../utils/secureLog';

const B64 = FileSystem?.EncodingType?.Base64 ?? 'base64';

function fileIdFor(docId: string): string {
  return `doc-${docId}`;
}

function cachePathFor(docId: string): string {
  return `${FileSystem.cacheDirectory ?? ''}lb-doc-${docId}.img`;
}

/** Encrypt a local image and upload it. Safe no-op when offline / web / no cloud. */
export async function uploadDocumentImage(docId: string, uri: string): Promise<void> {
  if (Platform.OS === 'web' || !hasFileSystem || !isCloudEnabled()) return;
  const session = getSessionSync() ?? (await loadSession());
  if (!session) return;
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: B64 });
    const bytes = base64ToBytes(base64);
    const { ciphertext, iv } = encryptBytes(session.encKeyHex, bytes);
    await cloud.putFile(fileIdFor(docId), ciphertext, iv);
    // Mirror into our deterministic cache path so this device displays instantly.
    await FileSystem.writeAsStringAsync(cachePathFor(docId), base64, { encoding: B64 }).catch(() => {});
  } catch {
    log.warn('fileSync: image upload failed', { docId });
  }
}

/**
 * Returns a displayable local URI for a document's image, downloading and
 * decrypting it from the server if it isn't already cached. Returns null if
 * there is no synced image / it can't be fetched.
 */
export async function ensureLocalImage(docId: string): Promise<string | null> {
  if (Platform.OS === 'web' || !hasFileSystem) return null;
  const path = cachePathFor(docId);
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) return path;
  } catch {
    /* fall through to download */
  }
  if (!isCloudEnabled()) return null;
  const session = getSessionSync() ?? (await loadSession());
  if (!session) return null;
  try {
    const { file } = await cloud.getFile(fileIdFor(docId));
    const bytes = decryptToBytes(session.encKeyHex, file.ciphertext, file.iv);
    await FileSystem.writeAsStringAsync(path, bytesToBase64(bytes), { encoding: B64 });
    return path;
  } catch (e) {
    if (!(e instanceof CloudError && e.status === 404)) {
      log.warn('fileSync: image download failed', { docId });
    }
    return null;
  }
}

/** Delete the remote + cached copy of a document image. */
export async function deleteDocumentImage(docId: string): Promise<void> {
  if (hasFileSystem) {
    try {
      await FileSystem.deleteAsync(cachePathFor(docId), { idempotent: true });
    } catch {
      /* ignore */
    }
  }
  if (Platform.OS === 'web' || !isCloudEnabled()) return;
  const session = getSessionSync() ?? (await loadSession());
  if (!session) return;
  try {
    await cloud.deleteFile(fileIdFor(docId));
  } catch {
    log.warn('fileSync: remote image delete failed', { docId });
  }
}
