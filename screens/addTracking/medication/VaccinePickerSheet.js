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
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";
import {
  VACCINES,
  normalizeVaccineSearch,
  searchVaccines,
} from "../../../data/vaccines.js";

function createCustomVaccineId() {
  return `custom-vaccine-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const VaccinePickerSheet = forwardRef(function VaccinePickerSheet(
  {
    recentVaccines = [],
    customVaccines = [],
    onSelectVaccine,
    onSaveCustomVaccine,
    onDeleteCustomVaccine,
  },
  ref,
) {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const { height: windowHeight } = useWindowDimensions();

  /**
   * L’étape de recherche est un seul scrollable, la sheet épouse donc son
   * contenu. Ce plafond limite sa hauteur pour garder environ cinq résultats
   * visibles et laisser le reste défiler au lieu de couvrir tout l’écran.
   */
  const searchMaxContentHeight = useMemo(
    () => Math.min(430, Math.round(windowHeight * 0.55)),
    [windowHeight],
  );

  const modalRef = useRef(null);
  const searchInputRef = useRef(null);
  const customNameInputRef = useRef(null);

  const [step, setStep] = useState("search");
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const [editingVaccine, setEditingVaccine] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentLanguage =
    i18n.resolvedLanguage?.toLowerCase().split("-")[0] ??
    i18n.language?.toLowerCase().split("-")[0] ??
    "en";

  const translatedVaccines = useMemo(
    () =>
      VACCINES.map((vaccine) => ({
        ...vaccine,
        name: t(vaccine.translationKey),
        categoryName: vaccine.category ? t(vaccine.category) : "",
        isCustom: false,
      })),
    [i18n.resolvedLanguage, t],
  );

  /*
   * Les vaccins supprimés restent dans les données
   * afin de préserver les anciennes injections, mais ils ne
   * sont plus visibles dans le sélecteur.
   */
  const activeCustomVaccines = useMemo(
    () =>
      customVaccines
        .filter((vaccine) => !vaccine.deletedAt && vaccine.isDeleted !== true)
        .map((vaccine) => ({
          ...vaccine,
          translationKey: null,
          category: null,
          categoryName: "",
          isCustom: true,
        })),
    [customVaccines],
  );

  const allVaccines = useMemo(
    () => [...activeCustomVaccines, ...translatedVaccines],
    [activeCustomVaccines, translatedVaccines],
  );

  const suggestedVaccines = useMemo(() => {
    const recentIds = new Set(
      recentVaccines
        .map((vaccine) => vaccine.id ?? vaccine.vaccineId)
        .filter(Boolean),
    );

    const recentNames = new Set(
      recentVaccines
        .map((vaccine) =>
          normalizeVaccineSearch(vaccine.name ?? vaccine.vaccineName ?? ""),
        )
        .filter(Boolean),
    );

    const recentResults = allVaccines.filter(
      (vaccine) =>
        recentIds.has(vaccine.id) ||
        recentNames.has(normalizeVaccineSearch(vaccine.name)),
    );

    const recentResultIds = new Set(recentResults.map((vaccine) => vaccine.id));

    const remainingVaccines = allVaccines.filter(
      (vaccine) => !recentResultIds.has(vaccine.id),
    );

    return [...recentResults, ...remainingVaccines].slice(0, 6);
  }, [allVaccines, recentVaccines]);

  const filteredVaccines = useMemo(() => {
    const trimmedSearch = search.trim();

    if (!trimmedSearch) {
      return suggestedVaccines;
    }

    const customResults = activeCustomVaccines.filter((vaccine) =>
      normalizeVaccineSearch(vaccine.name).includes(
        normalizeVaccineSearch(trimmedSearch),
      ),
    );

    const standardResults = searchVaccines(
      translatedVaccines,
      trimmedSearch,
      currentLanguage,
      (vaccine) => vaccine.name,
    );

    return [...customResults, ...standardResults];
  }, [
    activeCustomVaccines,
    currentLanguage,
    search,
    suggestedVaccines,
    translatedVaccines,
  ]);

  const trimmedSearch = search.trim();
  const trimmedCustomName = customName.trim();

  const hasExactMatch = useMemo(() => {
    if (!trimmedSearch) {
      return false;
    }

    const normalizedSearch = normalizeVaccineSearch(trimmedSearch);

    return allVaccines.some(
      (vaccine) => normalizeVaccineSearch(vaccine.name) === normalizedSearch,
    );
  }, [allVaccines, trimmedSearch]);

  const canCreateVaccine = trimmedSearch.length > 0 && !hasExactMatch;

  const duplicateCustomVaccine = useMemo(() => {
    if (!trimmedCustomName) {
      return null;
    }

    const normalizedName = normalizeVaccineSearch(trimmedCustomName);

    return allVaccines.find(
      (vaccine) =>
        vaccine.id !== editingVaccine?.id &&
        normalizeVaccineSearch(vaccine.name) === normalizedName,
    );
  }, [allVaccines, editingVaccine?.id, trimmedCustomName]);

  const canSaveCustomVaccine =
    trimmedCustomName.length > 0 && !duplicateCustomVaccine && !isSaving;

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
    setEditingVaccine(null);
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

      presentEdit(vaccine) {
        if (!vaccine?.isCustom) {
          return;
        }

        setSearch("");
        setStep("custom");
        setEditingVaccine(vaccine);
        setCustomName(vaccine.name ?? "");

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

  const handleSelectVaccine = useCallback(
    (vaccine) => {
      onSelectVaccine?.({
        id: vaccine.id,
        name: vaccine.name,
        translationKey: vaccine.translationKey ?? null,
        category: vaccine.category ?? null,
        isCustom: vaccine.isCustom === true,
      });

      dismissSheet();
    },
    [dismissSheet, onSelectVaccine],
  );

  /*
   * Ouvre l’étape intermédiaire.
   * Aucun vaccin n’est encore créé ou sélectionné.
   */
  const openCustomVaccineForm = useCallback(
    (vaccine = null) => {
      Keyboard.dismiss();

      setEditingVaccine(vaccine);
      setCustomName(vaccine?.name ?? search.trim());
      setStep("custom");

      setTimeout(() => {
        customNameInputRef.current?.focus();
      }, 150);
    },
    [search],
  );

  const closeCustomVaccineForm = useCallback(() => {
    Keyboard.dismiss();

    setStep("search");
    setEditingVaccine(null);
    setCustomName("");

    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 150);
  }, []);

  /*
   * Le vaccin n’est envoyé au champ principal
   * qu’après validation avec le PrimaryButton.
   */
  const handleSaveCustomVaccine = useCallback(async () => {
    const name = customName.trim();

    if (!name || duplicateCustomVaccine || isSaving) {
      return;
    }

    const now = new Date().toISOString();

    const vaccine = editingVaccine
      ? {
          ...editingVaccine,
          name,
          translationKey: null,
          category: null,
          isCustom: true,
          updatedAt: now,
          deletedAt: null,
        }
      : {
          id: createCustomVaccineId(),
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

      await onSaveCustomVaccine?.(vaccine);

      onSelectVaccine?.({
        id: vaccine.id,
        name: vaccine.name,
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
    duplicateCustomVaccine,
    editingVaccine,
    isSaving,
    onSaveCustomVaccine,
    onSelectVaccine,
  ]);

  const handleDeleteCustomVaccine = useCallback(() => {
    if (!editingVaccine) {
      return;
    }

    Keyboard.dismiss();

    Alert.alert(
      t("Delete custom vaccine"),
      t(
        "This vaccine will no longer appear in your list. Previously recorded entries will not be deleted.",
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
            const deletedVaccine = {
              ...editingVaccine,
              isCustom: true,
              deletedAt: new Date().toISOString(),
            };

            await onDeleteCustomVaccine?.(deletedVaccine);

            setEditingVaccine(null);
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
  }, [editingVaccine, onDeleteCustomVaccine, t]);

  const renderVaccine = useCallback(
    ({ item }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.name}
        accessibilityHint={t("Select this vaccine")}
        onPress={() => handleSelectVaccine(item)}
        style={({ pressed }) => [styles.vaccineRow, pressed && styles.pressed]}
      >
        <View style={styles.vaccineInformation}>
          <View style={styles.vaccineNameRow}>
            <Text numberOfLines={1} style={styles.vaccineName}>
              {item.name}
            </Text>

            {item.isCustom ? (
              <View style={styles.customBadge}>
                <Text style={styles.customBadgeText}>{t("Custom")}</Text>
              </View>
            ) : null}
          </View>

          {item.categoryName ? (
            <Text numberOfLines={1} style={styles.vaccineCategory}>
              {item.categoryName}
            </Text>
          ) : item.isCustom ? (
            <Text numberOfLines={1} style={styles.vaccineCategory}>
              {t("Personal vaccine")}
            </Text>
          ) : null}
        </View>
        {item.isCustom ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Edit custom vaccine")}
            hitSlop={10}
            onPress={(event) => {
              event.stopPropagation();
              openCustomVaccineForm(item);
            }}
            style={({ pressed }) => [
              styles.editVaccineButton,
              pressed && styles.editVaccineButtonPressed,
            ]}
          >
            <FontAwesome6 name="pen" size={15} color={colors.primary} />
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
      handleSelectVaccine,
      openCustomVaccineForm,
      styles,
      t,
    ],
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      index={0}
      enableDynamicSizing
      maxDynamicContentSize={
        step === "search" ? searchMaxContentHeight : undefined
      }
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
          data={filteredVaccines}
          keyExtractor={(item) => item.id}
          renderItem={renderVaccine}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[0]}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.stickyHeader}>
              <View style={styles.header}>
                <Text style={styles.title}>{t("Choose a vaccine")}</Text>

                <Text style={styles.subtitle}>
                  {t("Search by vaccine or brand name")}
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
                  placeholder={t("Search for a vaccine")}
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
                {trimmedSearch ? t("Search results") : t("Suggested vaccines")}
              </Text>
            </View>
          }
          ListFooterComponent={
            canCreateVaccine ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Add a new vaccine")}
                onPress={() => openCustomVaccineForm()}
                style={({ pressed }) => [
                  styles.createVaccineCard,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.createVaccineIcon}>
                  <Ionicons
                    name="add-outline"
                    size={22}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.createVaccineInformation}>
                  <Text numberOfLines={1} style={styles.createVaccineTitle}>
                    {t('Add "{{vaccineName}}"', {
                      vaccineName: trimmedSearch,
                    })}
                  </Text>

                  <Text style={styles.createVaccineDescription}>
                    {t("Create a custom vaccine")}
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
              onPress={closeCustomVaccineForm}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={19}
                color={colors.textPrimary}
              />
            </Pressable>

            <View style={styles.customHeaderInformation}>
              <Text style={styles.title}>
                {editingVaccine
                  ? t("Edit custom vaccine")
                  : t("New custom vaccine")}
              </Text>

              <Text style={styles.subtitle}>
                {editingVaccine
                  ? t("Change the name of this vaccine")
                  : t("Check the name before adding it")}
              </Text>
            </View>
          </View>

          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>{t("Vaccine name")}</Text>

            <View style={styles.customNameField}>
              <BottomSheetTextInput
                ref={customNameInputRef}
                value={customName}
                onChangeText={setCustomName}
                placeholder={t("Vaccine name")}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="sentences"
                autoCorrect={false}
                returnKeyType="done"
                selectionColor={colors.primary}
                onSubmitEditing={() => {
                  if (canSaveCustomVaccine) {
                    handleSaveCustomVaccine();
                  }
                }}
                style={styles.customNameInput}
              />

              {customName.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("Clear vaccine name")}
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

            {duplicateCustomVaccine ? (
              <Text style={styles.errorText}>
                {t("A vaccine with this name already exists")}
              </Text>
            ) : null}
          </View>

          <View style={styles.formActions}>
            {editingVaccine ? (
              <>
                <PrimaryButton
                  title={t("Delete")}
                  variant="destructive"
                  disabled={isSaving}
                  onPress={handleDeleteCustomVaccine}
                  style={styles.formActionButton}
                />

                <PrimaryButton
                  title={t("Save")}
                  disabled={!canSaveCustomVaccine}
                  loading={isSaving}
                  onPress={handleSaveCustomVaccine}
                  style={styles.formActionButton}
                />
              </>
            ) : (
              <PrimaryButton
                title={t("Add this vaccine")}
                disabled={!canSaveCustomVaccine}
                loading={isSaving}
                onPress={handleSaveCustomVaccine}
              />
            )}
          </View>
        </BottomSheetView>
      )}
    </BottomSheetModal>
  );
});

export default VaccinePickerSheet;

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

    /**
     * `textAlignVertical: "center"` est indispensable avec une hauteur fixe :
     * sinon Android dessine la valeur saisie en haut de la boîte alors que le
     * placeholder est centré, et les deux ne sont plus au même niveau.
     */
    searchInput: {
      flex: 1,
      height: 50,
      padding: 0,
      textAlignVertical: "center",
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

    vaccineRow: {
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

    vaccineInformation: {
      flex: 1,
      gap: 4,
    },

    vaccineNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },

    vaccineName: {
      flexShrink: 1,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 13,
      color: colors.textPrimary,
    },

    vaccineCategory: {
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

    separator: {
      height: 8,
    },

    createVaccineCard: {
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      marginTop: 8,
      paddingVertical: 11,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: `${colors.primary}25`,
      backgroundColor: `${colors.primary}08`,
      gap: 12,
    },

    createVaccineIcon: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: `${colors.primary}12`,
    },

    createVaccineInformation: {
      flex: 1,
      gap: 3,
    },

    createVaccineTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 12,
      color: colors.primary,
    },

    createVaccineDescription: {
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
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 17,
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
      textAlignVertical: "center",
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      color: colors.textPrimary,
    },

    errorText: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      color: colors.error,
    },

    formActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 22,
    },

    formActionButton: {
      flex: 1,
      width: undefined,
    },

    pressed: {
      opacity: 0.72,
    },

    editVaccineButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 21,
      backgroundColor: `${colors.primary}18`,
    },

    editVaccineButtonPressed: {
      opacity: 0.75,
      transform: [{ scale: 0.94 }],
    },
  });
}
