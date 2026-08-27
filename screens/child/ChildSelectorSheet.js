import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "../../theme/useThemeColors.js";

import BabyFaceIcon from "../../assets/icons/header/faceBaby.svg";

const BABY_FALLBACK_IMAGES = {
  blue: require("../../assets/icons/header/babyBlue.png"),
  pink: require("../../assets/icons/header/babyPink.png"),
  green: require("../../assets/icons/header/babyGreen.png"),
};

const BABY_FALLBACK_COLORS = {
  blue: "#4E83F7",
  pink: "#E77FA8",
  green: "#65B59A",
};

function ChildRow({ child, selected, onPress, colors, styles }) {
  const fallbackImage =
    BABY_FALLBACK_IMAGES[child.themeMode] ?? BABY_FALLBACK_IMAGES.blue;

  const fallbackColor =
    BABY_FALLBACK_COLORS[child.themeMode] ?? BABY_FALLBACK_COLORS.blue;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={child.firstName}
      accessibilityState={{ selected }}
      onPress={() => onPress(child)}
      style={({ pressed }) => [
        styles.childRow,
        selected && styles.childRowSelected,
        pressed && styles.childRowPressed,
      ]}
    >
      <View style={styles.avatarContainer}>
        {child.profilePicture ? (
          <Image
            source={child.profilePicture}
            resizeMode="cover"
            style={styles.avatar}
          />
        ) : (
          <BabyFaceIcon width={35} height={35} color={fallbackColor} />
        )}
      </View>

      <View style={styles.childInformation}>
        <Text style={styles.childName} numberOfLines={1}>
          {child.firstName}
        </Text>

        <Text style={styles.childDetails} numberOfLines={1}>
          {child.ageLabel}
        </Text>
      </View>

      <View
        style={[
          styles.selectionCircle,
          selected && styles.selectionCircleSelected,
        ]}
      >
        {selected ? (
          <Ionicons name="checkmark" size={15} color={colors.white} />
        ) : null}
      </View>
    </Pressable>
  );
}

const ChildSelectorSheet = forwardRef(function ChildSelectorSheet(
  { children = [], selectedChildId, onSelectChild, onAddChild },
  forwardedRef,
) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const sheetRef = useRef(null);

  useImperativeHandle(forwardedRef, () => ({
    present: () => {
      sheetRef.current?.present();
    },

    dismiss: () => {
      sheetRef.current?.dismiss();
    },
  }));

  /*
   * La hauteur reste dynamique jusqu’à environ 72 %.
   * Lorsque la liste devient longue, seule la liste défile.
   */
  const snapPoints = useMemo(() => {
    if (children.length <= 1) {
      return ["31%"];
    }

    if (children.length === 2) {
      return ["38%"];
    }

    if (children.length === 3) {
      return ["46%"];
    }

    return ["72%"];
  }, [children.length]);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.42}
      />
    ),
    [],
  );

  const handleSelectChild = (child) => {
    onSelectChild?.(child);
    sheetRef.current?.dismiss();
  };

  const handleAddChild = useCallback(() => {
    sheetRef.current?.dismiss();

    setTimeout(() => {
      onAddChild?.();
    }, 250);
  }, [onAddChild]);

  const renderChild = ({ item }) => (
    <ChildRow
      child={item}
      selected={item.id === selectedChildId}
      onPress={handleSelectChild}
      colors={colors}
      styles={styles}
    />
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("Choose a child")}</Text>
        </View>

        <BottomSheetFlatList
          data={children}
          keyExtractor={(item) => item.id}
          renderItem={renderChild}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Add a child")}
            onPress={handleAddChild}
            style={({ pressed }) => [
              styles.addChildButton,
              pressed && styles.addChildButtonPressed,
            ]}
          >
            <View style={styles.addIconContainer}>
              <Ionicons name="add" size={23} color={colors.primary} />
            </View>

            <Text style={styles.addChildText}>{t("Add a child")}</Text>

            <Ionicons
              name="chevron-forward"
              size={17}
              color={colors.textSecondary}
            />
          </Pressable>
        </View>
      </View>
    </BottomSheetModal>
  );
});

export default ChildSelectorSheet;

const createStyles = (colors) =>
  StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,

      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
    },

    handle: {
      paddingTop: 10,
      paddingBottom: 5,
    },

    handleIndicator: {
      width: 44,
      height: 5,

      borderRadius: 3,

      backgroundColor: colors.textSecondary,

      opacity: 0.25,
    },

    container: {
      flex: 1,

      paddingHorizontal: 18,
      paddingBottom: 25,
    },

    header: {
      minHeight: 48,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",

      paddingHorizontal: 2,
      marginBottom: 4,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
      lineHeight: 28,

      color: colors.textPrimary,
    },

    closeButton: {
      width: 36,
      height: 36,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 18,

      backgroundColor: colors.selectedBackground,
    },

    listContent: {
      paddingBottom: 8,
    },

    childRow: {
      minHeight: 72,

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 12,
      paddingVertical: 9,
      marginBottom: 7,

      borderWidth: 1,
      borderColor: "transparent",
      borderRadius: 20,

      backgroundColor: colors.white,
    },

    childRowSelected: {
      borderColor: colors.border,

      backgroundColor: colors.selectedBackground,
    },

    childRowPressed: {
      opacity: 0.72,

      transform: [{ scale: 0.985 }],
    },

    avatarContainer: {
      width: 50,
      height: 50,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 12,

      borderWidth: 2,
      borderColor: colors.white,
      borderRadius: 25,

      backgroundColor: colors.selectedBackground,

      overflow: "hidden",
    },

    avatar: {
      width: "100%",
      height: "100%",
    },

    avatarFallback: {
      width: 27,
      height: 27,
    },

    childInformation: {
      flex: 1,

      minWidth: 0,
    },

    childName: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      lineHeight: 21,

      color: colors.textPrimary,
    },

    childDetails: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 17,

      color: colors.textSecondary,
    },

    selectionCircle: {
      width: 24,
      height: 24,

      alignItems: "center",
      justifyContent: "center",

      marginLeft: 10,

      borderWidth: 1.5,
      borderColor: colors.textSecondary,
      borderRadius: 12,
    },

    selectionCircleSelected: {
      borderColor: colors.primary,

      backgroundColor: colors.primary,
    },

    footer: {
      paddingTop: 9,

      borderTopColor: colors.border,
    },

    addChildButton: {
      minHeight: 60,

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 10,

      borderRadius: 18,
    },

    addChildButtonPressed: {
      backgroundColor: colors.selectedBackground,
    },

    addIconContainer: {
      width: 42,
      height: 42,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 20,
      marginLeft: 5,

      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.primary,
      borderRadius: 21,

      backgroundColor: colors.selectedBackground,
    },

    addChildText: {
      flex: 1,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 20,

      color: colors.primary,
    },

    pressed: {
      opacity: 0.7,

      transform: [{ scale: 0.96 }],
    },
  });
