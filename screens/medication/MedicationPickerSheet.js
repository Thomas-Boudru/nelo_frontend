import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import PrimaryButton from "../../components/ui/PrimaryButton.js";
import { useThemeColors } from "../../theme/useThemeColors.js";
import {
  MEDICATIONS,
  normalizeMedicationSearch,
  searchMedications,
} from "../../data/medications.js";

function createCustomMedicationId() {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const MedicationPickerSheet = forwardRef(function MedicationPickerSheet(
  {
    recentMedications = [],
    customMedications = [],
    onSelectMedication,
    onSaveCustomMedication,
    onDeleteCustomMedication,
  },
  ref,
) {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const { height: windowHeight } = useWindowDimensions();

  const maxContentHeight = useMemo(
    () => Math.min(500, Math.round(windowHeight * 0.62)),
    [windowHeight],
  );

  const modalRef = useRef(null);
  const searchInputRef = useRef(null);
  const customNameInputRef = useRef(null);

  const [step, setStep] = useState("search");
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const [editingMedication, setEditingMedication] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentLanguage =
    i18n.resolvedLanguage?.toLowerCase().split("-")[0] ??
    i18n.language?.toLowerCase().split("-")[0] ??
    "en";

  const translatedMedications = useMemo(
    () =>
      MEDICATIONS.map((medication) => ({
        ...medication,
        name: t(medication.translationKey),
        categoryName: medication.category ? t(medication.category) : "",
        isCustom: false,
      })),
    [i18n.resolvedLanguage, t],
  );

  /*
   * Les médicaments supprimés restent dans les données
   * afin de préserver les anciennes prises, mais ils ne
   * sont plus visibles dans le sélecteur.
   */
  const activeCustomMedications = useMemo(
    () =>
      customMedications
        .filter(
          (medication) =>
            !medication.deletedAt && medication.isDeleted !== true,
        )
        .map((medication) => ({
          ...medication,
          translationKey: null,
          category: null,
          categoryName: "",
          isCustom: true,
        })),
    [customMedications],
  );

  const allMedications = useMemo(
    () => [...activeCustomMedications, ...translatedMedications],
    [activeCustomMedications, translatedMedications],
  );

  const suggestedMedications = useMemo(() => {
    const recentIds = new Set(
      recentMedications
        .map((medication) => medication.id ?? medication.medicationId)
        .filter(Boolean),
    );

    const recentNames = new Set(
      recentMedications
        .map((medication) =>
          normalizeMedicationSearch(
            medication.name ?? medication.medicationName ?? "",
          ),
        )
        .filter(Boolean),
    );

    const recentResults = allMedications.filter(
      (medication) =>
        recentIds.has(medication.id) ||
        recentNames.has(normalizeMedicationSearch(medication.name)),
    );

    const recentResultIds = new Set(
      recentResults.map((medication) => medication.id),
    );

    const remainingMedications = allMedications.filter(
      (medication) => !recentResultIds.has(medication.id),
    );

    return [...recentResults, ...remainingMedications].slice(0, 6);
  }, [allMedications, recentMedications]);

  const filteredMedications = useMemo(() => {
    const trimmedSearch = search.trim();

    if (!trimmedSearch) {
      return suggestedMedications;
    }

    const customResults = activeCustomMedications.filter((medication) =>
      normalizeMedicationSearch(medication.name).includes(
        normalizeMedicationSearch(trimmedSearch),
      ),
    );

    const standardResults = searchMedications(
      translatedMedications,
      trimmedSearch,
      currentLanguage,
      (medication) => medication.name,
    );

    return [...customResults, ...standardResults];
  }, [
    activeCustomMedications,
    currentLanguage,
    search,
    suggestedMedications,
    translatedMedications,
  ]);

  const trimmedSearch = search.trim();
  const trimmedCustomName = customName.trim();

  const hasExactMatch = useMemo(() => {
    if (!trimmedSearch) {
      return false;
    }

    const normalizedSearch = normalizeMedicationSearch(trimmedSearch);

    return allMedications.some(
      (medication) =>
        normalizeMedicationSearch(medication.name) === normalizedSearch,
    );
  }, [allMedications, trimmedSearch]);

  const canCreateMedication = trimmedSearch.length > 0 && !hasExactMatch;

  const duplicateCustomMedication = useMemo(() => {
    if (!trimmedCustomName) {
      return null;
    }

    const normalizedName = normalizeMedicationSearch(trimmedCustomName);

    return allMedications.find(
      (medication) =>
        medication.id !== editingMedication?.id &&
        normalizeMedicationSearch(medication.name) === normalizedName,
    );
  }, [allMedications, editingMedication?.id, trimmedCustomName]);

  const canSaveCustomMedication =
    trimmedCustomName.length > 0 && !duplicateCustomMedication && !isSaving;

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

  const resetSheet = useCallback(() => {
    setStep("search");
    setSearch("");
    setCustomName("");
    setEditingMedication(null);
    setIsSaving(false);
  }, []);

  const dismissSheet = useCallback(() => {
    Keyboard.dismiss();
    modalRef.current?.dismiss();
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      present() {
        resetSheet();
        modalRef.current?.present();

        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 300);
      },

      presentEdit(medication) {
        if (!medication?.isCustom) {
          return;
        }

        setSearch("");
        setStep("custom");
        setEditingMedication(medication);
        setCustomName(medication.name ?? "");

        modalRef.current?.present();

        setTimeout(() => {
          customNameInputRef.current?.focus();
        }, 300);
      },

      dismiss() {
        dismissSheet();
      },
    }),
    [dismissSheet, resetSheet],
  );

  const handleDismiss = useCallback(() => {
    Keyboard.dismiss();
    resetSheet();
  }, [resetSheet]);

  const handleSelectMedication = useCallback(
    (medication) => {
      onSelectMedication?.({
        id: medication.id,
        name: medication.name,
        translationKey: medication.translationKey ?? null,
        category: medication.category ?? null,
        isCustom: medication.isCustom === true,
      });

      dismissSheet();
    },
    [dismissSheet, onSelectMedication],
  );

  /*
   * Ouvre l’étape intermédiaire.
   * Aucun médicament n’est encore créé ou sélectionné.
   */
  const openCustomMedicationForm = useCallback(
    (medication = null) => {
      Keyboard.dismiss();

      setEditingMedication(medication);
      setCustomName(medication?.name ?? search.trim());
      setStep("custom");

      setTimeout(() => {
        customNameInputRef.current?.focus();
      }, 150);
    },
    [search],
  );

  const closeCustomMedicationForm = useCallback(() => {
    Keyboard.dismiss();

    setStep("search");
    setEditingMedication(null);
    setCustomName("");

    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 150);
  }, []);

  /*
   * Le médicament n’est envoyé au champ principal
   * qu’après validation avec le PrimaryButton.
   */
  const handleSaveCustomMedication = useCallback(async () => {
    const name = customName.trim();

    if (!name || duplicateCustomMedication || isSaving) {
      return;
    }

    const now = new Date().toISOString();

    const medication = editingMedication
      ? {
          ...editingMedication,
          name,
          translationKey: null,
          category: null,
          isCustom: true,
          updatedAt: now,
          deletedAt: null,
        }
      : {
          id: createCustomMedicationId(),
          name,
          translationKey: null,
          category: null,
          isCustom: true,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };

    try {
      setIsSaving(true);

      await onSaveCustomMedication?.(medication);

      onSelectMedication?.({
        id: medication.id,
        name: medication.name,
        translationKey: null,
        category: null,
        isCustom: true,
      });

      dismissSheet();
    } finally {
      setIsSaving(false);
    }
  }, [
    customName,
    dismissSheet,
    duplicateCustomMedication,
    editingMedication,
    isSaving,
    onSaveCustomMedication,
    onSelectMedication,
  ]);

  const handleDeleteCustomMedication = useCallback(() => {
    if (!editingMedication) {
      return;
    }

    Keyboard.dismiss();

    Alert.alert(
      t("Delete custom medication"),
      t(
        "This medication will no longer appear in your list. Previously recorded entries will not be deleted.",
      ),
      [
        {
          text: t("Cancel"),
          style: "cancel",
        },
        {
          text: t("Delete"),
          style: "destructive",
          onPress: async () => {
            const deletedMedication = {
              ...editingMedication,
              isCustom: true,
              deletedAt: new Date().toISOString(),
            };

            await onDeleteCustomMedication?.(deletedMedication);

            setEditingMedication(null);
            setCustomName("");
            setSearch("");
            setStep("search");

            setTimeout(() => {
              searchInputRef.current?.focus();
            }, 150);
          },
        },
      ],
    );
  }, [editingMedication, onDeleteCustomMedication, t]);

  const renderMedication = useCallback(
    ({ item }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.name}
        accessibilityHint={t("Select this medication")}
        onPress={() => handleSelectMedication(item)}
        style={({ pressed }) => [
          styles.medicationRow,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.medicationInformation}>
          <View style={styles.medicationNameRow}>
            <Text numberOfLines={1} style={styles.medicationName}>
              {item.name}
            </Text>

            {item.isCustom ? (
              <View style={styles.customBadge}>
                <Text style={styles.customBadgeText}>{t("Custom")}</Text>
              </View>
            ) : null}
          </View>

          {item.categoryName ? (
            <Text numberOfLines={1} style={styles.medicationCategory}>
              {item.categoryName}
            </Text>
          ) : item.isCustom ? (
            <Text numberOfLines={1} style={styles.medicationCategory}>
              {t("Personal medication")}
            </Text>
          ) : null}
        </View>

        {item.isCustom ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Edit custom medication")}
            accessibilityHint={t("Rename or delete this medication")}
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              openCustomMedicationForm(item);
            }}
            style={({ pressed }) => [
              styles.editCustomButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="pencil-outline" size={15} color={colors.primary} />

            <Text style={styles.editCustomButtonText}>{t("Custom")}</Text>
          </Pressable>
        ) : (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textSecondary}
          />
        )}
      </Pressable>
    ),
    [
      colors.primary,
      colors.textSecondary,
      handleSelectMedication,
      openCustomMedicationForm,
      styles,
      t,
    ],
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      index={0}
      enableDynamicSizing
      maxDynamicContentSize={maxContentHeight}
      stackBehavior="push"
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      onDismiss={handleDismiss}
    >
      {step === "search" ? (
        <BottomSheetFlatList
          data={filteredMedications}
          keyExtractor={(item) => item.id}
          renderItem={renderMedication}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[0]}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.stickyHeader}>
              <View style={styles.header}>
                <Text style={styles.title}>{t("Choose a medication")}</Text>

                <Text style={styles.subtitle}>
                  {t("Search by medication or brand name")}
                </Text>
              </View>

              <View style={styles.searchBar}>
                <Ionicons
                  name="search-outline"
                  size={20}
                  color={colors.textSecondary}
                />

                <BottomSheetTextInput
                  ref={searchInputRef}
                  value={search}
                  onChangeText={setSearch}
                  placeholder={t("Search for a medication")}
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  returnKeyType="search"
                  clearButtonMode="never"
                  selectionColor={colors.primary}
                  style={styles.searchInput}
                />

                {search.length > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("Clear search")}
                    hitSlop={8}
                    onPress={() => {
                      setSearch("");

                      requestAnimationFrame(() => {
                        searchInputRef.current?.focus();
                      });
                    }}
                    style={({ pressed }) => [
                      styles.clearButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name="close-circle"
                      size={19}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                ) : null}
              </View>

              <Text style={styles.sectionTitle}>
                {trimmedSearch
                  ? t("Search results")
                  : t("Suggested medications")}
              </Text>
            </View>
          }
          ListFooterComponent={
            canCreateMedication ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Add a new medication")}
                onPress={() => openCustomMedicationForm()}
                style={({ pressed }) => [
                  styles.createMedicationCard,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.createMedicationIcon}>
                  <Ionicons
                    name="add-outline"
                    size={22}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.createMedicationInformation}>
                  <Text numberOfLines={1} style={styles.createMedicationTitle}>
                    {t('Add "{{medicationName}}"', {
                      medicationName: trimmedSearch,
                    })}
                  </Text>

                  <Text style={styles.createMedicationDescription}>
                    {t("Create a custom medication")}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>
            ) : null
          }
        />
      ) : (
        <BottomSheetView style={styles.customFormContainer}>
          <View style={styles.customHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Back")}
              hitSlop={8}
              onPress={closeCustomMedicationForm}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="arrow-back-outline"
                size={20}
                color={colors.textPrimary}
              />
            </Pressable>

            <View style={styles.customHeaderInformation}>
              <Text style={styles.title}>
                {editingMedication
                  ? t("Edit custom medication")
                  : t("New custom medication")}
              </Text>

              <Text style={styles.subtitle}>
                {editingMedication
                  ? t("Change the name of this medication")
                  : t("Check the name before adding it")}
              </Text>
            </View>
          </View>

          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>{t("Medication name")}</Text>

            <View style={styles.customNameField}>
              <BottomSheetTextInput
                ref={customNameInputRef}
                value={customName}
                onChangeText={setCustomName}
                placeholder={t("Medication name")}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="sentences"
                autoCorrect={false}
                returnKeyType="done"
                selectionColor={colors.primary}
                onSubmitEditing={() => {
                  if (canSaveCustomMedication) {
                    handleSaveCustomMedication();
                  }
                }}
                style={styles.customNameInput}
              />

              {customName.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("Clear medication name")}
                  hitSlop={8}
                  onPress={() => {
                    setCustomName("");

                    requestAnimationFrame(() => {
                      customNameInputRef.current?.focus();
                    });
                  }}
                  style={({ pressed }) => [
                    styles.clearButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name="close-circle"
                    size={19}
                    color={colors.textSecondary}
                  />
                </Pressable>
              ) : null}
            </View>

            {duplicateCustomMedication ? (
              <Text style={styles.errorText}>
                {t("A medication with this name already exists")}
              </Text>
            ) : null}
          </View>

          {editingMedication ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Delete custom medication")}
              onPress={handleDeleteCustomMedication}
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="trash-outline" size={17} color={colors.error} />

              <Text style={styles.deleteButtonText}>
                {t("Delete this medication")}
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.primaryButtonContainer}>
            <PrimaryButton
              title={
                editingMedication ? t("Save changes") : t("Add this medication")
              }
              disabled={!canSaveCustomMedication}
              loading={isSaving}
              onPress={handleSaveCustomMedication}
            />
          </View>
        </BottomSheetView>
      )}
    </BottomSheetModal>
  );
});

