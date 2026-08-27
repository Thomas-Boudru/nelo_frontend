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
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import EditBottleCapacitySheet from "./EditBottleCapacitySheet.js";

import { useTranslation } from "react-i18next";
import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";

import { useThemeColors } from "../../../theme/useThemeColors.js";

const BOTTLE_CAPACITIES = [120, 160, 240, 260, 330];
const MAX_CUSTOM_CAPACITIES = 2;

const BottleCapacitySheet = forwardRef(function BottleCapacitySheet(
  { onSelect },
  ref,
) {
  const { t } = useTranslation();
  const modalRef = useRef(null);
  const editCapacitySheetRef = useRef(null);

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedCapacityMl, setSelectedCapacityMl] = useState(null);
  const [customCapacities, setCustomCapacities] = useState([]);
  const [isAddingCustomCapacity, setIsAddingCustomCapacity] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  const snapPoints = useMemo(() => ["50%"], []);

  useImperativeHandle(ref, () => ({
    present(currentCapacityMl) {
      setSelectedCapacityMl(currentCapacityMl);
      setIsAddingCustomCapacity(false);
      setCustomAmount("");
      modalRef.current?.present();
    },

    dismiss() {
      modalRef.current?.dismiss();
    },
  }));

  function handleEditCustomCapacity(capacityMl) {
    editCapacitySheetRef.current?.present(capacityMl);
  }

  function handleEditCustomCapacity(capacityMl) {
    editCapacitySheetRef.current?.present(capacityMl);
  }

  async function handleUpdateCustomCapacity({
    previousCapacityMl,
    capacityMl,
  }) {
    setCustomCapacities((currentCapacities) =>
      currentCapacities.map((currentCapacityMl) =>
        currentCapacityMl === previousCapacityMl
          ? capacityMl
          : currentCapacityMl,
      ),
    );

    if (selectedCapacityMl === previousCapacityMl) {
      setSelectedCapacityMl(capacityMl);
      onSelect?.(capacityMl);
    }

    return true;
  }

  async function handleDeleteCustomCapacity({ capacityMl }) {
    setCustomCapacities((currentCapacities) =>
      currentCapacities.filter(
        (currentCapacityMl) => currentCapacityMl !== capacityMl,
      ),
    );

    if (selectedCapacityMl === capacityMl) {
      setSelectedCapacityMl(null);
      onSelect?.(null);
    }

    return true;
  }

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.18}
      />
    ),
    [],
  );

  const handleSelect = (capacityMl) => {
    onSelect?.(capacityMl);
    modalRef.current?.dismiss();
  };

  const parsedCustomAmount = Number(customAmount.replace(",", "."));
  const roundedCustomAmount = Math.round(parsedCustomAmount);

  const isAlreadyAvailable =
    BOTTLE_CAPACITIES.includes(roundedCustomAmount) ||
    customCapacities.includes(roundedCustomAmount);

  const canConfirmCustomAmount =
    Number.isFinite(parsedCustomAmount) &&
    roundedCustomAmount > 0 &&
    !isAlreadyAvailable;

  const handleConfirmCustomAmount = () => {
    if (!canConfirmCustomAmount) {
      return;
    }

    setCustomCapacities((currentCapacities) => [
      ...currentCapacities,
      roundedCustomAmount,
    ]);

    handleSelect(roundedCustomAmount);
  };

  const canAddAnotherCustomCapacity =
    customCapacities.length < MAX_CUSTOM_CAPACITIES;

  return (
    <>
      <BottomSheetModal
        ref={modalRef}
        index={0}
        snapPoints={snapPoints}
        stackBehavior="push"
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetView style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("Bottle capacity")}</Text>

            <Text style={styles.description}>
              {t("Choose the size of the bottle you use most often")}
            </Text>
          </View>

          <View style={styles.capacityGrid}>
            {BOTTLE_CAPACITIES.map((capacityMl) => (
              <CapacityCard
                key={capacityMl}
                capacityMl={capacityMl}
                isSelected={selectedCapacityMl === capacityMl}
                onPress={() => handleSelect(capacityMl)}
                colors={colors}
                styles={styles}
              />
            ))}

            {customCapacities.map((capacityMl) => (
              <CapacityCard
                key={`custom-${capacityMl}`}
                capacityMl={capacityMl}
                isCustom
                isSelected={selectedCapacityMl === capacityMl}
                onPress={() => handleSelect(capacityMl)}
                onEdit={() => handleEditCustomCapacity(capacityMl)}
                colors={colors}
                styles={styles}
              />
            ))}
            {canAddAnotherCustomCapacity && !isAddingCustomCapacity ? (
              <Pressable
                onPress={() => setIsAddingCustomCapacity(true)}
                style={({ pressed }) => [
                  styles.customCard,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="add" size={20} color={colors.primary} />

                <Text style={styles.customCardLabel}>{t("Custom")}</Text>
              </Pressable>
            ) : null}
          </View>

          {isAddingCustomCapacity ? (
            <View style={styles.customInputArea}>
              <View style={styles.customAmountRow}>
                <BottomSheetTextInput
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  placeholder={t("Amount in ml")}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  autoFocus
                  style={styles.customAmountInput}
                />

                <Text style={styles.unit}>ml</Text>
              </View>

              <PrimaryButton
                title={t("Add custom capacity")}
                onPress={handleConfirmCustomAmount}
                disabled={!canConfirmCustomAmount}
              />
            </View>
          ) : null}
        </BottomSheetView>
        <EditBottleCapacitySheet
          ref={editCapacitySheetRef}
          existingCapacities={[...BOTTLE_CAPACITIES, ...customCapacities]}
          onSave={handleUpdateCustomCapacity}
          onDelete={handleDeleteCustomCapacity}
        />
      </BottomSheetModal>
    </>
  );
});

