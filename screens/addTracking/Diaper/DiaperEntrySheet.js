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
import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import DiaperTypeTabs from "../../../components/addTracking/diaper/DiaperHypeTabs.js";
import DiaperForm from "../../../components/addTracking/diaper/DiaperForm.js";
import PottyForm from "../../../components/addTracking/diaper/PottyForm.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const DiaperEntrySheet = forwardRef(function DiaperEntrySheet(
  { childName, onSaveDiaper, onSavePotty },
  ref,
) {
  const { t } = useTranslation();

  const modalRef = useRef(null);
  const noteSheetRef = useRef(null);

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const snapPoints = useMemo(() => ["92%"], []);
  const [noteTarget, setNoteTarget] = useState("diaper");

  const [selectedType, setSelectedType] = useState("diaper");

  const [diaperEntry, setDiaperEntry] = useState({
    content: null,
    consistency: null,
    note: "",
    diaperDate: new Date(),
    isDateEdited: false,
  });

  const [pottyEntry, setPottyEntry] = useState({
    content: null,
    isAccident: false,
    note: "",
    pottyDate: new Date(),
    isDateEdited: false,
  });

  const handleOpenDiaperNote = () => {
    setNoteTarget("diaper");
    noteSheetRef.current?.present(diaperEntry.note);
  };

  const handleOpenPottyNote = () => {
    setNoteTarget("potty");
    noteSheetRef.current?.present(pottyEntry.note);
  };

  useImperativeHandle(ref, () => ({
    present(type = "diaper") {
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

  const canSave =
    selectedType === "diaper"
      ? Boolean(diaperEntry.content)
      : Boolean(pottyEntry.content);

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    if (selectedType === "diaper") {
      await onSaveDiaper?.({
        ...diaperEntry,
        type: "diaper",
      });
    } else {
      await onSavePotty?.({
        ...pottyEntry,
        type: "potty",
      });
    }

    modalRef.current?.dismiss();
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
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("Add a diaper change")}</Text>

            <Text style={styles.subtitle}>
              {t("Keep track of child diaper changes", {
                childName,
              })}
            </Text>
          </View>

          <DiaperTypeTabs value={selectedType} onChange={setSelectedType} />

          <View style={styles.formArea}>
            <BottomSheetScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {selectedType === "diaper" ? (
                <DiaperForm
                  value={diaperEntry}
                  onChange={setDiaperEntry}
                  onPressNote={handleOpenDiaperNote}
                />
              ) : (
                <PottyForm
                  value={pottyEntry}
                  onChange={setPottyEntry}
                  onPressNote={handleOpenPottyNote}
                />
              )}
            </BottomSheetScrollView>
          </View>

          <View style={styles.footerContainer}>
            <PrimaryButton
              title={
                selectedType === "diaper" ? t("Save diaper") : t("Save potty")
              }
              onPress={handleSave}
              disabled={!canSave}
            />
          </View>
        </View>
      </BottomSheetModal>
      <NoteSheet
        ref={noteSheetRef}
        title={noteTarget === "diaper" ? "Diaper note" : "Potty note"}
        description={
          noteTarget === "diaper"
            ? "Add an optional detail about this diaper"
            : "Add an optional detail about this potty time"
        }
        placeholder={
          noteTarget === "diaper"
            ? "For example, unusual color, irritation or discomfort"
            : "For example, urgency, discomfort or difficulty"
        }
        onSave={(note) => {
          if (noteTarget === "diaper") {
            setDiaperEntry((current) => ({
              ...current,
              note,
            }));
            return;
          }

          setPottyEntry((current) => ({
            ...current,
            note,
          }));
        }}
      />
    </>
  );
});

export default DiaperEntrySheet;

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
