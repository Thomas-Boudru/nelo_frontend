import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import DateTimeRow from "../DateTimeRow.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const LEFT_BREAST_IMAGE = require("../../../assets/illustrations/tracking/leftBreast.png");
const RIGHT_BREAST_IMAGE = require("../../../assets/illustrations/tracking/rightBreast.png");

const SIDES = {
  left: "left",
  right: "right",
};

const AMOUNT_STEP_ML = 10;
const AMOUNT_PRESETS_ML = [30, 60, 90];

export default function PumpingForm({ value, onChange, onPressNote }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const leftAmountMl = value?.leftAmountMl ?? 0;
  const rightAmountMl = value?.rightAmountMl ?? 0;
  const totalAmountMl = leftAmountMl + rightAmountMl;
  const hasAmount = totalAmountMl > 0;

  const updateValue = (nextValue) => {
    onChange?.({
      ...value,
      ...nextValue,
    });
  };

  const handleReset = () => {
    updateValue({
      leftAmountMl: 0,
      rightAmountMl: 0,
    });
  };

  const handleSideReset = (side) => {
    updateValue({
      [side === SIDES.left ? "leftAmountMl" : "rightAmountMl"]: 0,
    });
  };

  const handleAmountChange = (side, amountMl) => {
    updateValue({
      [side === SIDES.left ? "leftAmountMl" : "rightAmountMl"]: Math.max(
        0,
        amountMl,
      ),
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable
          disabled={!hasAmount}
          onPress={handleReset}
          style={({ pressed }) => [
            styles.resetActionButton,
            !hasAmount && styles.resetActionButtonDisabled,
            pressed && hasAmount && styles.pressed,
          ]}
        >
          <Ionicons
            name="refresh-outline"
            size={15}
            color={hasAmount ? colors.textSecondary : colors.border}
          />

          <Text
            style={[
              styles.resetActionLabel,
              !hasAmount && styles.resetActionLabelDisabled,
            ]}
          >
            {t("Reset")}
          </Text>
        </Pressable>

        <View style={styles.totalPill}>
          <Text style={styles.totalLabel}>{t("Total")}</Text>
          <Text style={styles.totalValue}>{totalAmountMl} ml</Text>
        </View>

        <Pressable
          onPress={onPressNote}
          style={({ pressed }) => [
            styles.noteActionButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.noteActionLabel}>
            {value?.note?.trim() ? t("Edit note") : t("Add a note")}
          </Text>

          {value?.note?.trim() ? <View style={styles.noteIndicator} /> : null}
        </Pressable>
      </View>

      <View style={styles.sidesRow}>
        <PumpingSideCard
          title={t("Left")}
          image={LEFT_BREAST_IMAGE}
          amountMl={leftAmountMl}
          onReset={() => handleSideReset(SIDES.left)}
          onAmountChange={(amountMl) =>
            handleAmountChange(SIDES.left, amountMl)
          }
          colors={colors}
          styles={styles}
        />

        <PumpingSideCard
          title={t("Right")}
          image={RIGHT_BREAST_IMAGE}
          amountMl={rightAmountMl}
          onReset={() => handleSideReset(SIDES.right)}
          onAmountChange={(amountMl) =>
            handleAmountChange(SIDES.right, amountMl)
          }
          colors={colors}
          styles={styles}
        />
      </View>

      <View style={styles.dateTimeSection}>
        <DateTimeRow
          value={value?.pumpingDate ?? new Date()}
          isNow={!value?.isDateEdited}
          onChange={(pumpingDate) =>
            updateValue({
              pumpingDate,
              isDateEdited: true,
            })
          }
        />
      </View>
    </View>
  );
}

function PumpingSideCard({
  title,
  image,
  amountMl,
  onReset,
  onAmountChange,
  colors,
  styles,
}) {
  const hasAmount = amountMl > 0;

  const decreaseAmount = () => {
    onAmountChange(amountMl - AMOUNT_STEP_ML);
  };

  const increaseAmount = () => {
    onAmountChange(amountMl + AMOUNT_STEP_ML);
  };

  return (
    <View style={styles.sideCard}>
      <Pressable
        disabled={!hasAmount}
        hitSlop={8}
        onPress={onReset}
        style={({ pressed }) => [
          styles.sideResetButton,
          !hasAmount && styles.sideResetButtonDisabled,
          pressed && hasAmount && styles.pressed,
        ]}
      >
        <Ionicons
          name="refresh-outline"
          size={14}
          color={hasAmount ? colors.primary : colors.border}
        />
      </Pressable>

      <Image source={image} resizeMode="contain" style={styles.illustration} />

      <Text style={styles.sideTitle}>{title}</Text>
      <Text style={styles.amountValue}>{amountMl} ml</Text>

      <View style={styles.amountStepper}>
        <Pressable
          disabled={amountMl <= 0}
          onPress={decreaseAmount}
          style={({ pressed }) => [
            styles.amountStepButton,
            amountMl <= 0 && styles.amountStepButtonDisabled,
            pressed && amountMl > 0 && styles.pressed,
          ]}
        >
          <Ionicons
            name="remove"
            size={15}
            color={amountMl > 0 ? colors.primary : colors.border}
          />
        </Pressable>

        <Pressable
          onPress={increaseAmount}
          style={({ pressed }) => [
            styles.amountStepButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="add" size={15} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.presetRow}>
        {AMOUNT_PRESETS_ML.map((presetMl) => {
          const isSelected = amountMl === presetMl;

          return (
            <Pressable
              key={presetMl}
              onPress={() => onAmountChange(presetMl)}
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
                {presetMl}
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
    container: {
      flex: 1,
      paddingTop: 4,
    },
    topRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    resetActionButton: {
      alignItems: "center",
      flexDirection: "row",
      gap: 5,
      minHeight: 32,
      paddingHorizontal: 4,
    },
    resetActionButtonDisabled: {
      opacity: 0.55,
    },
    resetActionLabel: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
    },
    resetActionLabelDisabled: {
      color: colors.border,
    },
    totalPill: {
      alignItems: "center",
      backgroundColor: `${colors.primary}12`,
      borderRadius: 999,
      flexDirection: "row",
      gap: 6,
      minHeight: 32,
      paddingHorizontal: 10,
    },
    totalLabel: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 11,
    },
    totalValue: {
      color: colors.primary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 12,
    },
    noteActionButton: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderRadius: 10,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 32,
      paddingHorizontal: 10,
      position: "relative",
    },
    noteActionLabel: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
    },
    noteIndicator: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      height: 8,
      position: "absolute",
      right: -3,
      top: -3,
      width: 8,
    },
    sidesRow: {
      flexDirection: "row",
      gap: 12,
    },
    sideCard: {
      alignItems: "center",
      backgroundColor: colors.lightBlue,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      flex: 1,
      paddingBottom: 16,
      paddingHorizontal: 10,
      paddingTop: 18,
      position: "relative",
    },
    sideResetButton: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 26,
      justifyContent: "center",
      position: "absolute",
      right: 9,
      top: 9,
      width: 26,
    },
    sideResetButtonDisabled: {
      backgroundColor: colors.lightBlue,
      opacity: 0.65,
    },
    illustration: {
      height: 64,
      marginBottom: 9,
      width: 64,
    },
    sideTitle: {
      color: colors.primary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 17,
    },
    amountValue: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 24,
      marginTop: 6,
    },
    amountStepper: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
      marginTop: 12,
    },
    amountStepButton: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 30,
      justifyContent: "center",
      width: 30,
    },
    amountStepButtonDisabled: {
      backgroundColor: colors.lightBlue,
    },
    presetRow: {
      flexDirection: "row",
      gap: 6,
      marginTop: 12,
      width: "100%",
    },
    presetButton: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      flex: 1,
      justifyContent: "center",
      minHeight: 30,
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
    dateTimeSection: {
      marginTop: 16,
    },
    pressed: {
      opacity: 0.72,
    },
  });
