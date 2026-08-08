import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";

import BackButton from "../../components/ui/BackButton.js";
import PrimaryButton from "../../components/ui/PrimaryButton.js";
import DateField from "../../components/onboarding/DateField.js";
import FormField from "../../components/onboarding/FormField.js";

import { useThemeColors } from "../../theme/useThemeColors.js";
import { useToast } from "../../components/ui/toast/useToast.js";
import { radius, spacing } from "../../theme/index.js";

const MOMENT_CONFIG = {
  photo: {
    icon: "images-outline",
    title: "Add photos",
    description: "Save photos and the story behind them",
  },

  note: {
    icon: "create-outline",
    title: "Add a note",
    description: "Write down a little memory or anecdote",
  },

  milestone: {
    icon: "star-outline",
    title: "Add a milestone",
    description: "Save an important first or achievement",
  },
};

export default function MomentEditorScreen({ navigation, route }) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    mode = "create",
    type = "note",
    childId,
    childName = "Emma",
    moment = null,
  } = route?.params ?? {};

  const momentType = MOMENT_CONFIG[type] ? type : "note";
  const config = MOMENT_CONFIG[momentType];

  const isEditing = mode === "edit";

  const [photos, setPhotos] = useState(
    moment?.photos?.map((photo, index) => ({
      id: photo.id ?? `existing-${index}`,
      uri: photo.uri,
    })) ?? [],
  );

  const [title, setTitle] = useState(moment?.title ?? "");
  const [content, setContent] = useState(moment?.description ?? "");

  const [selectedMilestone, setSelectedMilestone] = useState(
    moment?.milestone ?? null,
  );

  const [momentDate, setMomentDate] = useState(() => {
    if (!moment?.happenedAt) {
      return new Date();
    }

    const parsedDate = new Date(moment.happenedAt);

    return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  });

  const [temporaryDate, setTemporaryDate] = useState(momentDate);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPickingPhotos, setIsPickingPhotos] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardShowEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";

    const keyboardHideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(keyboardShowEvent, () =>
      setIsKeyboardVisible(true),
    );

    const hideSubscription = Keyboard.addListener(keyboardHideEvent, () =>
      setIsKeyboardVisible(false),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const milestone = route?.params?.selectedMilestone;

    if (!milestone) {
      return;
    }

    setSelectedMilestone(milestone);

    navigation.setParams({
      selectedMilestone: undefined,
    });
  }, [navigation, route?.params?.selectedMilestone]);

  const formattedMomentDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(i18n.language, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(momentDate);
    } catch {
      return momentDate.toLocaleDateString();
    }
  }, [i18n.language, momentDate]);

  const photoError =
    hasSubmitted && momentType === "photo" && photos.length === 0
      ? t("Please add at least one photo.")
      : "";

  const noteError =
    hasSubmitted && momentType === "note" && !content.trim()
      ? t("Please write something about this moment.")
      : "";

  const milestoneError =
    hasSubmitted && momentType === "milestone" && !selectedMilestone
      ? t("Please select a milestone.")
      : "";

  const isFormValid =
    (momentType !== "photo" || photos.length > 0) &&
    (momentType !== "note" || content.trim().length > 0) &&
    (momentType !== "milestone" || Boolean(selectedMilestone));

  const screenTitle = isEditing ? t("Edit moment") : t(config.title);

  async function handleChoosePhotos() {
    if (isPickingPhotos || isSaving) {
      return;
    }

    setIsPickingPhotos(true);

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showToast({
          type: "error",
          title: t("Photo access required"),
          message: t("Allow access to your photo library to add memories."),
        });

        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: Math.max(1, 6 - photos.length),
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const selectedPhotos = result.assets.map((asset, index) => ({
        id: `${Date.now()}-${index}`,
        uri: asset.uri,
        width: asset.width ?? null,
        height: asset.height ?? null,
        mimeType: asset.mimeType ?? null,
        fileName: asset.fileName ?? null,
        fileSize: asset.fileSize ?? null,
      }));

      setPhotos((currentPhotos) =>
        [...currentPhotos, ...selectedPhotos].slice(0, 6),
      );
    } catch (error) {
      showToast({
        type: "error",
        title: t("Unable to open the photo library"),
        message: error?.message ?? t("Please try again in a moment."),
      });
    } finally {
      setIsPickingPhotos(false);
    }
  }

  function handleRemovePhoto(photoId) {
    if (isSaving) {
      return;
    }

    setPhotos((currentPhotos) =>
      currentPhotos.filter((photo) => photo.id !== photoId),
    );
  }

  function handleOpenMilestonePicker() {
    navigation.navigate("MilestonePicker", {
      selectedMilestoneId: selectedMilestone?.id ?? null,
      editorParams: {
        mode,
        type,
        childId,
        childName,
        moment,
      },
    });
  }
  function handleOpenDatePicker() {
    Keyboard.dismiss();
    setTemporaryDate(momentDate);
    setShowDatePicker(true);
  }

  function handleDateChange(event, selectedDate) {
    if (Platform.OS === "android") {
      setShowDatePicker(false);

      if (event.type === "dismissed" || !selectedDate) {
        return;
      }

      setMomentDate(selectedDate);
      return;
    }

    if (selectedDate) {
      setTemporaryDate(selectedDate);
    }
  }

  function handleConfirmDate() {
    setMomentDate(temporaryDate);
    setShowDatePicker(false);
  }

  function handleCancelDate() {
    setShowDatePicker(false);
  }

  async function handleSave() {
    setHasSubmitted(true);

    if (!isFormValid || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const momentPayload = {
        id: moment?.id ?? null,
        childId,
        type: momentType,

        title:
          momentType === "note" ? title.trim() || null : title.trim() || null,

        description: content.trim() || null,

        photos:
          momentType === "photo" || momentType === "milestone" ? photos : [],

        milestone: momentType === "milestone" ? selectedMilestone : null,

        happenedAt: momentDate.toISOString(),
      };

      /*
       * Plus tard :
       *
       * if (isEditing) {
       *   await api.patch(
       *     `/moments/${moment.id}`,
       *     momentPayload,
       *   );
       * } else {
       *   await api.post(
       *     `/children/${childId}/moments`,
       *     momentPayload,
       *   );
       * }
       *
       * Les images devront idéalement être envoyées
       * séparément avec FormData.
       */

      console.log("Save moment:", momentPayload);

      showToast({
        type: "success",
        title: isEditing ? t("Moment updated") : t("Moment added"),
        message: isEditing
          ? t("Your changes have been saved.")
          : t("This moment has been added to child story", {
              childName,
            }),
      });

      navigation.goBack();
    } catch (error) {
      showToast({
        type: "error",
        title: isEditing
          ? t("Unable to update moment")
          : t("Unable to add moment"),
        message: error?.message ?? t("Please try again in a moment."),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.screen}>
          <View style={styles.header}>
            <BackButton onPress={() => navigation.goBack()} />

            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {screenTitle}
              </Text>

              <Text style={styles.headerDescription} numberOfLines={1}>
                {t(config.description)}
              </Text>
            </View>

            <View style={styles.headerPlaceholder} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              isKeyboardVisible && styles.scrollContentWithKeyboard,
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            showsVerticalScrollIndicator={false}
          >
            <MomentTypeBadge
              type={momentType}
              colors={colors}
              styles={styles}
              t={t}
            />

            {momentType === "photo" ? (
              <PhotoFields
                photos={photos}
                error={photoError}
                isBusy={isPickingPhotos || isSaving}
                onChoosePhotos={handleChoosePhotos}
                onRemovePhoto={handleRemovePhoto}
                colors={colors}
                styles={styles}
                t={t}
              />
            ) : null}

            {momentType === "milestone" ? (
              <>
                <MilestoneField
                  milestone={selectedMilestone}
                  error={milestoneError}
                  disabled={isSaving}
                  onPress={handleOpenMilestonePicker}
                  colors={colors}
                  styles={styles}
                  t={t}
                />

                <OptionalPhotoField
                  photos={photos}
                  isBusy={isPickingPhotos || isSaving}
                  onChoosePhotos={handleChoosePhotos}
                  onRemovePhoto={handleRemovePhoto}
                  colors={colors}
                  styles={styles}
                  t={t}
                />
              </>
            ) : null}

            {momentType !== "note" ? (
              <FormField
                label={t("Title")}
                value={title}
                onChangeText={setTitle}
                placeholder={
                  momentType === "milestone"
                    ? t("Add a personal title")
                    : t("Give this moment a title")
                }
                helperText={t("Optional")}
                iconName="text-outline"
                maxLength={80}
                autoCapitalize="sentences"
                editable={!isSaving}
              />
            ) : (
              <FormField
                label={t("Title")}
                value={title}
                onChangeText={setTitle}
                placeholder={t("Give this note a title")}
                helperText={t("Optional")}
                iconName="text-outline"
                maxLength={80}
                autoCapitalize="sentences"
                editable={!isSaving}
              />
            )}

            <MomentTextField
              label={
                momentType === "note"
                  ? t("What happened?")
                  : t("Tell the story")
              }
              placeholder={
                momentType === "note"
                  ? t("Write down this little memory...")
                  : t("Add a caption or a few words...")
              }
              value={content}
              error={noteError}
              required={momentType === "note"}
              disabled={isSaving}
              onChangeText={setContent}
              colors={colors}
              styles={styles}
            />

            <DateField
              label={t("When did this happen?")}
              value={formattedMomentDate}
              placeholder={t("Select a date")}
              helperText={t("You can also add memories from the past.")}
              onPress={handleOpenDatePicker}
              disabled={isSaving}
              required
            />

            <View style={styles.authorRow}>
              <View style={styles.authorIconContainer}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>

              <View style={styles.authorTextContainer}>
                <Text style={styles.authorLabel}>{t("Added by")}</Text>

                <Text style={styles.authorName}>{t("You")}</Text>
              </View>
            </View>
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                paddingBottom: isKeyboardVisible
                  ? spacing.xs
                  : Math.max(insets.bottom, spacing.sm),
              },
            ]}
          >
            <PrimaryButton
              title={isEditing ? t("Save changes") : t("Save moment")}
              loading={isSaving}
              disabled={isSaving}
              onPress={handleSave}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      {Platform.OS === "ios" ? (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={handleCancelDate}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={handleCancelDate}
            />

            <View style={styles.dateModal}>
              <View style={styles.modalHeader}>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleCancelDate}
                  hitSlop={10}
                >
                  <Text style={styles.cancelButton}>{t("Cancel")}</Text>
                </Pressable>

                <Text style={styles.modalTitle}>
                  {t("Select the moment date")}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={handleConfirmDate}
                  hitSlop={10}
                >
                  <Text style={styles.confirmButton}>{t("Confirm")}</Text>
                </Pressable>
              </View>

              <DateTimePicker
                value={temporaryDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={handleDateChange}
                style={styles.datePicker}
              />
            </View>
          </View>
        </Modal>
      ) : showDatePicker ? (
        <DateTimePicker
          value={temporaryDate}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={handleDateChange}
        />
      ) : null}
    </SafeAreaView>
  );
}

