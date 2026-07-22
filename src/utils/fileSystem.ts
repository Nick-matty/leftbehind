// Resolves the classic expo-file-system API across SDK versions.
//
// In Expo SDK 54 the classic functions (readAsStringAsync, writeAsStringAsync,
// getInfoAsync, deleteAsync, cacheDirectory, EncodingType) live under
// 'expo-file-system/legacy'. Older SDKs expose them from the main entry. Try
// legacy first, then fall back, so document-image sync works either way.
let resolved: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  resolved = require('expo-file-system/legacy');
} catch {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    resolved = require('expo-file-system');
  } catch {
    resolved = null;
  }
}

export const FileSystem: any = resolved;
export const hasFileSystem = !!resolved && typeof resolved.readAsStringAsync === 'function';
