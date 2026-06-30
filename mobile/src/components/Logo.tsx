import { Image, ImageStyle, StyleProp } from 'react-native';

// Logo de MusicYA (assets/logo.png, 1024x1024). Cuadrado, escalable por `size`.
const SOURCE = require('../../assets/logo.png');

export default function Logo({
  size = 96,
  style,
}: {
  size?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={SOURCE}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityLabel="MusicYA"
    />
  );
}