function MomentTypeBadge({ type, colors, styles, t }) {
  const config = {
    photo: {
      icon: "images-outline",
      label: "Photo moment",
    },
    note: {
      icon: "create-outline",
      label: "Note",
    },
    milestone: {
      icon: "star-outline",
      label: "Milestone",
    },
  }[type];

  return (
    <View style={styles.typeBadge}>
      <Ionicons name={config.icon} size={17} color={colors.primary} />

      <Text style={styles.typeBadgeText}>{t(config.label)}</Text>
    </View>
  );
}

function PhotoFields({
  photos,
  error,
  isBusy,
  onChoosePhotos,
  onRemovePhoto,
  colors,
  styles,
  t,
}) {
  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={styles.fieldLabel}>
          {t("Photos")}
          <Text style={styles.required}> *</Text>
        </Text>

        <Text style={styles.optionalLabel}>
          {t("Up to count photos", {
            count: 6,
          })}
        </Text>
      </View>

      {photos.length > 0 ? (
        <View style={styles.photoGrid}>
          {photos.map((photo) => (
            <SelectedPhoto
              key={photo.id}
              photo={photo}
              disabled={isBusy}
              onRemove={() => onRemovePhoto(photo.id)}
              colors={colors}
              styles={styles}
              t={t}
            />
          ))}

          {photos.length < 6 ? (
            <AddPhotoTile
              disabled={isBusy}
              onPress={onChoosePhotos}
              colors={colors}
              styles={styles}
              t={t}
            />
          ) : null}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Choose photos")}
          disabled={isBusy}
          onPress={onChoosePhotos}
          style={({ pressed }) => [
            styles.emptyPhotoField,
            error && styles.fieldError,
            pressed && !isBusy && styles.emptyPhotoFieldPressed,
            isBusy && styles.disabled,
          ]}
        >
          <View style={styles.emptyPhotoIcon}>
            <Ionicons name="images-outline" size={28} color={colors.primary} />
          </View>

          <Text style={styles.emptyPhotoTitle}>{t("Choose photos")}</Text>

          <Text style={styles.emptyPhotoDescription}>
            {t("Select up to six photos from your library")}
          </Text>
        </Pressable>
      )}

      {error ? (
        <ErrorMessage message={error} colors={colors} styles={styles} />
      ) : null}
    </View>
  );
}

