import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";

import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import DateTimeRow from "../../../components/addTracking/DateTimeRow.js";
import TrackingHistoryButton from "../../../components/addTracking/TrackingHistoryButton.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

import FeedingPhotoSourceSheet from "../Feeding/FeedingPhotoSourceSheet.js";

const MAX_PHOTOS = 5;
const MAX_NOTE_LENGTH = 1000;

function normalizePhotos(photos) {
  if (!Array.isArray(photos)) {
    return [];
  }

  return photos.filter((photo) => photo?.uri).slice(0, MAX_PHOTOS);
}

function createNoteStateFromTrackingEntry(entry) {
  const entryData = entry?.data ?? entry ?? {};

  const dateValue =
    entryData.notedAt ??
    entryData.noteDate ??
    entry?.notedAt ??
    entry?.noteDate ??
    entry?.occurredAt ??
    entry?.startedAt ??
    entry?.date;

  const parsedDate = dateValue ? new Date(dateValue) : null;

  const hasValidDate =
    parsedDate !== null && !Number.isNaN(parsedDate.getTime());

  return {
    note:
      entryData.note ??
      entryData.content ??
      entry?.note ??
      entry?.content ??
      "",

    photos: normalizePhotos(entryData.photos ?? entry?.photos ?? []),

    notedAt: hasValidDate ? parsedDate : new Date(),
    hasRecordedDate: hasValidDate,
  };
}

