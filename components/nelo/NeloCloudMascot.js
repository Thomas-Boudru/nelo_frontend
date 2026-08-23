import { Image, StyleSheet } from "react-native";

const neloCloudSource = require("../../assets/icons/nelo/neloCloud.png");

export default function NeloCloudMascot({ size = 42, style }) {
  return (
    <Image
      source={neloCloudSource}
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.image,
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    flexShrink: 0,
  },
});
