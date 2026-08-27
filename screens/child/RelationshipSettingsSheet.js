import {
  forwardRef,
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
import { useTranslation } from "react-i18next";

import PrimaryButton from "../../components/ui/PrimaryButton.js";

import { radius, spacing } from "../../theme/index.js";
import { useThemeColors } from "../../theme/useThemeColors.js";

const RelationshipSettingsSheet = forwardRef(function RelationshipSettingsSheet(
  { childName, currentRelationship, isSaving = false, onSave, onSaved },
  ref,
) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const bottomSheetRef = useRef(null);

  const [relationship, setRelationship] = useState(currentRelationship || null);

  const [errorMessage, setErrorMessage] = useState("");

  const relationshipOptions = useMemo(
    () => [
      {
        value: "mother",
        label: t("Mother"),
      },
      {
        value: "father",
        label: t("Father"),
      },
      {
        value: "parent",
        label: t("Parent"),
      },
      {
        value: "grandparent",
        label: t("Grandparent"),
      },
      {
        value: "family_or_friend",
        label: t("Family or close friend"),
      },
      {
        value: "caregiver",
        label: t("Caregiver"),
      },
      {
        value: "other",
        label: t("Other"),
      },
    ],
    [t],
  );

  useImperativeHandle(
    ref,
    () => ({
      present() {
        setRelationship(currentRelationship || null);

        setErrorMessage("");

        bottomSheetRef.current?.present();
      },

      dismiss() {
        bottomSheetRef.current?.dismiss();
      },
    }),
    [currentRelationship],
  );

  function handleSelectRelationship(value) {
    setRelationship(value);
    setErrorMessage("");
  }

  async function handleSave() {
    if (!relationship || isSaving) {
      return;
    }

    try {
      setErrorMessage("");

      await onSave?.({
        relationship,
      });

      bottomSheetRef.current?.dismiss();

      onSaved?.({
        relationship,
      });
    } catch (error) {
      console.error("Unable to update relationship", error);

      setErrorMessage(
        t("Unable to update your relationship. Please try again."),
      );
    }
  }

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      enableDynamicSizing
      enablePanDownToClose={!isSaving}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      backdropComponent={(backdropProps) => (
        <BottomSheetBackdrop
          {...backdropProps}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior={isSaving ? "none" : "close"}
          opacity={0.45}
        />
      )}
    >
      <BottomSheetView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {t("Your relationship with {{childName}}", {
              childName,
            })}
          </Text>

          <Text style={styles.description}>
            {t("Choose how you are connected to {{childName}}.", {
              childName,
            })}
          </Text>
        </View>

        <View accessibilityRole="radiogroup" style={styles.relationshipOptions}>
          {relationshipOptions.map((option) => {
            const isSelected = relationship === option.value;

            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{
                  selected: isSelected,
                }}
                accessibilityLabel={option.label}
                disabled={isSaving}
                onPress={() => handleSelectRelationship(option.value)}
                style={({ pressed }) => [
                  styles.relationshipPill,
                  isSelected && styles.relationshipPillSelected,
                  pressed && styles.relationshipPillPressed,
                ]}
              >
                <Text
                  style={[
                    styles.relationshipPillText,
                    isSelected && styles.relationshipPillTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <View style={styles.footer}>
          <PrimaryButton
            title={t("Save changes")}
            onPress={handleSave}
            loading={isSaving}
            disabled={!relationship}
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default RelationshipSettingsSheet;

const createStyles = (colors) =>
  StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
    },

    handleIndicator: {
      width: 42,
      height: 5,
      backgroundColor: colors.border,
    },

    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
    },

    header: {
      marginBottom: spacing.xl,
    },

    title: {
      color: colors.textPrimary,
      fontFamily: "Lora_700Bold",
      fontSize: 25,
      lineHeight: 34,
    },

    description: {
      marginTop: spacing.xs,
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Regular",
      fontSize: 14,
      lineHeight: 22,
    },

    relationshipOptions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },

    relationshipPill: {
      minHeight: 42,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: colors.lightBackground,
    },

    relationshipPillSelected: {
      backgroundColor: colors.selectedBackground,
    },

    relationshipPillPressed: {
      opacity: 0.65,
    },

    relationshipPillText: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 20,
    },

    relationshipPillTextSelected: {
      color: colors.primary,
      fontFamily: "PlusJakartaSans_700Bold",
    },

    helperText: {
      marginTop: spacing.xs,
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Regular",
      fontSize: 12,
      lineHeight: 18,
    },

    errorText: {
      marginTop: spacing.md,
      color: colors.error,
      fontFamily: "PlusJakartaSans_500Regular",
      fontSize: 13,
      lineHeight: 19,
    },

    footer: {
      marginTop: spacing.xl,
    },
  });
