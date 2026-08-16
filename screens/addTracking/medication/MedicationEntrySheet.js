import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import NoteSheet from "../Feeding/NoteSheet.js";
import MedicationPickerSheet from "./MedicationPickerSheet.js";
import VaccinePickerSheet from "./VaccinePickerSheet.js";

import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import MedicationTypeTabs from "../../../components/addTracking/medication/MedicationTypeTabs.js";
import MedicationForm from "../../../components/addTracking/medication/MedicationForm.js";
import VaccineForm from "../../../components/addTracking/medication/VaccineForm.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";
import VaccineDetailsSheet from "./VaccineDetailsSheet.js";

const createMedicationEntry = () => ({
  medicationName: "",
  amount: "",
  unit: "ml",
  note: "",
  medicationDate: new Date(),
  isDateEdited: false,
});

const EMPTY_MEDICATION_ENTRY = {
  medicationId: null,
  medicationName: "",
  medicationTranslationKey: null,
  medicationCategory: null,
  isCustomMedication: false,

  dose: "",
  unit: "ml",
  date: new Date(),
  note: "",
};

const createVaccineEntry = () => ({
  vaccineId: null,
  vaccineName: "",
  vaccineTranslationKey: null,
  vaccineCategory: null,
  isCustomVaccine: false,

  dose: null,
  vaccineDate: new Date(),
  isDateEdited: false,

  hasNextDose: false,
  nextDoseDate: null,

  note: "",
  photos: [],
});

