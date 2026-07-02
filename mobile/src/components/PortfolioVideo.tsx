// Reproductor de un video del portafolio.
// expo-video (SDK 56): useVideoPlayer es un HOOK, por eso no puede llamarse dentro
// de un .map(); se aísla en este componente y se renderiza uno por cada video.
// Docs: https://docs.expo.dev/versions/v56.0.0/sdk/video/
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors, fonts, radius, spacing, type } from '../theme';

type Props = {
  url: string;
  title?: string | null;
  style?: ViewStyle;
};

export default function PortfolioVideo({ url, title, style }: Props) {
  // No reproducir automáticamente: el usuario decide con los controles nativos.
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });

  return (
    <View style={[styles.card, style]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls
      />
      {title ? <Text style={styles.title}>{title}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  video: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
  },
  title: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: type.small,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
