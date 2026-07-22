import { useEffect, useState } from 'react';
import { Image, View, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { FileSystem, hasFileSystem } from '../utils/fileSystem';
import { ensureLocalImage } from '../features/cloud/fileSync';
import { Colors, Radius } from '../utils/theme';

/**
 * Shows a document thumbnail. Uses the local image if present; otherwise pulls
 * and decrypts the synced copy from the server (for images added on another
 * device). Falls back to a folder icon when there is no image.
 */
export function VaultDocImage({
  docId,
  imageUri,
  size = 44,
}: {
  docId: string;
  imageUri?: string;
  size?: number;
}) {
  const [resolved, setResolved] = useState<string | null>(imageUri ?? null);

  useEffect(() => {
    let active = true;
    (async () => {
      // If we have a local uri, verify it still exists (it won't on a new device).
      if (imageUri && Platform.OS !== 'web' && hasFileSystem) {
        try {
          const info = await FileSystem.getInfoAsync(imageUri);
          if (info.exists) {
            if (active) setResolved(imageUri);
            return;
          }
        } catch {
          /* fall through to remote fetch */
        }
      } else if (imageUri && (Platform.OS === 'web' || !hasFileSystem)) {
        if (active) setResolved(imageUri);
        return;
      }

      // No usable local file — try the encrypted remote copy.
      const remote = await ensureLocalImage(docId);
      if (active) setResolved(remote ?? null);
    })();
    return () => {
      active = false;
    };
  }, [docId, imageUri]);

  if (resolved) {
    return <Image source={{ uri: resolved }} style={[styles.thumb, { width: size, height: size }]} />;
  }
  return (
    <View style={[styles.thumb, styles.placeholder, { width: size, height: size }]}>
      <MaterialIcons name="folder" size={Math.round(size * 0.5)} color={Colors.blue} />
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: { borderRadius: Radius.sm, backgroundColor: 'rgba(120,120,140,0.15)' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