const MedicationEntrySheet = forwardRef(function MedicationEntrySheet(
  {
    childName,
    recentMedications = [],
    recentVaccines = [],
    onSaveMedication,
    onSaveVaccine,
  },
  ref,
) {
  const { t } = useTranslation();

  const modalRef = useRef(null);
  const medicationPickerRef = useRef(null);

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const snapPoints = useMemo(() => ["92%"], []);

  const [selectedType, setSelectedType] = useState("medication");
  const [medicationEntry, setMedicationEntry] = useState(createMedicationEntry);
  const [vaccineEntry, setVaccineEntry] = useState(createVaccineEntry);
  const vaccineDetailsSheetRef = useRef(null);
  const vaccinePickerRef = useRef(null);
  const noteSheetRef = useRef(null);

  useImperativeHandle(ref, () => ({
    present(type = "medication") {
      setSelectedType(type === "vaccine" ? "vaccine" : "medication");
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

  const medicationAmount = Number(
    String(medicationEntry.amount).replace(",", "."),
  );

  const canSaveMedication =
    medicationEntry.medicationName.trim().length > 0 &&
    Number.isFinite(medicationAmount) &&
    medicationAmount > 0;

  const canSaveVaccine = vaccineEntry.vaccineName.trim().length > 0;

  const canSave =
    selectedType === "medication" ? canSaveMedication : canSaveVaccine;

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    if (selectedType === "medication") {
      await onSaveMedication?.({
        ...medicationEntry,
        amount: medicationAmount,
        type: "medication",
      });

      setMedicationEntry(createMedicationEntry());
    } else {
      await onSaveVaccine?.({
        ...vaccineEntry,
        nextDoseDate: vaccineEntry.hasNextDose
          ? vaccineEntry.nextDoseDate
          : null,
        type: "vaccine",
      });

      setVaccineEntry(createVaccineEntry());
    }

    modalRef.current?.dismiss();
  };

  const [customMedications, setCustomMedications] = useState([]);

  const handleSaveCustomMedication = (medication) => {
    setCustomMedications((current) => {
      const alreadyExists = current.some((item) => item.id === medication.id);

      if (alreadyExists) {
        return current.map((item) =>
          item.id === medication.id ? medication : item,
        );
      }

      return [medication, ...current];
    });
  };

  const handleDeleteCustomMedication = (deletedMedication) => {
    setCustomMedications((current) =>
      current.map((item) =>
        item.id === deletedMedication.id ? deletedMedication : item,
      ),
    );
  };

  const [customVaccines, setCustomVaccines] = useState([]);

  const handleSaveCustomVaccine = (vaccine) => {
    setCustomVaccines((current) => {
      const alreadyExists = current.some((item) => item.id === vaccine.id);

      if (alreadyExists) {
        return current.map((item) => (item.id === vaccine.id ? vaccine : item));
      }

      return [vaccine, ...current];
    });
  };

  /*
   * La suppression est logique : on conserve l’entrée marquée
   * pour ne pas perdre les vaccins déjà enregistrés.
   */
  const handleDeleteCustomVaccine = (deletedVaccine) => {
    setCustomVaccines((current) =>
      current.map((item) =>
        item.id === deletedVaccine.id ? deletedVaccine : item,
      ),
    );
  };

  return (
    <>
      <BottomSheetModal
        ref={modalRef}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {selectedType === "medication"
                ? t("Add medication")
                : t("Add a vaccine")}
            </Text>

            <Text style={styles.subtitle}>
              {selectedType === "medication"
                ? t("Record medication given to child", { childName })
                : t("Keep child vaccination history up to date", {
                    childName,
                  })}
            </Text>
          </View>

          <MedicationTypeTabs value={selectedType} onChange={setSelectedType} />

          <View style={styles.formArea}>
            <BottomSheetScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              nestedScrollEnabled
            >
              {selectedType === "medication" ? (
                <MedicationForm
                  value={medicationEntry}
                  onChange={setMedicationEntry}
                  recentMedications={recentMedications}
                  onPressMedication={() => {
                    medicationPickerRef.current?.present();
                  }}
                  onPressNote={() => {
                    noteSheetRef.current?.present(medicationEntry.note);
                  }}
                />
              ) : (
                <VaccineForm
                  value={vaccineEntry}
                  onChange={setVaccineEntry}
                  onPressVaccine={() => {
                    vaccinePickerRef.current?.present();
                  }}
                  onPressDetails={() => {
                    vaccineDetailsSheetRef.current?.present({
                      note: vaccineEntry.note,
                      photos: vaccineEntry.photos,
                    });
                  }}
                />
              )}
            </BottomSheetScrollView>
          </View>

          <View style={styles.footerContainer}>
            <PrimaryButton
              title={
                selectedType === "medication"
                  ? t("Save medication")
                  : t("Save vaccine")
              }
              onPress={handleSave}
              disabled={!canSave}
            />
          </View>
        </View>
      </BottomSheetModal>
      <NoteSheet
        ref={noteSheetRef}
        title="Medication note"
        description="Add an optional detail about this medication"
        placeholder="For example, how it was taken or any reaction observed"
        onSave={(note) => {
          setMedicationEntry((current) => ({
            ...current,
            note,
          }));
        }}
      />

      <VaccineDetailsSheet
        ref={vaccineDetailsSheetRef}
        onSave={({ note, photos }) => {
          setVaccineEntry((current) => ({
            ...current,
            note,
            photos,
          }));
        }}
      />

      <MedicationPickerSheet
        ref={medicationPickerRef}
        recentMedications={recentMedications}
        customMedications={customMedications}
        onSaveCustomMedication={handleSaveCustomMedication}
        onDeleteCustomMedication={handleDeleteCustomMedication}
        onSelectMedication={(medication) => {
          setMedicationEntry((current) => ({
            ...current,
            medicationId: medication.id,
            medicationName: medication.name,
            medicationTranslationKey: medication.translationKey,
            medicationCategory: medication.category,
            isCustomMedication: medication.isCustom,
          }));
        }}
      />

      <VaccinePickerSheet
        ref={vaccinePickerRef}
        recentVaccines={recentVaccines}
        customVaccines={customVaccines}
        onSaveCustomVaccine={handleSaveCustomVaccine}
        onDeleteCustomVaccine={handleDeleteCustomVaccine}
        onSelectVaccine={(vaccine) => {
          setVaccineEntry((current) => ({
            ...current,
            vaccineId: vaccine.id,
            vaccineName: vaccine.name,
            vaccineTranslationKey: vaccine.translationKey,
            vaccineCategory: vaccine.category,
            isCustomVaccine: vaccine.isCustom,
          }));
        }}
      />
    </>
  );
});

export default MedicationEntrySheet;

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
      minHeight: 0,
    },

    header: {
      flexShrink: 0,
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

    formArea: {
      flex: 1,
      minHeight: 0,
      overflow: "hidden",
    },

    formScroll: {
      flex: 1,
    },

    formScrollContent: {
      flexGrow: 1,
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
