import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
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

function getEntryDate(entry, preferredDateKey) {
  const dateValue =
    entry?.[preferredDateKey] ??
    entry?.occurredAt ??
    entry?.startedAt ??
    entry?.date;

  if (!dateValue) {
    return {
      date: new Date(),
      hasRecordedDate: false,
    };
  }

  const parsedDate = new Date(dateValue);

  const hasRecordedDate = !Number.isNaN(parsedDate.getTime());

  return {
    date: hasRecordedDate ? parsedDate : new Date(),

    hasRecordedDate,
  };
}

function createDefaultDiaperEntry() {
  return {
    content: null,
    consistency: null,
    note: "",

    diaperDate: new Date(),
    isDateEdited: false,
  };
}

function createDefaultPottyEntry() {
  return {
    content: null,
    isAccident: false,
    note: "",

    pottyDate: new Date(),
    isDateEdited: false,
  };
}

function createDiaperEntryFromTrackingEntry(entry) {
  const { date, hasRecordedDate } = getEntryDate(entry, "diaperDate");

  return {
    content: entry?.content ?? entry?.details?.content ?? null,

    consistency: entry?.consistency ?? entry?.details?.consistency ?? null,

    note: entry?.note ?? entry?.details?.note ?? "",

    diaperDate: date,
    isDateEdited: hasRecordedDate,
  };
}

function createPottyEntryFromTrackingEntry(entry) {
  const { date, hasRecordedDate } = getEntryDate(entry, "pottyDate");

  return {
    content: entry?.content ?? entry?.details?.content ?? null,

    isAccident: entry?.isAccident ?? entry?.details?.isAccident ?? false,

    note: entry?.note ?? entry?.details?.note ?? "",

    pottyDate: date,
    isDateEdited: hasRecordedDate,
  };
}

