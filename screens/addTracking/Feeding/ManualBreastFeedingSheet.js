import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import DateTimeRow from "../../../components/addTracking/DateTimeRow.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const MINUTE_STEP = 1;
const DURATION_PRESETS = [5, 10, 15, 20];

const ManualBreastfeedingSheet = forwardRef(function ManualBreastfeedingSheet(
  { onSave },
  ref,
) {
  const { t } = useTranslation();

  const bottomSheetRef = useRef(null);

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [feedingDate, setFeedingDate] = useState(new Date());
  const [leftMinutes, setLeftMinutes] = useState(0);
  const [rightMinutes, setRightMinutes] = useState(0);

  const snapPoints = useMemo(() => ["68%"], []);

  const canSave = leftMinutes > 0 || rightMinutes > 0;

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

  useImperativeHandle(ref, () => ({
    present(initialValue = {}) {
      setFeedingDate(initialValue.feedingDate ?? new Date());
      setLeftMinutes(Math.round((initialValue.leftDurationSeconds ?? 0) / 60));
      setRightMinutes(
        Math.round((initialValue.rightDurationSeconds ?? 0) / 60),
      );

      bottomSheetRef.current?.present();
    },
    dismiss() {
      bottomSheetRef.current?.dismiss();
    },
  }));

  const handleSave = () => {
    if (!canSave) return;

    onSave?.({
      feedingDate,
      leftDurationSeconds: leftMinutes * 60,
      rightDurationSeconds: rightMinutes * 60,
      activeSide: null,
      activeStartedAt: null,
      isDateEdited: true,
    });

    bottomSheetRef.current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      stackBehavior="push"
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("Add breastfeeding manually")}</Text>

          <Text style={styles.description}>
            {t("Enter the time spent on each side")}
          </Text>
        </View>

        <DateTimeRow
          value={feedingDate}
          isNow={false}
          onChange={setFeedingDate}
          maximumDate={new Date()}
        />

        <View style={styles.durationSection}>
          <ManualDurationRow
            label={t("Left")}
            value={leftMinutes}
            onChange={setLeftMinutes}
            colors={colors}
            styles={styles}
          />

          <ManualDurationRow
            label={t("Right")}
            value={rightMinutes}
            onChange={setRightMinutes}
            colors={colors}
            styles={styles}
          />
        </View>

        <PrimaryButton
          title={t("Save breastfeeding")}
          disabled={!canSave}
          onPress={handleSave}
          style={styles.saveButton}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default ManualBreastfeedingSheet;

function ManualDurationRow({ label, value, onChange, colors, styles }) {
  const decrease = () => {
    onChange(Math.max(0, value - MINUTE_STEP));
  };

  const increase = () => {
    onChange(value + MINUTE_STEP);
  };

  return (
    <View style={styles.durationCard}>
      <View style={styles.durationHeader}>
        <Text style={styles.durationLabel}>{label}</Text>

        <View style={styles.stepper}>
          <Pressable
            disabled={value <= 0}
            onPress={decrease}
            style={({ pressed }) => [
              styles.stepperButton,
              value <= 0 && styles.stepperButtonDisabled,
              pressed && value > 0 && styles.pressed,
            ]}
          >
            <Ionicons
              name="remove"
              size={17}
              color={value > 0 ? colors.primary : colors.border}
            />
          </Pressable>

          <Text style={styles.durationValue}>{value} min</Text>

          <Pressable
            onPress={increase}
            style={({ pressed }) => [
              styles.stepperButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="add" size={17} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.presetRow}>
        {DURATION_PRESETS.map((minutes) => {
          const isSelected = value === minutes;

          return (
            <Pressable
              key={minutes}
              onPress={() => onChange(minutes)}
              style={({ pressed }) => [
                styles.presetButton,
                isSelected && styles.presetButtonSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.presetButtonLabel,
                  isSelected && styles.presetButtonLabelSelected,
                ]}
              >
                {minutes} min
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
    },
    handleIndicator: {
      backgroundColor: colors.border,
      width: 46,
    },
    container: {
      flex: 1,
      paddingBottom: 22,
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    header: {
      marginBottom: 18,
    },
    title: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
      marginBottom: 6,
    },
    description: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 19,
    },
    durationSection: {
      gap: 12,
      marginBottom: 18,
      marginTop: 18,
    },
    durationCard: {
      backgroundColor: colors.lightBlue,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      padding: 14,
    },
    durationHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    durationLabel: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
    },
    stepper: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
    },
    stepperButton: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    stepperButtonDisabled: {
      backgroundColor: colors.lightBlue,
    },
    durationValue: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      minWidth: 58,
      textAlign: "center",
    },
    presetRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },
    presetButton: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      flex: 1,
      justifyContent: "center",
      minHeight: 34,
    },
    presetButtonSelected: {
      backgroundColor: `${colors.primary}12`,
      borderColor: colors.primary,
    },
    presetButtonLabel: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
    },
    presetButtonLabelSelected: {
      color: colors.primary,
    },
    saveButton: {
      marginTop: "auto",
    },
    pressed: {
      opacity: 0.72,
    },
  });
