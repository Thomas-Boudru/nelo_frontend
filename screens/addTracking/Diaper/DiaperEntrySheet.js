import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";

import NoteSheet from "../Feeding/NoteSheet.js";
import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import TrackingHistoryButton from "../../../components/addTracking/TrackingHistoryButton.js";

import DiaperTypeTabs from "../../../components/addTracking/diaper/DiaperHypeTabs.js";
import DiaperForm from "../../../components/addTracking/diaper/DiaperForm.js";
import PottyForm from "../../../components/addTracking/diaper/PottyForm.js";

import { useThemeColors } from "../../../theme/useThemeColors.js";

import { useAuth } from "../../../auth/AuthProvider.js";

import {
  createLocalToiletingEntry,
  updateLocalToiletingEntry,
} from "../../../database/tracking/diaper/toiletingRepository.js";

import { processSyncQueue } from "../../../sync/processSyncQueue.js";

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
    childId,
    onSaveDiaper,
    onSavePotty,

    onRequestDelete,
    onPressHistory,
  },
  ref,
) {
  const { t } = useTranslation();

  const { user, accessToken, refreshSession } = useAuth();

  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

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

  /*
   * Hauteur fixe plutôt que dimensionnement dynamique : c’est ce qui permet de
   * garder l’en-tête et le bouton d’enregistrement immobiles, et de ne faire
   * défiler que le formulaire (même fonctionnement que la sheet d’allaitement).
   */
  const snapPoints = useMemo(() => ["92%"], []);

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
        pressBehavior={isSaving ? "none" : "close"}
        opacity={0.42}
      />
    ),
    [isSaving],
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
    if (!canSave || savingRef.current) {
      return;
    }

    if (!user?.id || !childId) {
      Alert.alert(t("Unable to save entry"), t("Missing user ID or child ID."));
      return;
    }

    if (
      isEditMode &&
      (!editingEntry?.id || editingEntry.type !== selectedType)
    ) {
      Alert.alert(
        t("Unable to save entry"),
        t("The entry could not be identified. Reopen it and try again."),
      );
      return;
    }

    savingRef.current = true;
    setIsSaving(true);

    const type = selectedType;
    const mode = isEditMode ? "edit" : "create";
    const entryId = editingEntry?.id;
    const form = type === "diaper" ? diaperEntry : pottyEntry;
    const dateField = type === "diaper" ? "diaperDate" : "pottyDate";

    const includesPoop =
      type === "diaper" && ["dirty", "wetAndDirty"].includes(form.content);

    const data = {
      content: form.content,
      // Retirer la consistance si l'on passe d'une couche sale à mouillée.
      consistency: includesPoop ? (form.consistency ?? null) : null,
      isAccident: type === "potty" ? form.isAccident : false,
      note: form.note ?? "",
      [dateField]:
        isEditMode || form.isDateEdited ? form[dateField] : new Date(),
    };

    try {
      const entry =
        mode === "edit"
          ? await updateLocalToiletingEntry({
              userId: user.id,
              childId,
              entryId,
              type,
              data,
            })
          : await createLocalToiletingEntry({
              userId: user.id,
              childId,
              type,
              data,
            });

      // La sauvegarde locale a réussi :
      // le parent actualise l'affichage et affiche la confirmation.
      try {
        const notifySaved = type === "diaper" ? onSaveDiaper : onSavePotty;

        await notifySaved?.({
          ...entry,
          mode,
          persistedLocally: true,
        });
      } catch (error) {
        console.error("Unable to display tracking confirmation:", error);
      }

      if (accessToken) {
        processSyncQueue({
          userId: user.id,
          accessToken,
          refreshSession,
        }).catch((error) => {
          console.error("Unable to synchronize toileting entry:", error);
        });
      }

      modalRef.current?.dismiss();
    } catch (error) {
      console.error("Unable to save toileting entry:", error);

      const message =
        error?.code === "TOILETING_SYNC_PENDING"
          ? "Wait for this entry to finish syncing before editing it."
          : error?.code === "TRACKING_VERSION_CONFLICT"
            ? "Resolve this entry's synchronization conflict before editing it."
            : "Check the selected date and try again.";

      Alert.alert(t("Unable to save entry"), t(message));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleOpenHistory = () => {
    modalRef.current?.dismiss();

    setTimeout(() => {
      onPressHistory?.(selectedType);
    }, 220);
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
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose={!isSaving}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <View style={styles.content} pointerEvents={isSaving ? "none" : "auto"}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>{title}</Text>

              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            <TrackingHistoryButton
              accessibilityLabel={t("View diaper history")}
              onPress={handleOpenHistory}
            />
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

          {/*
           * Seul le formulaire défile : l’en-tête, les onglets et le footer
           * restent fixes puisqu’ils vivent en dehors de ce scroll.
           */}
          <View style={[styles.formArea, isEditMode && styles.formAreaEditing]}>
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
                    title={isSaving ? t("Saving...") : t("Save changes")}
                    onPress={handleSave}
                    disabled={!canSave || isSaving}
                  />
                </View>
              </View>
            ) : (
              <PrimaryButton
                title={
                  isSaving
                    ? t("Saving...")
                    : selectedType === "diaper"
                      ? t("Save diaper")
                      : t("Save potty")
                }
                onPress={handleSave}
                disabled={!canSave || isSaving}
              />
            )}
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
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",

      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 18,
    },

    headerContent: {
      flex: 1,
      paddingRight: 12,
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

    // Sans les onglets, le formulaire respire un peu plus sous le titre.
    formAreaEditing: {
      paddingTop: 8,
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