const DiaperEntrySheet = forwardRef(function DiaperEntrySheet(
  {
    childName,

    onSaveDiaper,
    onSavePotty,

    onRequestDelete,
  },
  ref,
) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const modalRef = useRef(null);
  const noteSheetRef = useRef(null);

  const [sheetMode, setSheetMode] = useState("create");

  const [selectedType, setSelectedType] = useState("diaper");

  const [editingEntry, setEditingEntry] = useState(null);

  const [noteTarget, setNoteTarget] = useState("diaper");

  const [diaperEntry, setDiaperEntry] = useState(createDefaultDiaperEntry);

  const [pottyEntry, setPottyEntry] = useState(createDefaultPottyEntry);

  const isEditMode = sheetMode === "edit";

  const { height: windowHeight } = useWindowDimensions();

  /*
   * La librairie compare cette valeur à « hauteur du contenu + hauteur du
   * handle » : c’est donc bien la hauteur totale visible de la sheet qui est
   * plafonnée à 92 % de l’écran.
   */
  const maxDynamicContentSize = useMemo(
    () => Math.round(windowHeight * 0.92),
    [windowHeight],
  );

  const resetEntryForType = useCallback((type) => {
    if (type === "diaper") {
      setDiaperEntry(createDefaultDiaperEntry());

      return;
    }

    if (type === "potty") {
      setPottyEntry(createDefaultPottyEntry());
    }
  }, []);

  const loadEntryForType = useCallback((type, entry) => {
    if (type === "diaper") {
      setDiaperEntry(createDiaperEntryFromTrackingEntry(entry));

      return;
    }

    if (type === "potty") {
      setPottyEntry(createPottyEntryFromTrackingEntry(entry));
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      present(options = {}) {
        /*
         * Conserve la compatibilité avec :
         * present("diaper")
         * present("potty")
         */
        if (typeof options === "string") {
          const type = options;

          setSheetMode("create");
          setEditingEntry(null);
          setSelectedType(type);

          resetEntryForType(type);

          modalRef.current?.present();
          return;
        }

        const {
          mode = "create",
          diaperType = "diaper",
          entry = null,
        } = options;

        setSheetMode(mode);
        setSelectedType(diaperType);

        if (mode === "edit" && entry) {
          setEditingEntry(entry);

          loadEntryForType(diaperType, entry);
        } else {
          setEditingEntry(null);

          resetEntryForType(diaperType);
        }

        modalRef.current?.present();
      },

      dismiss() {
        modalRef.current?.dismiss();
      },
    }),
    [loadEntryForType, resetEntryForType],
  );

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

  const handleOpenDiaperNote = () => {
    setNoteTarget("diaper");

    noteSheetRef.current?.present(diaperEntry.note);
  };

  const handleOpenPottyNote = () => {
    setNoteTarget("potty");

    noteSheetRef.current?.present(pottyEntry.note);
  };

  const handleRequestDelete = () => {
    if (!isEditMode || !editingEntry) {
      return;
    }

    onRequestDelete?.(editingEntry);
  };

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
        ...editingEntry,
        ...diaperEntry,

        id: editingEntry?.id,

        type: "diaper",
        mode: sheetMode,
      });

      modalRef.current?.dismiss();
      return;
    }

    await onSavePotty?.({
      ...editingEntry,
      ...pottyEntry,

      id: editingEntry?.id,

      type: "potty",
      mode: sheetMode,
    });

    modalRef.current?.dismiss();
  };

  const title = isEditMode
    ? selectedType === "diaper"
      ? t("Edit diaper")
      : t("Edit potty time")
    : t("Add a diaper change");

  const subtitle = isEditMode
    ? selectedType === "diaper"
      ? t("Update child's diaper change", {
          childName,
        })
      : t("Update child's potty time", {
          childName,
        })
    : t("Keep track of child diaper changes", {
        childName,
      });

  return (
    <>
      <BottomSheetModal
        ref={modalRef}
        index={0}
        enableDynamicSizing
        maxDynamicContentSize={maxDynamicContentSize}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        {/*
         * C’est ce scroll qui mesure le contenu et donne sa hauteur à la sheet.
         * Toute la page vit donc dedans — en-tête, onglets, formulaire et
         * boutons : sinon leur hauteur n’est jamais comptée et le bas de la
         * sheet se retrouve coupé.
         */}
        <BottomSheetScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>

            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          {!isEditMode ? (
            <DiaperTypeTabs
              value={selectedType}
              onChange={(type) => {
                setSelectedType(type);
                resetEntryForType(type);
              }}
            />
          ) : null}

          <View style={[styles.formArea, isEditMode && styles.formAreaEditing]}>
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
          </View>

          <View style={styles.footerContainer}>
            {isEditMode ? (
              <View style={styles.editFooterRow}>
                <View style={styles.footerButton}>
                  <PrimaryButton
                    title={t("Delete")}
                    variant="destructive"
                    onPress={handleRequestDelete}
                  />
                </View>

                <View style={styles.footerButton}>
                  <PrimaryButton
                    title={t("Save changes")}
                    onPress={handleSave}
                    disabled={!canSave}
                  />
                </View>
              </View>
            ) : (
              <PrimaryButton
                title={
                  selectedType === "diaper" ? t("Save diaper") : t("Save potty")
                }
                onPress={handleSave}
                disabled={!canSave}
              />
            )}
          </View>
        </BottomSheetScrollView>
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

    /*
     * Aucun `flex: 1` ni `flexGrow` ici : en dimensionnement dynamique, c’est
     * le contenu qui donne sa hauteur à la sheet, pas l’inverse.
     */
    scrollContent: {
      paddingBottom: 0,
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
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 20,
    },

    // Sans les onglets, le formulaire respire un peu plus sous le titre.
    formAreaEditing: {
      paddingTop: 30,
    },

    footerContainer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 14,

      borderTopWidth: 1,
      borderTopColor: colors.border,

      backgroundColor: colors.white,
    },

    editFooterRow: {
      width: "100%",

      flexDirection: "row",
      alignItems: "center",

      gap: 10,
    },

    footerButton: {
      flex: 1,
      minWidth: 0,
    },
  });
}
