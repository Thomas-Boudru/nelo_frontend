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

import FormulaMilkIcon from "../../../assets/illustrations/tracking/milkType/formula.svg";
import BreastMilkIcon from "../../../assets/illustrations/tracking/milkType/breast.svg";
import MixedMilkIcon from "../../../assets/illustrations/tracking/milkType/mix.svg";
import OtherMilkIcon from "../../../assets/illustrations/tracking/milkType/other.svg";

import { useThemeColors } from "../../../theme/useThemeColors.js";

const MILK_TYPES = [
  {
    id: "formula",
    labelKey: "Formula",
    Icon: FormulaMilkIcon,
  },
  {
    id: "breast_milk",
    labelKey: "Breast milk",
    Icon: BreastMilkIcon,
  },
  {
    id: "mixed",
    labelKey: "Mixed milk",
    Icon: MixedMilkIcon,
  },
  {
    id: "other",
    labelKey: "Other milk",
    Icon: OtherMilkIcon,
  },
];

const MilkTypeSheet = forwardRef(function MilkTypeSheet({ onSelect }, ref) {
  const { t } = useTranslation();
  const modalRef = useRef(null);

  const [selectedMilkType, setSelectedMilkType] = useState("formula");

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const snapPoints = useMemo(() => ["43%"], []);

  useImperativeHandle(ref, () => ({
    present(currentMilkType = "formula") {
      setSelectedMilkType(currentMilkType);
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
        opacity={0.18}
      />
    ),
    [],
  );

  const handleSelect = useCallback(
    (milkType) => {
      setSelectedMilkType(milkType);
      onSelect?.(milkType);
      modalRef.current?.dismiss();
    },
    [onSelect],
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      index={0}
      snapPoints={snapPoints}
      stackBehavior="push"
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("Milk type")}</Text>

          <Text style={styles.description}>
            {t("Choose the milk used for this bottle")}
          </Text>
        </View>

        <View style={styles.options}>
          {MILK_TYPES.map((milkType) => {
            const isSelected = selectedMilkType === milkType.id;
            const iconColor = isSelected
              ? colors.primary
              : colors.textSecondary;

            const Icon = milkType.Icon;

            return (
              <Pressable
                key={milkType.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => handleSelect(milkType.id)}
                style={({ pressed }) => [
                  styles.option,
                  isSelected && styles.optionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.optionLeft}>
                  <View
                    style={[
                      styles.iconContainer,
                      isSelected && styles.iconContainerSelected,
                    ]}
                  >
                    <Icon width={22} height={22} color={iconColor} />
                  </View>

                  <Text
                    style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected,
                    ]}
                  >
                    {t(milkType.labelKey)}
                  </Text>
                </View>

                {isSelected ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={21}
                    color={colors.primary}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default MilkTypeSheet;

function createStyles(colors) {
  return StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,
      borderRadius: 30,
    },

    handle: {
      width: 38,
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.border,
    },

    content: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },

    header: {
      paddingTop: 4,
      paddingBottom: 18,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
      color: colors.textPrimary,
    },

    description: {
      marginTop: 5,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      color: colors.textSecondary,
    },

    options: {
      gap: 9,
    },

    option: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 57,
      paddingHorizontal: 13,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 17,
      backgroundColor: colors.white,
    },

    optionSelected: {
      borderColor: `${colors.primary}70`,
      backgroundColor: colors.selectedBackground,
    },

    optionLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },

    iconContainer: {
      alignItems: "center",
      justifyContent: "center",
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: colors.lightBlue,
    },

    iconContainerSelected: {
      backgroundColor: `${colors.primary}14`,
    },

    optionLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      color: colors.textPrimary,
    },

    optionLabelSelected: {
      color: colors.primary,
    },

    pressed: {
      opacity: 0.76,
    },
  });
}
