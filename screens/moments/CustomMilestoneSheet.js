import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";

import PrimaryButton from "../../components/ui/PrimaryButton.js";
import ConfirmActionSheet from "../ConfirmActionSheet.js";

import { useThemeColors } from "../../theme/useThemeColors.js";

export const CUSTOM_MILESTONE_CATEGORIES = [
  {
    id: "development",
    label: "Development",
  },
  {
    id: "feeding",
    label: "Feeding",
  },
  {
    id: "sleep",
    label: "Sleep",
  },
  {
    id: "growth",
    label: "Growth and health",
  },
  {
    id: "daily-life",
    label: "Daily life",
  },
];

const CustomMilestoneSheet = forwardRef(function CustomMilestoneSheet(
  { existingMilestones = [], onSave, onDelete, onSaved, onDeleted },
  ref,
) {
  const { t } = useTranslation();

  const modalRef = useRef(null);
  const confirmActionSheetRef = useRef(null);
  const nameInputRef = useRef(null);

  const colors = useThemeColors();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [mode, setMode] = useState("create");
  const [editingMilestone, setEditingMilestone] = useState(null);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(null);

  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isEditMode = mode === "edit" && editingMilestone !== null;

  const normalizedName = name.trim();

  const duplicateMilestone = useMemo(() => {
    if (!normalizedName || !categoryId) {
      return null;
    }

    const normalizedSearchName = normalizedName.toLocaleLowerCase();

    return existingMilestones.find(
      (milestone) =>
        !milestone.deletedAt &&
        milestone.id !== editingMilestone?.id &&
        milestone.categoryId === categoryId &&
        milestone.label?.trim().toLocaleLowerCase() === normalizedSearchName,
    );
  }, [categoryId, editingMilestone?.id, existingMilestones, normalizedName]);

  const hasChanges =
    !isEditMode ||
    normalizedName !== editingMilestone?.label ||
    categoryId !== editingMilestone?.categoryId;

  const canSave =
    normalizedName.length > 0 &&
    categoryId !== null &&
    !duplicateMilestone &&
    hasChanges &&
    !isSaving &&
    !isDeleting;

  const resetSheet = useCallback(() => {
    setMode("create");
    setEditingMilestone(null);
    setName("");
    setCategoryId(null);
    setError("");
    setIsSaving(false);
    setIsDeleting(false);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      present({ mode: nextMode = "create", milestone = null } = {}) {
        const isEditing = nextMode === "edit" && milestone !== null;

        setMode(isEditing ? "edit" : "create");

        setEditingMilestone(isEditing ? milestone : null);

        setName(isEditing ? (milestone.label ?? "") : "");

        setCategoryId(isEditing ? (milestone.categoryId ?? null) : null);

        setError("");
        setIsSaving(false);
        setIsDeleting(false);

        requestAnimationFrame(() => {
          modalRef.current?.present();

          setTimeout(() => {
            nameInputRef.current?.focus();
          }, 250);
        });
      },

      dismiss() {
        if (isSaving || isDeleting) {
          return;
        }

        modalRef.current?.dismiss();
      },
    }),
    [isDeleting, isSaving],
  );

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={isSaving || isDeleting ? "none" : "close"}
        opacity={0.42}
      />
    ),
    [isDeleting, isSaving],
  );

  function handleNameChange(value) {
    setName(value);

    if (error) {
      setError("");
    }
  }

  function handleSelectCategory(nextCategoryId) {
    setCategoryId(nextCategoryId);

    if (error) {
      setError("");
    }
  }

  async function handleSave() {
    if (!canSave) {
      return;
    }

    Keyboard.dismiss();
    setError("");

    const now = new Date().toISOString();

    const milestonePayload = isEditMode
      ? {
          ...editingMilestone,
          label: normalizedName,
          categoryId,
          icon: "heart-outline",
          isCustom: true,
          updatedAt: now,
          deletedAt: null,
        }
      : {
          label: normalizedName,
          categoryId,
          icon: "heart-outline",
          isCustom: true,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };

    try {
      setIsSaving(true);

      const savedMilestone = await onSave?.({
        mode,
        milestone: milestonePayload,
      });

      if (savedMilestone === false) {
        return;
      }

      const finalMilestone =
        savedMilestone && typeof savedMilestone === "object"
          ? savedMilestone
          : milestonePayload;

      modalRef.current?.dismiss();

      onSaved?.({
        mode,
        milestone: finalMilestone,
      });
    } catch (saveError) {
      console.error("Unable to save custom milestone", saveError);

      setError(
        saveError?.message ||
          t("Unable to save this milestone. Please try again."),
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleDeletePress() {
    if (!isEditMode || !editingMilestone || isDeleting) {
      return;
    }

    Keyboard.dismiss();

    confirmActionSheetRef.current?.present({
      title: t("Delete custom milestone"),
      description: t(
        "This milestone will no longer appear in your list. Previously created moments will not be deleted.",
      ),
      confirmLabel: t("Delete"),
      cancelLabel: t("Cancel"),
      errorMessage: t("Unable to delete this milestone. Please try again."),
      icon: "trash-outline",
      variant: "destructive",
      onConfirm: handleConfirmDelete,
    });
  }

  async function handleConfirmDelete() {
    if (!editingMilestone || isDeleting) {
      return false;
    }

    try {
      setIsDeleting(true);
      setError("");

      const deletedMilestone = {
        ...editingMilestone,
        deletedAt: new Date().toISOString(),
      };

      const deleted = await onDelete?.({
        milestone: deletedMilestone,
      });

      if (deleted === false) {
        return false;
      }

      modalRef.current?.dismiss();

      onDeleted?.({
        milestone: deletedMilestone,
      });

      return true;
    } catch (deleteError) {
      console.error("Unable to delete custom milestone", deleteError);

      throw new Error(
        deleteError?.message ||
          t("Unable to delete this milestone. Please try again."),
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <BottomSheetModal
        ref={modalRef}
        index={0}
        enableDynamicSizing
        maxDynamicContentSize={650}
        stackBehavior="push"
        enablePanDownToClose={!isSaving && !isDeleting}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        enableBlurKeyboardOnGesture
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleStyle={styles.handle}
        handleIndicatorStyle={styles.handleIndicator}
        onDismiss={resetSheet}
      >
        <BottomSheetView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isEditMode
                ? t("Edit custom milestone")
                : t("New custom milestone")}
            </Text>

            <Text style={styles.description}>
              {isEditMode
                ? t("Change the name or category of this milestone.")
                : t("Create a milestone that is unique to your family.")}
            </Text>
          </View>

          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>{t("Milestone name")}</Text>

            <BottomSheetTextInput
              ref={nameInputRef}
              value={name}
              onChangeText={handleNameChange}
              placeholder={t("For example: First time standing")}
              placeholderTextColor={colors.textSecondary}
              editable={!isSaving && !isDeleting}
              autoCapitalize="sentences"
              autoCorrect
              returnKeyType="done"
              maxLength={80}
              selectionColor={colors.primary}
              onSubmitEditing={() => {
                if (canSave) {
                  handleSave();
                }
              }}
              style={styles.input}
            />
          </View>

          <View style={styles.categorySection}>
            <Text style={styles.fieldLabel}>{t("Category")}</Text>

            <View accessibilityRole="radiogroup" style={styles.categoryOptions}>
              {CUSTOM_MILESTONE_CATEGORIES.map((category) => {
                const isSelected = categoryId === category.id;

                return (
                  <Pressable
                    key={category.id}
                    accessibilityRole="radio"
                    accessibilityLabel={t(category.label)}
                    accessibilityState={{
                      selected: isSelected,
                    }}
                    disabled={isSaving || isDeleting}
                    onPress={() => handleSelectCategory(category.id)}
                    style={({ pressed }) => [
                      styles.categoryPill,
                      isSelected && styles.categoryPillSelected,
                      pressed && styles.categoryPillPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        isSelected && styles.categoryPillTextSelected,
                      ]}
                    >
                      {t(category.label)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {duplicateMilestone ? (
            <Text style={styles.errorText}>
              {t("A milestone with this name already exists in this category.")}
            </Text>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <View style={[styles.actions, !isEditMode && styles.singleAction]}>
            {isEditMode ? (
              <PrimaryButton
                title={t("Delete")}
                variant="destructive"
                disabled={isSaving || isDeleting}
                onPress={handleDeletePress}
                style={styles.actionButton}
              />
            ) : null}

            <PrimaryButton
              title={isEditMode ? t("Save changes") : t("Add milestone")}
              loading={isSaving}
              disabled={!canSave}
              onPress={handleSave}
              style={isEditMode ? styles.actionButton : undefined}
            />
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      <ConfirmActionSheet ref={confirmActionSheetRef} />
    </>
  );
});

export default CustomMilestoneSheet;

const createStyles = (colors) =>
  StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
    },

    handle: {
      paddingTop: 10,
      paddingBottom: 5,
    },

    handleIndicator: {
      width: 42,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.textSecondary,
      opacity: 0.24,
    },

    container: {
      paddingHorizontal: 22,
      paddingTop: 4,
      paddingBottom: 24,
    },

    header: {
      paddingTop: 6,
    },

    title: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 21,
      lineHeight: 29,
    },

    description: {
      maxWidth: 350,
      marginTop: 5,
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 19,
    },

    fieldSection: {
      marginTop: 22,
    },

    fieldLabel: {
      marginBottom: 9,
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 13,
      lineHeight: 19,
    },

    input: {
      height: 54,
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 17,
      backgroundColor: colors.lightBlue,
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
    },

    categorySection: {
      marginTop: 20,
    },

    categoryOptions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },

    categoryPill: {
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 13,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: colors.lightBackground || colors.background,
    },

    categoryPillSelected: {
      backgroundColor: colors.selectedBackground,
    },

    categoryPillPressed: {
      opacity: 0.65,
    },

    categoryPillText: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      lineHeight: 18,
    },

    categoryPillTextSelected: {
      color: colors.primary,
      fontFamily: "PlusJakartaSans_700Bold",
    },

    errorText: {
      marginTop: 14,
      color: colors.error,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,
    },

    actions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 24,
    },

    singleAction: {
      display: "flex",
    },

    actionButton: {
      flex: 1,
    },
  });
