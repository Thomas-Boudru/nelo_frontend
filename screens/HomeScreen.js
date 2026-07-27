import { View, Text, Image, StyleSheet } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/icons/splash.png")}
        style={styles.logo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EDF6FF",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  logo: {
    width: 350,
    height: 300,
    marginBottom: 24,
  },

  title: {
    fontFamily: "Lora_700Bold",
    fontSize: 42,
    color: "#243B6B",
    letterSpacing: -0.8,
  },
});
