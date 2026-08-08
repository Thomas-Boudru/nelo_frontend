import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import PrimaryButton from "../../components/ui/PrimaryButton.js";
import { useThemeColors } from "../../theme/useThemeColors.js";

const FEEDING_IMAGES = {
  bottle: {
    blue: require("../../assets/illustrations/tracking/bottle.png"),
    pink: require("../../assets/illustrations/tracking/bottle.png"),
    green: require("../../assets/illustrations/tracking/bottle.png"),
  },

  breastfeeding: {
    blue: require("../../assets/illustrations/tracking/breath.png"),
    pink: require("../../assets/illustrations/tracking/breath.png"),
    green: require("../../assets/illustrations/tracking/breath.png"),
  },

  solids: {
    blue: require("../../assets/illustrations/tracking/mealsBlue.png"),
    pink: require("../../assets/illustrations/tracking/mealsBlue.png"),
    green: require("../../assets/illustrations/tracking/mealsBlue.png"),
  },

  pumping: {
    blue: require("../../assets/illustrations/tracking/milk.png"),
    pink: require("../../assets/illustrations/tracking/milk.png"),
    green: require("../../assets/illustrations/tracking/milk.png"),
  },
};

const FEEDING_METHODS = [
  {
    id: "breastfeeding",
    titleKey: "Breastfeeding",
    descriptionKey: "Track breastfeeding sessions",
  },
  {
    id: "bottle",
    titleKey: "Bottle",
    descriptionKey: "Track bottles and milk quantities",
  },
  {
    id: "solids",
    titleKey: "Solid foods",
    descriptionKey: "Track meals and new foods",
  },
  {
    id: "pumping",
    titleKey: "Pumping",
    descriptionKey: "Track pumping sessions and quantities",
  },
];

function normalizeSelectedMethods(methods) {
  const validIds = new Set(FEEDING_METHODS.map((method) => method.id));

  const normalizedMethods = Array.isArray(methods)
    ? methods.filter((methodId) => validIds.has(methodId))
    : [];

  return normalizedMethods.length > 0 ? normalizedMethods : ["bottle"];
}

function FeedingMethodRow({
  method,
  image,
  selected,
  disabled,
  onPress,
  colors,
  styles,
  t,
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={t(method.titleKey)}
      accessibilityState={{
        checked: selected,
        disabled,
      }}
      disabled={disabled}
      onPress={() => onPress(method.id)}
      style={({ pressed }) => [
        styles.methodRow,
        selected && styles.methodRowSelected,
        disabled && styles.methodRowDisabled,
        pressed && !disabled && styles.methodRowPressed,
      ]}
    >
      <View style={styles.methodImageContainer}>
        <Image source={image} resizeMode="contain" style={styles.methodImage} />
      </View>

      <View style={styles.methodInformation}>
        <Text style={styles.methodTitle}>{t(method.titleKey)}</Text>

        <Text style={styles.methodDescription}>{t(method.descriptionKey)}</Text>
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

const FeedingPreferencesSheet = forwardRef(function FeedingPreferencesSheet(
  { selectedMethods = ["breastfeeding", "bottle"], themeMode = "blue", onSave },
  ref,
) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const snapPoints = useMemo(() => ["72%"], []);

  const [draftMethods, setDraftMethods] = useState(() =>
    normalizeSelectedMethods(selectedMethods),
  );

  useEffect(() => {
    setDraftMethods(normalizeSelectedMethods(selectedMethods));
  }, [selectedMethods]);

  const resolvedThemeMode = ["blue", "pink", "green"].includes(themeMode)
    ? themeMode
    : "blue";

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

  const handleToggleMethod = (methodId) => {
    setDraftMethods((currentMethods) => {
      const selected = currentMethods.includes(methodId);

      if (selected && currentMethods.length === 1) {
        return currentMethods;
      }

      return selected
        ? currentMethods.filter((currentMethodId) => {
            return currentMethodId !== methodId;
          })
        : [...currentMethods, methodId];
    });
  };

  const handleSave = () => {
    onSave?.(draftMethods);
    ref?.current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("Feeding preferences")}</Text>

          <Text style={styles.description}>
            {t(
              "Choose the feeding methods you want to see when adding a feeding",
            )}
          </Text>
        </View>

        <View style={styles.methodsList}>
          {FEEDING_METHODS.map((method) => {
            const image =
              FEEDING_IMAGES[method.id]?.[resolvedThemeMode] ??
              FEEDING_IMAGES[method.id]?.blue;

            const selected = draftMethods.includes(method.id);
            const disabled = selected && draftMethods.length === 1;

            return (
              <FeedingMethodRow
                key={method.id}
                method={method}
                image={image}
                selected={selected}
                disabled={disabled}
                onPress={handleToggleMethod}
                colors={colors}
                styles={styles}
                t={t}
              />
            );
          })}
        </View>

        <View style={styles.informationCard}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.primary}
          />

          <Text style={styles.informationText}>
            {t("Keep at least one feeding method enabled")}
          </Text>
        </View>

        <View style={styles.saveButtonContainer}>
          <PrimaryButton title={t("Save")} onPress={handleSave} />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default FeedingPreferencesSheet;

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
      paddingBottom: 18,
    },

    header: {
      paddingHorizontal: 2,
      paddingTop: 2,
      paddingBottom: 15,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
      lineHeight: 28,

      color: colors.textPrimary,
    },

    description: {
      maxWidth: 330,
      marginTop: 4,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,

      color: colors.textSecondary,
    },

    methodsList: {
      gap: 8,
    },

    methodRow: {
      minHeight: 70,

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 12,
      paddingVertical: 9,

      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,

      backgroundColor: colors.white,
    },

    methodRowSelected: {
      borderColor: `${colors.primary}55`,

      backgroundColor: colors.selectedBackground,
    },

    methodRowDisabled: {
      opacity: 0.8,
    },

    methodRowPressed: {
      opacity: 0.72,

      transform: [{ scale: 0.985 }],
    },

    methodImageContainer: {
      width: 52,
      height: 52,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 13,

      borderRadius: 18,

      backgroundColor: colors.lightBackground,
    },

    methodImage: {
      width: 44,
      height: 44,
    },

    methodInformation: {
      flex: 1,
      minWidth: 0,
    },

    methodTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 15,
      lineHeight: 21,

      color: colors.textPrimary,
    },

    methodDescription: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,

      color: colors.textSecondary,
    },

    selectionCircle: {
      width: 24,
      height: 24,

      alignItems: "center",
      justifyContent: "center",

      marginLeft: 10,

      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
    },

    selectionCircleSelected: {
      borderColor: colors.primary,

      backgroundColor: colors.primary,
    },

    informationCard: {
      flexDirection: "row",
      alignItems: "flex-start",

      gap: 9,

      marginTop: 14,
      paddingHorizontal: 13,
      paddingVertical: 11,

      borderRadius: 16,

      backgroundColor: colors.selectedBackground,
    },

    informationText: {
      flex: 1,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 15,

      color: colors.textSecondary,
    },

    saveButtonContainer: {
      marginTop: 14,
    },
  });