export default MedicationPickerSheet;

function createStyles(colors) {
  return StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
    },

    handleIndicator: {
      width: 38,
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.border,
    },

    listContent: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingBottom: 24,
      backgroundColor: colors.white,
    },

    stickyHeader: {
      paddingTop: 5,
      paddingBottom: 14,
      backgroundColor: colors.white,
    },

    header: {
      paddingBottom: 15,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 19,
      color: colors.textPrimary,
    },

    subtitle: {
      marginTop: 5,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },

    searchBar: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.lightBlue,
      gap: 10,
    },

    searchInput: {
      flex: 1,
      height: 50,
      padding: 0,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      color: colors.textPrimary,
    },

    clearButton: {
      alignItems: "center",
      justifyContent: "center",
    },

    sectionTitle: {
      marginTop: 17,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 12,
      color: colors.textSecondary,
    },

    medicationRow: {
      minHeight: 60,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.white,
      gap: 10,
    },

    medicationInformation: {
      flex: 1,
      gap: 4,
    },

    medicationNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },

    medicationName: {
      flexShrink: 1,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 13,
      color: colors.textPrimary,
    },

    medicationCategory: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      color: colors.textSecondary,
    },

    customBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: `${colors.primary}12`,
    },

    customBadgeText: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 9,
      color: colors.primary,
    },

    editCustomButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 9,
      paddingVertical: 7,
      borderRadius: 11,
      backgroundColor: `${colors.primary}10`,
      gap: 5,
    },

    editCustomButtonText: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 9,
      color: colors.primary,
    },

    separator: {
      height: 8,
    },

    createMedicationCard: {
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: `${colors.primary}25`,
      backgroundColor: `${colors.primary}08`,
      gap: 12,
    },

    createMedicationIcon: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: `${colors.primary}12`,
    },

    createMedicationInformation: {
      flex: 1,
      gap: 3,
    },

    createMedicationTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 12,
      color: colors.primary,
    },

    createMedicationDescription: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      color: colors.textSecondary,
    },

    customFormContainer: {
      paddingHorizontal: 20,
      paddingTop: 5,
      paddingBottom: 22,
      backgroundColor: colors.white,
    },

    customHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },

    customHeaderInformation: {
      flex: 1,
    },

    backButton: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.lightBlue,
    },

    fieldSection: {
      marginTop: 22,
      gap: 8,
    },

    fieldLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      color: colors.textSecondary,
    },

    customNameField: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.lightBlue,
      gap: 10,
    },

    customNameInput: {
      flex: 1,
      height: 52,
      padding: 0,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      color: colors.textPrimary,
    },

    errorText: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      color: colors.error,
    },

    deleteButton: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      marginTop: 16,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor: `${colors.error}0D`,
      gap: 7,
    },

    deleteButtonText: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 11,
      color: colors.error,
    },

    primaryButtonContainer: {
      marginTop: 22,
    },

    pressed: {
      opacity: 0.72,
    },
  });
}
