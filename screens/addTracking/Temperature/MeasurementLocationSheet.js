import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "../../../theme/useThemeColors.js";

const MEASUREMENT_LOCATIONS = [
  {
    id: "forehead",
    title: "Forehead",
    icon: "scan-outline",
  },
  {
    id: "armpit",
    title: "Armpit",
    icon: "body-outline",
  },
  {
    id: "rectal",
    title: "Rectal",
    icon: "medical-outline",
  },
  {
    id: "ear",
    title: "Ear",
    icon: "ear-outline",
  },
];

function MeasurementLocationRow({
  location,
  selected,
  onPress,
  colors,
  styles,
  t,
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={t(location.title)}
      accessibilityState={{
        selected,
      }}
      onPress={() => {
        onPress(location.id);
      }}
      style={({ pressed }) => [
        styles.locationRow,
        selected && styles.locationRowSelected,
        pressed && styles.locationRowPressed,
      ]}
    >
      <View
        style={[
          styles.locationIconContainer,
          selected && styles.locationIconContainerSelected,
        ]}
      >
        <Ionicons
          name={location.icon}
          size={24}
          color={selected ? colors.primary : colors.textSecondary}
        />
      </View>

      <Text style={styles.locationTitle}>{t(location.title)}</Text>

      <View
        style={[
          styles.selectionCircle,
          selected && styles.selectionCircleSelected,
        ]}
      >
        {selected && (
          <Ionicons name="checkmark" size={15} color={colors.white} />
        )}
      </View>
    </Pressable>
  );
}

const MeasurementLocationSheet = forwardRef(function MeasurementLocationSheet(
  { selectedLocation = "forehead", onSelect },
  ref,
) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const sheetRef = useRef(null);
  const isPresentedRef = useRef(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  useImperativeHandle(
    ref,
    () => ({
      present: () => {
        isPresentedRef.current = true;
        sheetRef.current?.present();
      },

      dismiss: () => {
        /**
         * Dismissing a modal that was never presented leaves its internal
         * status stuck on "dismissing", which silently prevents the portal
         * from rendering on the next `present()`. Only dismiss when open.
         */
        if (!isPresentedRef.current) {
          return;
        }

        isPresentedRef.current = false;
        sheetRef.current?.dismiss();
      },
    }),
    [],
  );

  const handleDismissed = useCallback(() => {
    isPresentedRef.current = false;
  }, []);

  const renderBackdrop = useCallback(
    (backdropProps) => (
      <BottomSheetBackdrop
        {...backdropProps}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.42}
      />
    ),
    [],
  );

  const handleSelect = useCallback(
    (locationId) => {
      onSelect?.(locationId);

      Haptics.selectionAsync().catch(() => {});

      sheetRef.current?.dismiss();
    },
    [onSelect],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      name="measurement-location-sheet"
      index={0}
      stackBehavior="push"
      enableDynamicSizing
      enablePanDownToClose
      onDismiss={handleDismissed}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("Measurement location")}</Text>

          <Text style={styles.description}>
            {t("Where was the temperature measured?")}
          </Text>
        </View>

        <View accessibilityRole="radiogroup" style={styles.locationsList}>
          {MEASUREMENT_LOCATIONS.map((location) => (
            <MeasurementLocationRow
              key={location.id}
              location={location}
              selected={selectedLocation === location.id}
              onPress={handleSelect}
              colors={colors}
              styles={styles}
              t={t}
            />
          ))}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default MeasurementLocationSheet;

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
      paddingBottom: 12,
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

    locationsList: {
      gap: 8,
    },

    locationRow: {
      minHeight: 64,

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 12,
      paddingVertical: 8,

      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,

      backgroundColor: colors.white,
    },

    locationRowSelected: {
      borderColor: `${colors.primary}55`,
      backgroundColor: colors.selectedBackground,
    },

    locationRowPressed: {
      opacity: 0.72,

      transform: [
        {
          scale: 0.985,
        },
      ],
    },

    locationIconContainer: {
      width: 46,
      height: 46,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 13,

      borderRadius: 16,

      backgroundColor: colors.lightBackground,
    },

    locationIconContainerSelected: {
      backgroundColor: colors.selectedBackground,
    },

    locationTitle: {
      flex: 1,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 15,
      lineHeight: 21,

      color: colors.textPrimary,
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
  });
