import { StyleSheet, TouchableOpacity, View } from 'react-native';

// A small square/circular button for icons. Provides a contrast backdrop so the icon
// remains visible on any background, and ensures a comfortable touch target.
export default function ButtonSquare({
  logo,
  onPress,
  style,
  withBackdrop = true,
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.touchArea, style]} activeOpacity={0.7}>
      {withBackdrop ? <View style={styles.backdrop} /> : null}
      <View style={styles.iconContainer}>{logo}</View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.25)', // subtle contrast capsule
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
