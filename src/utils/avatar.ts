import { Platform } from 'react-native';
import { FileSystem, hasFileSystem } from './fileSystem';

function avatarPath(userId: string): string | null {
  const root = FileSystem?.documentDirectory;
  if (!root) return null;
  return `${root}lb-avatar-${userId}.jpg`;
}

/** Copy a picker URI into durable app storage when possible. */
export async function persistAvatarUri(userId: string, sourceUri: string): Promise<string> {
  if (Platform.OS === 'web' || !hasFileSystem) return sourceUri;
  const dest = avatarPath(userId);
  if (!dest) return sourceUri;

  try {
    if (typeof FileSystem.copyAsync === 'function') {
      await FileSystem.copyAsync({ from: sourceUri, to: dest });
      return dest;
    }
  } catch {
    /* try download fallback below */
  }

  try {
    if (typeof FileSystem.downloadAsync === 'function') {
      await FileSystem.downloadAsync(sourceUri, dest);
      return dest;
    }
  } catch {
    /* keep picker URI */
  }

  return sourceUri;
}

export async function deletePersistedAvatar(userId: string, uri?: string | null): Promise<void> {
  if (Platform.OS === 'web' || !hasFileSystem) return;
  const path = uri && uri.startsWith('file') ? uri : avatarPath(userId);
  if (!path) return;
  try {
    await FileSystem.deleteAsync(path, { idempotent: true });
  } catch {
    /* ignore */
  }
}
