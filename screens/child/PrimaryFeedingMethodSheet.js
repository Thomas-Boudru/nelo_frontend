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
    pink: require("../../assets/illustrations/tracking/foodPreference/bottlePink.png"),
    green: require("../../assets/illustrations/tracking/foodPreference/bottleGreen.png"),
    blue: require("../../assets/illustrations/tracking/foodPreference/bottleBlue.png"),
  },

  breastfeeding: {
    blue: require("../../assets/illustrations/tracking/foodPreference/breathBlue.png"),
    pink: require("../../assets/illustrations/tracking/foodPreference/breathPink.png"),
    green: require("../../assets/illustrations/tracking/foodPreference/breathGreen.png"),
  },

  solids: {
    blue: require("../../assets/illustrations/tracking/foodPreference/mealsBlue.png"),
    pink: require("../../assets/illustrations/tracking/foodPreference/mealsPink.png"),
    green: require("../../assets/illustrations/tracking/foodPreference/mealsGreen.png"),
  },

  pumping: {
    blue: require("../../assets/illustrations/tracking/foodPreference/pumpingBlue.png"),
    pink: require("../../assets/illustrations/tracking/foodPreference/pumpingPink.png"),
    green: require("../../assets/illustrations/tracking/foodPreference/pumpingGreen.png"),
  },
};

const DEFAULT_VISIBLE_FEEDING_METHODS = [
  "breastfeeding",
  "bottle",
  "solids",
  "pumping",
];

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

  return normalizedMethods.length > 0
    ? normalizedMethods
    : DEFAULT_VISIBLE_FEEDING_METHODS;
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

      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected ? (
          <Ionicons name="checkmark" size={16} color={colors.white} />
        ) : null}
      </View>
    </Pressable>
  );
}

const FeedingPreferencesSheet = forwardRef(function FeedingPreferencesSheet(
  {
    selectedMethods = DEFAULT_VISIBLE_FEEDING_METHODS,
    themeMode = "blue",
    onSave,
  },
  ref,
) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [draftMethods, setDraftMethods] = useState(() =>
    normalizeSelectedMethods(selectedMethods),
  );

  const [isSaving, setIsSaving] = useState(false);

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
        pressBehavior={isSaving ? "none" : "close"}
        opacity={0.42}
      />
    ),
    [isSaving],
  );

  const handleToggleMethod = (methodId) => {
    if (isSaving) {
      return;
    }

    setDraftMethods((currentMethods) => {
      const selected = currentMethods.includes(methodId);

      if (selected && currentMethods.length === 1) {
        return currentMethods;
      }

      return selected
        ? currentMethods.filter(
            (currentMethodId) => currentMethodId !== methodId,
          )
        : [...currentMethods, methodId];
    });
  };

  const hasChanges =
    JSON.stringify([...draftMethods].sort()) !==
    JSON.stringify([...selectedMethods].sort());

  const handleSave = async () => {
    if (isSaving || !hasChanges) {
      return;
    }

    setIsSaving(true);

    try {
      const saved = await onSave?.(draftMethods);

      if (saved !== false) {
        ref?.current?.dismiss();
      }
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      enablePanDownToClose={!isSaving}
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
            const disabled =
              isSaving || (selected && draftMethods.length === 1);

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
          <PrimaryButton
            title={t("Save")}
            onPress={handleSave}
            loading={isSaving}
            disabled={!hasChanges || isSaving}
          />
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

    checkbox: {
      width: 25,
      height: 25,

      alignItems: "center",
      justifyContent: "center",

      marginLeft: 12,

      borderWidth: 1.5,
      borderColor: colors.textSecondary,
      borderRadius: 7,
    },

    checkboxSelected: {
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
