import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { onboardingColors } from "../../theme";
const colors = onboardingColors;
export default function BackButton({ onPress, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Retour"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        style,
      ]}
    >
      <Ionicons name="chevron-back" size={25} color={colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderRadius: 15,
    shadowColor: "#092B56",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 6,

    elevation: 2,
  },

  buttonPressed: {
    opacity: 0.55,
  },
});
