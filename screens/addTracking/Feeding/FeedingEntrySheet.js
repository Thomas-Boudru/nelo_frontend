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
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import NoteSheet from "./NoteSheet.js";

import FeedingTypeTabs from "../../../components/addTracking/feeding/FeedingTypeTabs.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";
import BottleFeedForm from "../../../components/addTracking/feeding/BottleFeedForm.js";

import BottleCapacitySheet from "./BottleCapacitySheet.js";
import MilkTypeSheet from "../../../components/addTracking/feeding/MilkyTypeSheet.js";

import {
  DEFAULT_BOTTLE_CAPACITY_ML,
  getBottleEntryAmountMl,
} from "../../../components/addTracking/feeding/feedingUnits.js";

const FeedingEntrySheet = forwardRef(function FeedingEntrySheet(
  { childName, onSaveBottle, onSaveBreastfeeding, onSaveSolids, onSavePumping },
  ref,
) {
  const { t } = useTranslation();
  const modalRef = useRef(null);
  const bottleCapacitySheetRef = useRef(null);
  const milkTypeSheetRef = useRef(null);
  const noteSheetRef = useRef(null);

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedType, setSelectedType] = useState("bottle");

  const [bottleEntry, setBottleEntry] = useState({
    bottleCapacityMl: DEFAULT_BOTTLE_CAPACITY_ML,
    portionId: "full",
    milkType: "formula",
    note: "",
    fraction: 1,
    isExactAmountMode: false,
    exactAmount: "",
    feedingDate: new Date(),
    isDateEdited: false,
  });

  const bottleAmountMl = getBottleEntryAmountMl(bottleEntry);

  const snapPoints = useMemo(() => ["92%"], []);

  useImperativeHandle(ref, () => ({
    present(type = "bottle") {
      setSelectedType(type);
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
        opacity={0.42}
      />
    ),
    [],
  );

  const renderForm = () => {
    switch (selectedType) {
      case "bottle":
        return (
          <BottleFeedForm
            value={bottleEntry}
            onChange={setBottleEntry}
            onPressCapacity={({ currentCapacityMl }) => {
              bottleCapacitySheetRef.current?.present(currentCapacityMl);
            }}
            onPressMilkType={({ currentMilkType }) => {
              milkTypeSheetRef.current?.present(currentMilkType);
            }}
            onPressNote={() => {
              noteSheetRef.current?.present(bottleEntry.note);
            }}
          />
        );
      case "breastfeeding":
        return (
          <EmptyForm
            icon="heart-outline"
            title={t("Breastfeeding")}
            description={t("Record a breastfeeding session for child", {
              childName,
            })}
          />
        );

      case "solids":
        return (
          <EmptyForm
            icon="restaurant-outline"
            title={t("Solids")}
            description={t("Record a meal for child", { childName })}
          />
        );

      case "pumping":
        return (
          <EmptyForm
            icon="fitness-outline"
            title={t("Pumping")}
            description={t("Record a pumping session")}
          />
        );

      default:
        return null;
    }
  };

  return (
    <BottomSheetModal
      ref={modalRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      // Le contenu contient un curseur vertical (le biberon) : sans ça, la
      // sheet capte le geste et le glissement devient saccadé.
      enableContentPanningGesture={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t("Add a feeding")}</Text>

            <Text style={styles.subtitle}>
              {t("Keep track of child meals", { childName })}
            </Text>
          </View>
        </View>

        <FeedingTypeTabs value={selectedType} onChange={setSelectedType} />

        <View style={styles.formArea}>
          {selectedType === "bottle" ? (
            renderForm()
          ) : (
            <BottomSheetScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {renderForm()}
            </BottomSheetScrollView>
          )}
        </View>

        <View style={styles.footerContainer}>
          <PrimaryButton
            title={t("Save feeding")}
            onPress={() => {
              if (selectedType !== "bottle" || !bottleAmountMl) return;

              onSaveBottle?.({ ...bottleEntry, amountMl: bottleAmountMl });
              modalRef.current?.dismiss();
            }}
            disabled={selectedType !== "bottle" || !bottleAmountMl}
          />
        </View>
      </View>

      <BottleCapacitySheet
        ref={bottleCapacitySheetRef}
        onSelect={(capacityMl) => {
          setBottleEntry((current) => ({
            ...current,
            bottleCapacityMl: capacityMl,
          }));
        }}
      />

      <MilkTypeSheet
        ref={milkTypeSheetRef}
        onSelect={(milkType) => {
          setBottleEntry((current) => ({
            ...current,
            milkType,
          }));
        }}
      />

      <NoteSheet
        ref={noteSheetRef}
        onSave={(note) => {
          setBottleEntry((current) => ({
            ...current,
            note,
          }));
        }}
      />
    </BottomSheetModal>
  );
});

export default FeedingEntrySheet;

function EmptyForm({ icon, title, description }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createEmptyStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,
      borderRadius: 32,
    },

    handle: {
      width: 38,
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.border,
    },

    content: {
      flex: 1,
    },

    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 18,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 21,
      color: colors.textPrimary,
    },

    subtitle: {
      marginTop: 5,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      color: colors.textSecondary,
    },

    closeButton: {
      alignItems: "center",
      justifyContent: "center",
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.lightBlue,
    },

    formArea: {
      flex: 1,
      minHeight: 0,
    },

    formScroll: {
      flex: 1,
    },

    formScrollContent: {
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 20,
    },

    footerContainer: {
      flexShrink: 0,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.white,
    },
  });
}

function createEmptyStyles(colors) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      paddingTop: 80,
    },

    iconContainer: {
      alignItems: "center",
      justifyContent: "center",
      width: 62,
      height: 62,
      borderRadius: 22,
      backgroundColor: `${colors.primary}14`,
    },

    title: {
      marginTop: 18,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 18,
      color: colors.textPrimary,
    },

    description: {
      maxWidth: 250,
      marginTop: 8,
      textAlign: "center",
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 20,
      color: colors.textSecondary,
    },
  });
}