function OptionalPhotoField(props) {
  const { photos, isBusy, onChoosePhotos, onRemovePhoto, colors, styles, t } =
    props;

  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={styles.fieldLabel}>{t("Photos")}</Text>

        <Text style={styles.optionalLabel}>{t("Optional")}</Text>
      </View>

      {photos.length > 0 ? (
        <View style={styles.photoGrid}>
          {photos.map((photo) => (
            <SelectedPhoto
              key={photo.id}
              photo={photo}
              disabled={isBusy}
              onRemove={() => onRemovePhoto(photo.id)}
              colors={colors}
              styles={styles}
              t={t}
            />
          ))}

          {photos.length < 6 ? (
            <AddPhotoTile
              disabled={isBusy}
              onPress={onChoosePhotos}
              colors={colors}
              styles={styles}
              t={t}
            />
          ) : null}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Add photos")}
          disabled={isBusy}
          onPress={onChoosePhotos}
          style={({ pressed }) => [
            styles.optionalPhotoButton,
            pressed && !isBusy && styles.optionalPhotoButtonPressed,
            isBusy && styles.disabled,
          ]}
        >
          <Ionicons name="image-outline" size={21} color={colors.primary} />

          <Text style={styles.optionalPhotoText}>{t("Add photos")}</Text>

          <Ionicons name="add" size={20} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}

function SelectedPhoto({ photo, disabled, onRemove, colors, styles, t }) {
  return (
    <View style={styles.selectedPhotoContainer}>
      <Image
        source={{ uri: photo.uri }}
        resizeMode="cover"
        style={styles.selectedPhoto}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Remove photo")}
        disabled={disabled}
        onPress={onRemove}
        style={({ pressed }) => [
          styles.removePhotoButton,
          pressed && !disabled && styles.removePhotoButtonPressed,
        ]}
      >
        <Ionicons name="close" size={16} color={colors.white} />
      </Pressable>
    </View>
  );
}

function AddPhotoTile({ disabled, onPress, colors, styles, t }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("Add another photo")}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.addPhotoTile,
        pressed && !disabled && styles.addPhotoTilePressed,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons name="add" size={25} color={colors.primary} />

      <Text style={styles.addPhotoTileText}>{t("Add")}</Text>
    </Pressable>
  );
}

