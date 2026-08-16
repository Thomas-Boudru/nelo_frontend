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

import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";
import FeedingPhotoSourceSheet from "../Feeding/FeedingPhotoSourceSheet.js";

const MAX_PHOTOS = 5;

const VaccineDetailsSheet = forwardRef(function VaccineDetailsSheet(
  { onSave },
  forwardedRef,
) {
  const { t } = useTranslation();

  const modalRef = useRef(null);
  const photoSourceSheetRef = useRef(null);
  const shouldOpenPhotoSourceRef = useRef(false);
  const photoSourceTimeoutRef = useRef(null);

  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState([]);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const hasNote = Boolean(note.trim());
  const hasPhotos = photos.length > 0;
  const hasDetails = hasNote || hasPhotos;
  const remainingPhotoCount = MAX_PHOTOS - photos.length;

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
    });

    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();

      if (photoSourceTimeoutRef.current) {
        clearTimeout(photoSourceTimeoutRef.current);
      }
    };
  }, []);

  useImperativeHandle(forwardedRef, () => ({
    present({
      note: currentNote = "",
      photos: currentPhotos = [],
      openPhotoPicker = false,
    } = {}) {
      setNote(currentNote);
      setPhotos(Array.isArray(currentPhotos) ? currentPhotos : []);

      shouldOpenPhotoSourceRef.current = openPhotoPicker;
      modalRef.current?.present();
    },

    dismiss() {
      photoSourceSheetRef.current?.dismiss();
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

  const handleSheetChange = useCallback((index) => {
    if (index < 0 || !shouldOpenPhotoSourceRef.current) {
      return;
    }

    shouldOpenPhotoSourceRef.current = false;

    if (photoSourceTimeoutRef.current) {
      clearTimeout(photoSourceTimeoutRef.current);
    }

    /*
     * On laisse le temps à la modale principale de terminer son ouverture
     * avant de présenter la sheet de sélection de la source.
     */
    photoSourceTimeoutRef.current = setTimeout(() => {
      photoSourceSheetRef.current?.present();
    }, 250);
  }, []);

  const handleDismiss = useCallback(() => {
    Keyboard.dismiss();

    shouldOpenPhotoSourceRef.current = false;

    if (photoSourceTimeoutRef.current) {
      clearTimeout(photoSourceTimeoutRef.current);
      photoSourceTimeoutRef.current = null;
    }
  }, []);

  const handleOpenPhotoSource = () => {
    if (remainingPhotoCount <= 0) {
      return;
    }

    Keyboard.dismiss();

    photoSourceTimeoutRef.current = setTimeout(
      () => {
        photoSourceSheetRef.current?.present();
      },
      keyboardVisible ? 180 : 0,
    );
  };

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
        const photoKey = photo.id ?? photo.uri;

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

  const handleRemovePhoto = (photoToRemove, photoIndex) => {
    setPhotos((currentPhotos) =>
      currentPhotos.filter((photo, index) => {
        if (photoToRemove.id) {
          return photo.id !== photoToRemove.id;
        }

        return !(photo.uri === photoToRemove.uri && index === photoIndex);
      }),
    );
  };

  const handleSave = () => {
    Keyboard.dismiss();

    onSave?.({
      note: note.trim(),
      photos,
    });

    modalRef.current?.dismiss();
  };

  const handleClear = () => {
    Keyboard.dismiss();

    setNote("");
    setPhotos([]);

    onSave?.({
      note: "",
      photos: [],
    });

    modalRef.current?.dismiss();
  };

  return (
    <>
      <BottomSheetModal
        ref={modalRef}
        index={0}
        stackBehavior="push"
        enablePanDownToClose
        enableDynamicSizing
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
        backdropComponent={renderBackdrop}
        onChange={handleSheetChange}
        onDismiss={handleDismiss}
      >
        <BottomSheetView
          style={[
            styles.content,
            keyboardVisible
              ? styles.contentKeyboardVisible
              : styles.contentKeyboardHidden,
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{t("Vaccine details")}</Text>

              <Text style={styles.description}>
                {t("Add an optional note or photo for this vaccine")}
              </Text>
            </View>
          </View>

          <View style={styles.noteSection}>
            <Text style={styles.sectionTitle}>{t("Note")}</Text>

            <BottomSheetTextInput
              value={note}
              onChangeText={setNote}
              placeholder={t(
                "For example, reaction observed after vaccination",
              )}
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={300}
              textAlignVertical="top"
              selectionColor={colors.primary}
              style={styles.input}
            />

            <Text style={styles.characterCounter}>{note.length}/300</Text>
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

          <View style={styles.footer}>
            {hasDetails ? (
              <View style={styles.footerButton}>
                <PrimaryButton
                  title={t("Remove")}
                  onPress={handleClear}
                  variant="destructive"
                />
              </View>
            ) : null}

            <View style={styles.footerButton}>
              <PrimaryButton title={t("Save")} onPress={handleSave} />
            </View>
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

export default VaccineDetailsSheet;

function createStyles(colors) {
  return StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,
      borderRadius: 30,
    },

    handle: {
      backgroundColor: colors.border,
      borderRadius: 999,
      height: 4,
      width: 38,
    },

    content: {
      paddingHorizontal: 20,
    },

    contentKeyboardHidden: {
      paddingBottom: 24,
    },

    contentKeyboardVisible: {
      paddingBottom: 8,
    },

    header: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 16,
      justifyContent: "space-between",
      paddingBottom: 18,
      paddingTop: 4,
    },

    headerText: {
      flex: 1,
    },

    title: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
    },

    description: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 19,
      marginTop: 5,
    },

    noteSection: {
      position: "relative",
    },

    sectionTitle: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
    },

    input: {
      backgroundColor: colors.lightBlue,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      lineHeight: 21,
      marginTop: 9,
      minHeight: 104,
      paddingBottom: 28,
      paddingHorizontal: 14,
      paddingTop: 13,
    },

    characterCounter: {
      bottom: 10,
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      position: "absolute",
      right: 12,
    },

    photosSection: {
      marginTop: 18,
    },

    photosHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 10,
    },

    photosDescription: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      marginTop: 3,
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
    },

    photoContainer: {
      height: 80,
      position: "relative",
      width: 80,
    },

    photo: {
      backgroundColor: colors.lightBlue,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      height: "100%",
      width: "100%",
    },

    removePhotoButton: {
      alignItems: "center",
      backgroundColor: "rgba(9, 43, 86, 0.82)",
      borderColor: colors.white,
      borderRadius: 11,
      borderWidth: 2,
      height: 22,
      justifyContent: "center",
      position: "absolute",
      right: -5,
      top: -5,
      width: 22,
    },

    addPhotoButton: {
      alignItems: "center",
      backgroundColor: colors.lightBlue,
      borderColor: colors.border,
      borderRadius: 16,
      borderStyle: "dashed",
      borderWidth: 1,
      height: 80,
      justifyContent: "center",
      width: 80,
    },

    addPhotoButtonPressed: {
      backgroundColor: colors.selectedBackground,
      borderColor: colors.primary,
      opacity: 0.8,
    },

    addPhotoIcon: {
      position: "relative",
    },

    addPhotoBadge: {
      alignItems: "center",
      backgroundColor: colors.primary,
      borderColor: colors.white,
      borderRadius: 9,
      borderWidth: 2,
      height: 18,
      justifyContent: "center",
      position: "absolute",
      right: -8,
      top: -7,
      width: 18,
    },

    addPhotoLabel: {
      color: colors.primary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 10,
      marginTop: 7,
    },

    footer: {
      flexDirection: "row",
      gap: 10,
      paddingTop: 20,
    },

    footerButton: {
      flex: 1,
    },

    pressed: {
      opacity: 0.72,
    },
  });
}
