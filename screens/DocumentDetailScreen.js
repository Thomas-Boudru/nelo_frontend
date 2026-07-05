import { View, Text, StyleSheet } from "react-native";

export default function DocumentDetailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>numi</Text>
      <Text style={styles.title}>Vos documents</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCFAFF",
    padding: 24,
    paddingTop: 70,
  },
  logo: {
    fontFamily: "Outfit-Bold",
    fontSize: 32,
    color: "#1F1B2D",
  },
  title: {
    marginTop: 40,
    fontFamily: "Outfit-SemiBold",
    fontSize: 28,
    color: "#1F1B2D",
  },
});