export default BottleCapacitySheet;

function CapacityCard({
  capacityMl,
  isCustom = false,
  isSelected,
  onPress,
  onEdit,
  colors,
  styles,
}) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${capacityMl} ml`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.capacityOption,
        isSelected && styles.capacityOptionSelected,
        pressed && styles.pressed,
      ]}
    >
      <View>
        {isCustom ? (
          <Text style={styles.customBadge}>{t("Custom")}</Text>
        ) : null}

        <Text
          style={[
            styles.capacityOptionLabel,
            isSelected && styles.capacityOptionLabelSelected,
          ]}
        >
          {capacityMl} ml
        </Text>
      </View>

      {isCustom ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Edit custom bottle")}
          hitSlop={10}
          onPress={(event) => {
            event.stopPropagation();
            onEdit?.();
          }}
          style={({ pressed }) => [
            styles.editButton,
            pressed && styles.editButtonPressed,
          ]}
        >
          <FontAwesome6 name="pen" size={12} color={colors.primary} />
        </Pressable>
      ) : isSelected ? (
        <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
      ) : null}
    </Pressable>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,
      borderRadius: 30,
    },

    handle: {
      width: 38,
      height: 4,
      borderRadius: 99,
      backgroundColor: colors.border,
    },

    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingBottom: 22,
    },

    header: {
      paddingTop: 5,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 19,
      color: colors.textPrimary,
    },

    description: {
      marginTop: 5,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },

    capacityGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 22,
    },

    capacityOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "48.5%",
      minHeight: 58,
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.white,
    },

    capacityOptionSelected: {
      borderColor: `${colors.primary}70`,
      backgroundColor: colors.lightBlue,
    },

    capacityOptionLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      color: colors.textPrimary,
    },

    capacityOptionLabelSelected: {
      color: colors.primary,
    },

    customBadge: {
      alignSelf: "flex-start",
      marginBottom: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      overflow: "hidden",
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 8,
      color: colors.primary,
      backgroundColor: `${colors.primary}16`,
    },

    customCard: {
      alignItems: "center",
      justifyContent: "center",
      width: "48.5%",
      minHeight: 58,
      gap: 3,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: `${colors.primary}70`,
      borderRadius: 16,
      backgroundColor: colors.lightBlue,
    },

    customCardLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.primary,
    },

    customAmountRow: {
      flexDirection: "row",
      alignItems: "center",
      height: 54,
      gap: 10,
      marginTop: 14,
      paddingLeft: 15,
      paddingRight: 7,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.white,
    },

    customAmountInput: {
      flex: 1,
      paddingVertical: 0,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 15,
      color: colors.textPrimary,
    },

    unit: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.textSecondary,
    },

    confirmCustomButton: {
      alignItems: "center",
      justifyContent: "center",
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: colors.primary,
    },

    confirmCustomButtonDisabled: {
      opacity: 0.4,
    },

    pressed: {
      opacity: 0.78,
    },

    customInputArea: {
      gap: 12,
      marginTop: 14,
    },

    customAmountRow: {
      flexDirection: "row",
      alignItems: "center",
      height: 54,
      gap: 10,
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.white,
    },

    editButton: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 17,
      backgroundColor: `${colors.primary}14`,
    },

    editButtonPressed: {
      opacity: 0.65,
      transform: [{ scale: 0.94 }],
    },
  });
}