const NoteEntrySheet = forwardRef(function NoteEntrySheet(
  { onSave, onDismiss, onRequestDelete, onPressHistory },
  ref,
) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const modalRef = useRef(null);
  const photoSourceSheetRef = useRef(null);
  const photoSourceTimeoutRef = useRef(null);
  const shouldOpenPhotoSourceRef = useRef(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState([]);
  const [noteDate, setNoteDate] = useState(new Date());
  const [isNow, setIsNow] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [sheetMode, setSheetMode] = useState("create");
  const [editingEntry, setEditingEntry] = useState(null);

  const isEditMode = sheetMode === "edit";

  const remainingPhotoCount = MAX_PHOTOS - photos.length;

  const canSave = useMemo(
    () => Boolean(note.trim()) || photos.length > 0,
    [note, photos.length],
  );

  useEffect(() => {
    const keyboardShowSubscription = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
      },
    );

    const keyboardHideSubscription = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      },
    );

    return () => {
      keyboardShowSubscription.remove();
      keyboardHideSubscription.remove();

      if (photoSourceTimeoutRef.current) {
        clearTimeout(photoSourceTimeoutRef.current);
      }
    };
  }, []);

  const resetForm = useCallback(
    ({
      initialNote = "",
      initialPhotos = [],
      initialDate = new Date(),
      initialIsNow = true,
    } = {}) => {
      setNote(initialNote ?? "");
      setPhotos(normalizePhotos(initialPhotos));
      setNoteDate(
        initialDate instanceof Date ? initialDate : new Date(initialDate),
      );
      setIsNow(initialIsNow);
      setIsSaving(false);
    },
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      present(parameters = {}) {
        const {
          mode = "create",
          entry = null,

          note: initialNote = "",
          photos: initialPhotos = [],
          notedAt,
          openPhotoPicker = false,
        } = parameters;

        setSheetMode(mode);

        if (mode === "edit" && entry) {
          const nextState = createNoteStateFromTrackingEntry(entry);

          setEditingEntry(entry);

          resetForm({
            initialNote: nextState.note,
            initialPhotos: nextState.photos,
            initialDate: nextState.notedAt,
            initialIsNow: !nextState.hasRecordedDate,
          });
        } else {
          setEditingEntry(null);

          resetForm({
            initialNote,
            initialPhotos,
            initialDate: notedAt ? new Date(notedAt) : new Date(),
            initialIsNow: !notedAt,
          });
        }

        shouldOpenPhotoSourceRef.current = mode === "create" && openPhotoPicker;

        requestAnimationFrame(() => {
          modalRef.current?.present();
        });
      },

      dismiss() {
        Keyboard.dismiss();
        photoSourceSheetRef.current?.dismiss();
        modalRef.current?.dismiss();
      },
    }),
    [resetForm],
  );

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        /*
         * Clavier ouvert : le tap referme seulement le clavier plutôt que
         * toute la sheet, ce qui ferait perdre la note en cours de saisie.
         * `0` = on reste sur le détent courant, donc rien ne bouge.
         */
        pressBehavior={keyboardVisible ? 0 : "close"}
        onPress={Keyboard.dismiss}
        opacity={0.35}
      />
    ),
    [keyboardVisible],
  );

  const handleSheetChange = useCallback((index) => {
    if (index < 0 || !shouldOpenPhotoSourceRef.current) {
      return;
    }

    shouldOpenPhotoSourceRef.current = false;

    if (photoSourceTimeoutRef.current) {
      clearTimeout(photoSourceTimeoutRef.current);
    }

    photoSourceTimeoutRef.current = setTimeout(() => {
      photoSourceSheetRef.current?.present();
    }, 250);
  }, []);

  const handleSheetDismiss = useCallback(() => {
    Keyboard.dismiss();

    shouldOpenPhotoSourceRef.current = false;
    setIsSaving(false);

    if (photoSourceTimeoutRef.current) {
      clearTimeout(photoSourceTimeoutRef.current);
      photoSourceTimeoutRef.current = null;
    }

    onDismiss?.();
  }, [onDismiss]);

  const handleChangeDate = useCallback((nextDate) => {
    if (!nextDate) {
      return;
    }

    setNoteDate(nextDate);
    setIsNow(false);
  }, []);

  const handleOpenPhotoSource = useCallback(() => {
    if (remainingPhotoCount <= 0) {
      return;
    }

    Keyboard.dismiss();
    Haptics.selectionAsync().catch(() => {});

    if (photoSourceTimeoutRef.current) {
      clearTimeout(photoSourceTimeoutRef.current);
    }

    photoSourceTimeoutRef.current = setTimeout(
      () => {
        photoSourceSheetRef.current?.present();
      },
      keyboardVisible ? 180 : 0,
    );
  }, [keyboardVisible, remainingPhotoCount]);

  const handlePhotosSelected = useCallback((selectedPhotos = []) => {
    if (!selectedPhotos.length) {
      return false;
    }

    setPhotos((currentPhotos) => {
      const remainingPlaces = MAX_PHOTOS - currentPhotos.length;

      if (remainingPlaces <= 0) {
        return currentPhotos;
      }

      const existingPhotoKeys = new Set(
        currentPhotos.map((photo) => photo.id ?? photo.uri),
      );

      const uniquePhotos = selectedPhotos.filter((photo) => {
        const photoKey = photo?.id ?? photo?.uri;

        if (!photoKey || existingPhotoKeys.has(photoKey)) {
          return false;
        }

        existingPhotoKeys.add(photoKey);
        return true;
      });

      return [...currentPhotos, ...uniquePhotos.slice(0, remainingPlaces)];
    });

    return true;
  }, []);

  const handleRemovePhoto = useCallback((photoToRemove, photoIndex) => {
    Haptics.selectionAsync().catch(() => {});

    setPhotos((currentPhotos) =>
      currentPhotos.filter((photo, index) => {
        if (photoToRemove.id) {
          return photo.id !== photoToRemove.id;
        }

        return !(photo.uri === photoToRemove.uri && index === photoIndex);
      }),
    );
  }, []);

  const handleRequestDelete = useCallback(() => {
    if (!isEditMode || !editingEntry || isSaving) {
      return;
    }

    Keyboard.dismiss();
    onRequestDelete?.(editingEntry);
  }, [editingEntry, isEditMode, isSaving, onRequestDelete]);

  const handleOpenHistory = useCallback(() => {
    Keyboard.dismiss();

    modalRef.current?.dismiss();

    setTimeout(() => {
      onPressHistory?.("note");
    }, 220);
  }, [onPressHistory]);

  const handleSave = useCallback(async () => {
    if (!canSave || isSaving) {
      return;
    }

    Keyboard.dismiss();
    setIsSaving(true);

    try {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});

      await onSave?.({
        ...editingEntry,

        id: editingEntry?.id,

        type: "note",
        mode: sheetMode,

        note: note.trim(),
        photos,
        notedAt: noteDate,
      });

      modalRef.current?.dismiss();
    } catch (error) {
      console.error("Unable to save note:", error);
      setIsSaving(false);
    }
  }, [
    canSave,
    editingEntry,
    isSaving,
    note,
    noteDate,
    onSave,
    photos,
    sheetMode,
  ]);

  return (
    <>
      <BottomSheetModal
        ref={modalRef}
        index={0}
        stackBehavior="push"
        enableDynamicSizing
        enablePanDownToClose
        // Faire glisser la sheet referme aussi le clavier.
        enableBlurKeyboardOnGesture
        /*
         * « extend » plutôt que « interactive » : interactive remonte la sheet
         * de toute la hauteur du clavier, et comme le contenu + le clavier
         * dépassent l'écran, la position était écrêtée tout en haut.
         * Ici la sheet garde sa hauteur de contenu : le champ Note reste juste
         * au-dessus du clavier, qui recouvre seulement le bas du formulaire.
         */
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
        onChange={handleSheetChange}
        onDismiss={handleSheetDismiss}
      >
        {/*
         * Toute la sheet reste dans un seul BottomSheetView.
         * Aucun flex: 1 : sa hauteur est calculée depuis son contenu.
         */}
        <BottomSheetView
          style={[
            styles.sheet,
            keyboardVisible
              ? styles.sheetKeyboardVisible
              : styles.sheetKeyboardHidden,
          ]}
        >
          {/*
           * Un tap n'importe où dans la sheet, en dehors du champ et des
           * boutons, referme le clavier : les enfants pressables captent
           * le toucher avant ce Pressable, donc ils continuent de marcher.
           */}
          <View style={styles.header}>
            <Pressable
              accessible={false}
              onPress={Keyboard.dismiss}
              style={styles.headerContent}
            >
              <Text style={styles.title}>
                {isEditMode ? t("Edit note") : t("Add note")}
              </Text>

              <Text style={styles.subtitle}>
                {isEditMode
                  ? t("Update this note and its photos")
                  : t("Write down something you want to remember")}
              </Text>
            </Pressable>

            <TrackingHistoryButton
              accessibilityLabel={t("View notes history")}
              onPress={handleOpenHistory}
            />
          </View>

          <Pressable
            accessible={false}
            onPress={Keyboard.dismiss}
            style={styles.body}
          >
            <View style={styles.noteSection}>
              <Text style={styles.sectionTitle}>{t("Note")}</Text>

              <BottomSheetTextInput
                value={note}
                onChangeText={setNote}
                placeholder={t("Write something about your child")}
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={MAX_NOTE_LENGTH}
                textAlignVertical="top"
                style={styles.noteInput}
              />

              <Text style={styles.characterCounter}>
                {note.length}/{MAX_NOTE_LENGTH}
              </Text>
            </View>

            <View style={styles.photosSection}>
              <View style={styles.photosHeader}>
                <View>
                  <Text style={styles.sectionTitle}>{t("Photos")}</Text>

                  <Text style={styles.photosDescription}>
                    {t("Add up to five photos")}
                  </Text>
                </View>

                <Text style={styles.photosCounter}>
                  {photos.length}/{MAX_PHOTOS}
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.photosList}
              >
                {photos.map((photo, index) => {
                  const photoKey = photo.id ?? `${photo.uri}-${index}`;

                  return (
                    <View key={photoKey} style={styles.photoContainer}>
                      <Image
                        source={{ uri: photo.uri }}
                        resizeMode="cover"
                        style={styles.photo}
                      />

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("Remove photo")}
                        hitSlop={8}
                        onPress={() => handleRemovePhoto(photo, index)}
                        style={({ pressed }) => [
                          styles.removePhotoButton,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Ionicons name="close" size={13} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  );
                })}

                {remainingPhotoCount > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("Add a photo")}
                    onPress={handleOpenPhotoSource}
                    style={({ pressed }) => [
                      styles.addPhotoButton,
                      pressed && styles.addPhotoButtonPressed,
                    ]}
                  >
                    <View style={styles.addPhotoIcon}>
                      <Ionicons
                        name="images-outline"
                        size={23}
                        color={colors.primary}
                      />

                      <View style={styles.addPhotoBadge}>
                        <Ionicons name="add" size={11} color="#FFFFFF" />
                      </View>
                    </View>

                    <Text style={styles.addPhotoLabel}>{t("Add")}</Text>
                  </Pressable>
                ) : null}
              </ScrollView>
            </View>

            <View style={styles.dateSection}>
              <DateTimeRow
                value={noteDate}
                isNow={isNow}
                onChange={handleChangeDate}
                title="Note date"
                emptyLabel="Now"
                maximumDate={new Date()}
              />
            </View>
          </Pressable>

          <View style={styles.footer}>
            {isEditMode ? (
              <View style={styles.editFooterRow}>
                <View style={styles.footerButton}>
                  <PrimaryButton
                    title={t("Delete")}
                    variant="destructive"
                    onPress={handleRequestDelete}
                    disabled={isSaving}
                  />
                </View>

                <View style={styles.footerButton}>
                  <PrimaryButton
                    title={t("Save changes")}
                    onPress={handleSave}
                    disabled={!canSave || isSaving}
                    loading={isSaving}
                  />
                </View>
              </View>
            ) : (
              <PrimaryButton
                title={t("Save note")}
                onPress={handleSave}
                disabled={!canSave || isSaving}
                loading={isSaving}
              />
            )}
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      <FeedingPhotoSourceSheet
        ref={photoSourceSheetRef}
        remainingPhotoCount={remainingPhotoCount}
        onPhotosSelected={handlePhotosSelected}
      />
    </>
  );
});

