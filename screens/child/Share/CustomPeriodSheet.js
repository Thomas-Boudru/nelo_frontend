import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheetBackdrop, BottomSheetModal } from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

function startOfDay(date) {
  const normalizedDate = new Date(date);

  normalizedDate.setHours(0, 0, 0, 0);

  return normalizedDate;
}

function differenceInDays(startDate, endDate) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round(
    (startOfDay(endDate).getTime() - startOfDay(startDate).getTime()) /
      millisecondsPerDay,
  );
}

const CustomPeriodSheet = forwardRef(function CustomPeriodSheet(
  { minimumDate, maximumDate = new Date(), maxRangeDays, onConfirm },
  ref,
) {
  const { t, i18n } = useTranslation();

  const colors = useThemeColors();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const modalRef = useRef(null);

  const [startDate, setStartDate] = useState(
    startOfDay(new Date(new Date().setDate(new Date().getDate() - 7))),
  );

  const [endDate, setEndDate] = useState(startOfDay(new Date()));

  const [activeField, setActiveField] = useState(null);

  const snapPoints = useMemo(() => [Platform.OS === "ios" ? "68%" : "48%"], []);

  const normalizedMinimumDate = minimumDate
    ? startOfDay(minimumDate)
    : undefined;

  const normalizedMaximumDate = startOfDay(maximumDate ?? new Date());

  const formatDate = (date) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);

  const validationError = useMemo(() => {
    if (startDate > endDate) {
      return t("The start date must be before the end date.");
    }

    if (maxRangeDays && differenceInDays(startDate, endDate) > maxRangeDays) {
      return t("The selected period cannot exceed {{count}} days.", {
        count: maxRangeDays,
      });
    }

    return null;
  }, [endDate, maxRangeDays, startDate, t]);

  useImperativeHandle(ref, () => ({
    present(initialPeriod) {
      const initialStartDate =
        initialPeriod?.startDate ??
        startOfDay(new Date(new Date().setDate(new Date().getDate() - 7)));

      const initialEndDate = initialPeriod?.endDate ?? startOfDay(new Date());

      setStartDate(startOfDay(initialStartDate));
      setEndDate(startOfDay(initialEndDate));
      setActiveField(null);

      modalRef.current?.present();
    },

    dismiss() {
      modalRef.current?.dismiss();
    },
  }));

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.22}
      />
    ),
    [],
  );

  const handleDateChange = (event, selectedDate) => {
    /*
     * Sur Android, le calendrier natif peut être fermé
     * sans sélectionner une date.
     */
    if (Platform.OS === "android") {
      setActiveField(null);
    }

    if (event?.type === "dismissed" || !selectedDate) {
      return;
    }

    const normalizedDate = startOfDay(selectedDate);

    if (activeField === "start") {
      setStartDate(normalizedDate);

      /*
       * Si la nouvelle date de début dépasse la date
       * de fin, on déplace également la date de fin.
       */
      if (normalizedDate > endDate) {
        setEndDate(normalizedDate);
      }

      return;
    }

    if (activeField === "end") {
      setEndDate(normalizedDate);
    }
  };

  const handleConfirm = () => {
    if (validationError) {
      return;
    }

    onConfirm?.({
      startDate,
      endDate,
    });

    modalRef.current?.dismiss();
  };

  const pickerValue = activeField === "start" ? startDate : endDate;

  const pickerMinimumDate =
    activeField === "end" ? startDate : normalizedMinimumDate;

  const pickerMaximumDate =
    activeField === "start" ? endDate : normalizedMaximumDate;

  return (
    <BottomSheetModal
      ref={modalRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      stackBehavior="push"
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("Choose a custom period")}</Text>

          <Text style={styles.description}>
            {t("Select the first and last day to include.")}
          </Text>
        </View>

        <View style={styles.content}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Choose start date")}
            onPress={() => setActiveField("start")}
            style={({ pressed }) => [
              styles.dateRow,
              activeField === "start" && styles.dateRowSelected,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.dateRowLeft}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>

              <View style={styles.dateText}>
                <Text style={styles.dateLabel}>{t("Start date")}</Text>

                <Text style={styles.dateValue}>{formatDate(startDate)}</Text>
              </View>
            </View>

            <Ionicons
              name="chevron-forward"
              size={19}
              color={colors.textSecondary}
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Choose end date")}
            onPress={() => setActiveField("end")}
            style={({ pressed }) => [
              styles.dateRow,
              activeField === "end" && styles.dateRowSelected,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.dateRowLeft}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name="calendar-clear-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>

              <View style={styles.dateText}>
                <Text style={styles.dateLabel}>{t("End date")}</Text>

                <Text style={styles.dateValue}>{formatDate(endDate)}</Text>
              </View>
            </View>

            <Ionicons
              name="chevron-forward"
              size={19}
              color={colors.textSecondary}
            />
          </Pressable>

          {activeField ? (
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={pickerValue}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={pickerMinimumDate}
                maximumDate={pickerMaximumDate}
                onChange={handleDateChange}
                locale={i18n.language}
                themeVariant="light"
                style={styles.picker}
              />
            </View>
          ) : null}

          {validationError ? (
            <View style={styles.errorContainer}>
              <Ionicons
                name="alert-circle-outline"
                size={17}
                color={colors.error}
              />

              <Text style={styles.errorText}>{validationError}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            title={t("Confirm period")}
            onPress={handleConfirm}
            disabled={Boolean(validationError)}
          />
        </View>
      </View>
    </BottomSheetModal>
  );
});

export default CustomPeriodSheet;

const createStyles = (colors) =>
  StyleSheet.create({
    sheetBackground: {
      borderRadius: 30,
      backgroundColor: colors.white,
    },

    handle: {
      width: 38,
      height: 4,

      borderRadius: 999,
      backgroundColor: colors.border,
    },

    sheet: {
      flex: 1,
    },

    header: {
      paddingHorizontal: 20,
      paddingTop: 5,
      paddingBottom: 18,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 21,
      lineHeight: 27,

      color: colors.textPrimary,
    },

    description: {
      marginTop: 5,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 19,

      color: colors.textSecondary,
    },

    content: {
      flex: 1,
      gap: 12,

      paddingHorizontal: 20,
    },

    dateRow: {
      minHeight: 72,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",

      paddingHorizontal: 14,
      paddingVertical: 11,

      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,

      backgroundColor: colors.white,
    },

    dateRowSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.selectedBackground,
    },

    dateRowLeft: {
      flex: 1,

      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    iconContainer: {
      width: 42,
      height: 42,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 21,
      backgroundColor: colors.selectedBackground,
    },

    dateText: {
      flex: 1,
    },

    dateLabel: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,

      color: colors.textSecondary,
    },

    dateValue: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 20,

      color: colors.textPrimary,
    },

    pickerContainer: {
      overflow: "hidden",

      borderRadius: 20,
      backgroundColor: colors.selectedBackground,
    },

    picker: {
      width: "100%",
    },

    errorContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,

      paddingHorizontal: 4,
    },

    errorText: {
      flex: 1,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,

      color: colors.error,
    },

    footer: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: Platform.OS === "ios" ? 14 : 20,
    },

    pressed: {
      opacity: 0.65,
    },
  });
