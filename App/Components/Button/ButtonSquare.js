import { StyleSheet, TouchableOpacity } from 'react-native';

export default function ButtonSquare({ logo, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.buttonContainer}>
      {logo}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    width: '30',
    height: '30',
    backgroundColor: '#4D870E',
    alignItems: 'center',
    justifyContent: 'center',
    // margin: 10,
    borderRadius: 10,
  },
});