export default NoteEntrySheet;

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

    /*
     * Pas de flex: 1 ici, sinon la hauteur dynamique
     * de BottomSheetModal risque d'être incorrecte.
     */
    sheet: {
      paddingTop: 4,
    },

    sheetKeyboardHidden: {
      paddingBottom: 8,
    },

    sheetKeyboardVisible: {
      paddingBottom: 0,
    },

    header: {
      flexShrink: 0,
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 17,
    },

    headerContent: {
      flex: 1,
      paddingRight: 12,
    },

    title: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 25,
    },

    subtitle: {
      marginTop: 4,
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      lineHeight: 20,
    },

    body: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },

    noteSection: {
      position: "relative",
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

    sectionTitle: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
    },

    noteInput: {
      minHeight: 120,
      maxHeight: 190,
      marginTop: 9,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.lightBlue,
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      lineHeight: 21,
      paddingHorizontal: 14,
      paddingTop: 13,
      paddingBottom: 31,
    },

    characterCounter: {
      position: "absolute",
      right: 12,
      bottom: 10,
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
    },

    photosSection: {
      marginTop: 20,
    },

    photosHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },

    photosDescription: {
      marginTop: 3,
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
    },

    photosCounter: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 11,
    },

    photosList: {
      gap: 11,
      paddingHorizontal: 5,
      paddingTop: 5,
      paddingBottom: 2,
    },

    photoContainer: {
      position: "relative",
      width: 78,
      height: 78,
    },

    photo: {
      width: "100%",
      height: "100%",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.lightBlue,
    },

    removePhotoButton: {
      position: "absolute",
      top: -5,
      right: -5,
      width: 22,
      height: 22,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.white,
      borderRadius: 11,
      backgroundColor: "rgba(9, 43, 86, 0.82)",
    },

    addPhotoButton: {
      width: 78,
      height: 78,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.lightBlue,
    },

    addPhotoButtonPressed: {
      borderColor: colors.primary,
      backgroundColor: colors.selectedBackground,
      opacity: 0.8,
    },

    addPhotoIcon: {
      position: "relative",
    },

    addPhotoBadge: {
      position: "absolute",
      top: -7,
      right: -8,
      width: 18,
      height: 18,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.white,
      borderRadius: 9,
      backgroundColor: colors.primary,
    },

    addPhotoLabel: {
      marginTop: 7,
      color: colors.primary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 10,
    },

    dateSection: {
      /*
       * Séparation plus forte : la date est une métadonnée,
       * alors que le texte et les photos forment le contenu.
       */
      marginTop: 38,
    },

    footer: {
      flexShrink: 0,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.white,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
    },

    pressed: {
      opacity: 0.72,
    },
  });
}