function MilestoneField({
  milestone,
  error,
  disabled,
  onPress,
  colors,
  styles,
  t,
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>
        {t("Milestone")}
        <Text style={styles.required}> *</Text>
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Choose a milestone")}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.milestoneField,
          error && styles.fieldError,
          pressed && !disabled && styles.milestoneFieldPressed,
          disabled && styles.disabled,
        ]}
      >
        <View style={styles.milestoneIconContainer}>
          <Ionicons
            name={milestone?.icon ?? "star-outline"}
            size={23}
            color={colors.primary}
          />
        </View>

        <View style={styles.milestoneTextContainer}>
          <Text
            style={[
              styles.milestoneValue,
              !milestone && styles.milestonePlaceholder,
            ]}
          >
            {milestone ? t(milestone.label) : t("Choose a milestone")}
          </Text>

          {milestone?.category ? (
            <Text style={styles.milestoneCategory}>
              {t(milestone.category)}
            </Text>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={20} color={colors.primary} />
      </Pressable>

      {error ? (
        <ErrorMessage message={error} colors={colors} styles={styles} />
      ) : null}
    </View>
  );
}

function MomentTextField({
  label,
  placeholder,
  value,
  error,
  required,
  disabled,
  onChangeText,
  colors,
  styles,
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>

      <View
        style={[
          styles.textAreaContainer,
          error && styles.fieldError,
          disabled && styles.disabled,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          editable={!disabled}
          multiline
          maxLength={600}
          textAlignVertical="top"
          style={styles.textArea}
        />

        <Text style={styles.characterCount}>{value.length}/600</Text>
      </View>

      {error ? (
        <ErrorMessage message={error} colors={colors} styles={styles} />
      ) : null}
    </View>
  );
}

function ErrorMessage({ message, colors, styles }) {
  return (
    <View style={styles.errorRow}>
      <Ionicons name="alert-circle-outline" size={17} color={colors.error} />

      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },

    keyboardView: {
      flex: 1,
    },

    screen: {
      flex: 1,
    },

    header: {
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
    },

    headerTextContainer: {
      flex: 1,
      minWidth: 0,
      marginHorizontal: 10,
      alignItems: "center",
    },

    headerTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 18,
      lineHeight: 24,
      textAlign: "center",
      color: colors.textPrimary,
    },

    headerDescription: {
      marginTop: 2,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 14,
      textAlign: "center",
      color: colors.textSecondary,
    },

    headerPlaceholder: {
      width: 42,
      height: 42,
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      gap: 24,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 34,
    },

    scrollContentWithKeyboard: {
      paddingBottom: 16,
    },

    typeBadge: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      minHeight: 34,
      paddingHorizontal: 12,
      borderRadius: 17,
      backgroundColor: colors.selectedBackground,
    },

    typeBadgeText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 11,
      lineHeight: 15,
      color: colors.primary,
    },

    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 9,
    },

    fieldLabel: {
      marginBottom: 9,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 16,
      lineHeight: 22,
      color: colors.textPrimary,
    },

    optionalLabel: {
      marginBottom: 9,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 17,
      color: colors.textSecondary,
    },

    required: {
      color: colors.primary,
    },

    emptyPhotoField: {
      minHeight: 178,
      alignItems: "center",
      justifyContent: "center",
      padding: 22,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.border,
      borderRadius: 22,
      backgroundColor: colors.white,
    },

    emptyPhotoFieldPressed: {
      borderColor: colors.primary,
      backgroundColor: colors.selectedBackground,
    },

    emptyPhotoIcon: {
      width: 56,
      height: 56,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 28,
      backgroundColor: colors.selectedBackground,
    },

    emptyPhotoTitle: {
      marginTop: 12,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 14,
      lineHeight: 20,
      color: colors.textPrimary,
    },

    emptyPhotoDescription: {
      marginTop: 4,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 17,
      textAlign: "center",
      color: colors.textSecondary,
    },

    photoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },

    selectedPhotoContainer: {
      position: "relative",
      width: "31%",
      aspectRatio: 1,
      borderRadius: 17,
      backgroundColor: colors.selectedBackground,
      overflow: "hidden",
    },

    selectedPhoto: {
      width: "100%",
      height: "100%",
    },

    removePhotoButton: {
      position: "absolute",
      top: 7,
      right: 7,
      width: 27,
      height: 27,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: `${colors.textPrimary}C8`,
    },

    removePhotoButtonPressed: {
      opacity: 0.7,
    },

    addPhotoTile: {
      width: "31%",
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.border,
      borderRadius: 17,
      backgroundColor: colors.white,
    },

    addPhotoTilePressed: {
      borderColor: colors.primary,
      backgroundColor: colors.selectedBackground,
    },

    addPhotoTileText: {
      marginTop: 4,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 10,
      lineHeight: 14,
      color: colors.primary,
    },

    optionalPhotoButton: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.white,
    },

    optionalPhotoButtonPressed: {
      borderColor: colors.primary,
      backgroundColor: colors.selectedBackground,
    },

    optionalPhotoText: {
      flex: 1,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,
      color: colors.textPrimary,
    },

    milestoneField: {
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.white,
    },

    milestoneFieldPressed: {
      borderColor: colors.primary,
    },

    milestoneIconContainer: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      borderRadius: 21,
      backgroundColor: colors.selectedBackground,
    },

    milestoneTextContainer: {
      flex: 1,
      minWidth: 0,
      marginRight: 10,
    },

    milestoneValue: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 19,
      color: colors.textPrimary,
    },

    milestonePlaceholder: {
      fontFamily: "PlusJakartaSans_500Medium",
      color: colors.textSecondary,
    },

    milestoneCategory: {
      marginTop: 2,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 14,
      color: colors.textSecondary,
    },

    textAreaContainer: {
      minHeight: 145,
      paddingHorizontal: 15,
      paddingTop: 13,
      paddingBottom: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.white,
    },

    textArea: {
      minHeight: 105,
      padding: 0,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 15,
      lineHeight: 23,
      color: colors.textPrimary,
    },

    characterCount: {
      marginTop: 6,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 14,
      textAlign: "right",
      color: colors.textSecondary,
    },

    fieldError: {
      borderColor: colors.error,
    },

    errorRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 7,
      marginTop: 8,
      paddingHorizontal: 2,
    },

    errorText: {
      flex: 1,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,
      color: colors.error,
    },

    authorRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 4,
    },

    authorIconContainer: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      borderRadius: 21,
      backgroundColor: colors.selectedBackground,
    },

    authorTextContainer: {
      flex: 1,
    },

    authorLabel: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 15,
      color: colors.textSecondary,
    },

    authorName: {
      marginTop: 1,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,
      color: colors.textPrimary,
    },

    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },

    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(29, 42, 71, 0.32)",
    },

    dateModal: {
      overflow: "hidden",
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingBottom: spacing.xl,
      backgroundColor: colors.white,
    },

    modalHeader: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    modalTitle: {
      flex: 1,
      marginHorizontal: spacing.sm,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      lineHeight: 21,
      textAlign: "center",
      color: colors.textPrimary,
    },

    cancelButton: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 15,
      color: colors.textSecondary,
    },

    confirmButton: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      color: colors.primary,
    },

    datePicker: {
      width: "100%",
      height: 220,
    },

    disabled: {
      opacity: 0.5,
    },
  });
