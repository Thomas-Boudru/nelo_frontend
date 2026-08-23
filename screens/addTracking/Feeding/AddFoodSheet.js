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
  Alert,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  FOODS,
  normalizeFoodSearch,
  getFoodSearchTerms,
} from "../../../data/foods.js";

import { useThemeColors } from "../../../theme/useThemeColors.js";
import PrimaryButton from "../../../components/ui/PrimaryButton.js";

const UNIT_OPTIONS = [
  {
    id: "piece",
    label: "Piece",
  },
  {
    id: "g",
    label: "g",
  },
  {
    id: "ml",
    label: "ml",
  },
  {
    id: "teaspoon",
    label: "Teaspoon",
  },
  {
    id: "tablespoon",
    label: "Tablespoon",
  },
  {
    id: "portion",
    label: "Portion",
  },
];

const FRACTION_OPTIONS = [
  {
    id: "quarter",
    value: 0.25,
    label: "¼",
  },
  {
    id: "half",
    value: 0.5,
    label: "½",
  },
  {
    id: "three-quarters",
    value: 0.75,
    label: "¾",
  },
  {
    id: "one",
    value: 1,
    label: "1",
  },
];

function deduplicateFoods(foods) {
  const foodsByKey = new Map();

  foods.forEach((food) => {
    const source = food.isCustom ? "custom" : "standard";
    const key = `${source}:${food.id}`;

    if (!foodsByKey.has(key)) {
      foodsByKey.set(key, food);
    }
  });

  return Array.from(foodsByKey.values());
}

function createCustomFoodId() {
  return `custom-food-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const AddFoodSheet = forwardRef(function AddFoodSheet(
  { onAddFood, customFoods = [], onSaveCustomFood, onDeleteCustomFood },
  ref,
) {
  const { t, i18n } = useTranslation();

  const currentLanguage =
    i18n.resolvedLanguage?.split("-")[0] ??
    i18n.language?.split("-")[0] ??
    "en";

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { height: windowHeight } = useWindowDimensions();

  /**
   * The search step is a single scrollable, so the sheet hugs its content.
   * This caps how tall it may grow, which keeps roughly five results visible
   * and lets the rest scroll instead of taking over the screen.
   */
  const searchMaxContentHeight = useMemo(
    () => Math.min(430, Math.round(windowHeight * 0.55)),
    [windowHeight],
  );

  const modalRef = useRef(null);
  const searchInputRef = useRef(null);
  const customNameInputRef = useRef(null);
  const keyboardHideSubscriptionRef = useRef(null);
  const keyboardHideTimeoutRef = useRef(null);

  const [step, setStep] = useState("search");
  const [search, setSearch] = useState("");
  const [selectedFood, setSelectedFood] = useState(null);
  const [amount, setAmount] = useState("");
  const [selectedFraction, setSelectedFraction] = useState(null);
  const [unit, setUnit] = useState("piece");
  const [customName, setCustomName] = useState("");
  const [editingFood, setEditingFood] = useState(null);
  const [isSavingCustomFood, setIsSavingCustomFood] = useState(false);

  const translatedFoods = useMemo(
    () =>
      FOODS.map((food) => ({
        ...food,
        name: t(food.translationKey),
        isCustom: false,
      })),
    [t, i18n.resolvedLanguage],
  );

  const activeCustomFoods = useMemo(
    () =>
      customFoods
        .filter((food) => !food.deletedAt && food.isDeleted !== true)
        .map((food) => ({
          ...food,
          translationKey: null,
          image: null,
          emoji: food.emoji ?? "🥣",
          suggestedUnit: food.suggestedUnit ?? "piece",
          isCustom: true,
        })),
    [customFoods],
  );

  const allFoods = useMemo(
    () => deduplicateFoods([...activeCustomFoods, ...translatedFoods]),
    [activeCustomFoods, translatedFoods],
  );

  const filteredFoods = useMemo(() => {
    const normalizedSearch = normalizeFoodSearch(search);

    if (!normalizedSearch) {
      return allFoods.slice(0, 6);
    }

    const customResults = activeCustomFoods.filter((food) =>
      normalizeFoodSearch(food.name).includes(normalizedSearch),
    );

    const standardResults = translatedFoods
      .map((food) => {
        const { currentLanguageTerms, otherLanguageTerms } = getFoodSearchTerms(
          food,
          currentLanguage,
        );

        const translatedName = normalizeFoodSearch(food.name);

        const exactCurrentLanguageMatch =
          translatedName === normalizedSearch ||
          currentLanguageTerms.some((term) => term === normalizedSearch);

        const partialCurrentLanguageMatch =
          translatedName.includes(normalizedSearch) ||
          currentLanguageTerms.some((term) => term.includes(normalizedSearch));

        const otherLanguageMatch = otherLanguageTerms.some((term) =>
          term.includes(normalizedSearch),
        );

        let score = 0;

        if (exactCurrentLanguageMatch) {
          score = 3;
        } else if (partialCurrentLanguageMatch) {
          score = 2;
        } else if (otherLanguageMatch) {
          score = 1;
        }

        return { food, score };
      })
      .filter(({ score }) => score > 0)
      .sort((first, second) => second.score - first.score)
      .map(({ food }) => food);

    return deduplicateFoods([...customResults, ...standardResults]);
  }, [activeCustomFoods, allFoods, currentLanguage, search, translatedFoods]);

  const trimmedSearch = search.trim();
  const trimmedCustomName = customName.trim();

  const hasExactMatch = useMemo(() => {
    if (!trimmedSearch) {
      return false;
    }

    const normalizedSearch = normalizeFoodSearch(trimmedSearch);

    return allFoods.some(
      (food) => normalizeFoodSearch(food.name) === normalizedSearch,
    );
  }, [allFoods, trimmedSearch]);

  const canCreateFood = trimmedSearch.length > 0 && !hasExactMatch;

  const duplicateCustomFood = useMemo(() => {
    if (!trimmedCustomName) {
      return null;
    }

    const normalizedName = normalizeFoodSearch(trimmedCustomName);

    return allFoods.find(
      (food) =>
        food.id !== editingFood?.id &&
        normalizeFoodSearch(food.name) === normalizedName,
    );
  }, [allFoods, editingFood?.id, trimmedCustomName]);

  const canSaveCustomFood =
    trimmedCustomName.length > 0 && !duplicateCustomFood && !isSavingCustomFood;

  const cancelKeyboardHideWait = useCallback(() => {
    keyboardHideSubscriptionRef.current?.remove();
    keyboardHideSubscriptionRef.current = null;

    if (keyboardHideTimeoutRef.current) {
      clearTimeout(keyboardHideTimeoutRef.current);
      keyboardHideTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => cancelKeyboardHideWait, [cancelKeyboardHideWait]);

  /**
   * The sheet is dynamically sized, so changing step also changes its height.
   * Doing that while the keyboard is still closing makes the resize animation
   * and the keyboard "restore" animation fight, leaving the sheet at a stale
   * position. So we wait for the keyboard to be gone before switching step.
   */
  const runAfterKeyboardHidden = useCallback(
    (action) => {
      cancelKeyboardHideWait();

      if (!Keyboard.isVisible()) {
        action();
        return;
      }

      const run = () => {
        cancelKeyboardHideWait();
        action();
      };

      keyboardHideSubscriptionRef.current = Keyboard.addListener(
        "keyboardDidHide",
        run,
      );

      keyboardHideTimeoutRef.current = setTimeout(run, 400);

      Keyboard.dismiss();
    },
    [cancelKeyboardHideWait],
  );

  const resetSheet = useCallback(() => {
    setStep("search");
    setSearch("");
    setSelectedFood(null);
    setAmount("");
    setSelectedFraction(null);
    setUnit("piece");
    setCustomName("");
    setEditingFood(null);
    setIsSavingCustomFood(false);
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

      dismiss() {
        modalRef.current?.dismiss();
      },
    }),
    [resetSheet],
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

  const handleSelectFood = (food) => {
    runAfterKeyboardHidden(() => {
      setSelectedFood(food);
      setAmount("");
      setSelectedFraction(null);
      setUnit(food.suggestedUnit ?? "piece");
      setStep("details");
    });
  };

  const openCustomFoodForm = useCallback(
    (food = null) => {
      Keyboard.dismiss();

      setEditingFood(food);
      setCustomName(food?.name ?? search.trim());
      setStep("custom");

      setTimeout(() => {
        customNameInputRef.current?.focus();
      }, 150);
    },
    [search],
  );

  /**
   * Sortie du formulaire personnalisé (retour, enregistrement ou suppression).
   * On attend la fermeture complète du clavier avant de changer d’étape, sinon
   * la sheet reste bloquée sur une hauteur périmée, puis on laisse le
   * redimensionnement se terminer avant de redonner le focus à la recherche :
   * on retrouve ainsi la position standard de recherche, clavier ouvert.
   */
  const returnToSearchStep = useCallback(
    (nextSearch = "") => {
      runAfterKeyboardHidden(() => {
        setEditingFood(null);
        setCustomName("");
        setSearch(nextSearch);
        setStep("search");

        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 300);
      });
    },
    [runAfterKeyboardHidden],
  );

  const closeCustomFoodForm = useCallback(() => {
    returnToSearchStep();
  }, [returnToSearchStep]);

  const handleSaveCustomFood = useCallback(async () => {
    const name = customName.trim();

    if (!name || duplicateCustomFood || isSavingCustomFood) {
      return;
    }

    const now = new Date().toISOString();

    const food = editingFood
      ? {
          ...editingFood,
          name,
          translationKey: null,
          image: null,
          emoji: editingFood.emoji ?? "🥣",
          suggestedUnit: editingFood.suggestedUnit ?? "piece",
          isCustom: true,
          updatedAt: now,
          deletedAt: null,
        }
      : {
          id: createCustomFoodId(),
          name,
          translationKey: null,
          image: null,
          emoji: "🥣",
          suggestedUnit: "piece",
          isCustom: true,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };

    try {
      setIsSavingCustomFood(true);

      await onSaveCustomFood?.(food);

      /*
       * Après la création, on passe aux quantités.
       * Lors d’une édition depuis la liste, on revient à la recherche.
       */
      if (editingFood) {
        returnToSearchStep(food.name);
      } else {
        runAfterKeyboardHidden(() => {
          setSelectedFood(food);
          setAmount("");
          setSelectedFraction(null);
          setUnit(food.suggestedUnit ?? "piece");
          setStep("details");
        });
      }
    } finally {
      setIsSavingCustomFood(false);
    }
  }, [
    customName,
    duplicateCustomFood,
    editingFood,
    isSavingCustomFood,
    onSaveCustomFood,
    returnToSearchStep,
    runAfterKeyboardHidden,
  ]);

  const handleDeleteCustomFood = useCallback(() => {
    if (!editingFood) {
      return;
    }

    Keyboard.dismiss();

    Alert.alert(
      t("Delete custom food"),
      t(
        "This food will no longer appear in your list. Previously recorded entries will not be deleted.",
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
            const deletedFood = {
              ...editingFood,
              isCustom: true,
              deletedAt: new Date().toISOString(),
            };

            await onDeleteCustomFood?.(deletedFood);

            returnToSearchStep();
          },
        },
      ],
    );
  }, [editingFood, onDeleteCustomFood, returnToSearchStep, t]);

  const handleSelectFraction = (option) => {
    const isAlreadySelected = selectedFraction === option.id;

    if (isAlreadySelected) {
      setSelectedFraction(null);
      setAmount("");
      return;
    }

    setSelectedFraction(option.id);
    setAmount(String(option.value));
  };

  const getDisplayQuantity = useCallback(() => {
    if (!amount.trim()) {
      return "";
    }

    const fraction = FRACTION_OPTIONS.find(
      (option) => option.id === selectedFraction,
    );

    const displayedAmount = fraction?.label ?? amount.trim();

    if (unit === "piece") {
      return `${displayedAmount} ${t("Piece").toLocaleLowerCase()}`;
    }

    if (unit === "g" || unit === "ml") {
      return `${displayedAmount} ${unit}`;
    }

    const unitLabel =
      UNIT_OPTIONS.find((option) => option.id === unit)?.label ?? unit;

    return `${displayedAmount} ${t(unitLabel).toLocaleLowerCase()}`;
  }, [amount, selectedFraction, t, unit]);

  const handleAddFood = () => {
    if (!selectedFood) return;

    onAddFood?.({
      ...selectedFood,
      id: `${selectedFood.id}-${Date.now()}`,
      foodId: selectedFood.id,
      amount: amount.trim() ? Number(amount.replace(",", ".")) : null,
      unit: amount.trim() ? unit : null,
      quantity: getDisplayQuantity(),
    });

    modalRef.current?.dismiss();
  };

  const handleDismiss = () => {
    cancelKeyboardHideWait();
    Keyboard.dismiss();
    resetSheet();
  };

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
      onDismiss={handleDismiss}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      {step === "search" ? (
        /*
         * ÉTAPE 1 : RECHERCHER UN ALIMENT
         */
        <BottomSheetFlatList
          data={filteredFoods}
          keyExtractor={(item) =>
            `${item.isCustom ? "custom" : "standard"}:${item.id}`
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[0]}
          contentContainerStyle={styles.searchContent}
          renderItem={({ item }) => (
            <FoodResultRow
              food={item}
              onPress={() => handleSelectFood(item)}
              onEdit={() => openCustomFoodForm(item)}
              styles={styles}
              colors={colors}
              t={t}
            />
          )}
          ListHeaderComponent={
            <View style={styles.searchHeader}>
              <View style={styles.header}>
                <View style={styles.headerText}>
                  <Text style={styles.title}>{t("Add a food")}</Text>

                  <Text style={styles.subtitle}>
                    {t("Search for the food baby ate")}
                  </Text>
                </View>
              </View>

              <View style={styles.searchBar}>
                <Ionicons
                  name="search-outline"
                  size={21}
                  color={colors.textSecondary}
                />

                <BottomSheetTextInput
                  ref={searchInputRef}
                  value={search}
                  onChangeText={setSearch}
                  placeholder={t("Search for a food")}
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="search"
                  autoCapitalize="sentences"
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
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                ) : null}
              </View>
            </View>
          }
          ListFooterComponent={
            canCreateFood ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Create a custom food")}
                onPress={() => openCustomFoodForm()}
                style={({ pressed }) => [
                  styles.createFoodCard,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.createFoodIcon}>
                  <Ionicons name="add" size={21} color={colors.primary} />
                </View>

                <View style={styles.createFoodText}>
                  <Text numberOfLines={1} style={styles.createFoodTitle}>
                    {t('Add "{{foodName}}"', {
                      foodName: search.trim(),
                    })}
                  </Text>

                  <Text style={styles.createFoodDescription}>
                    {t("Create a custom food")}
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
      ) : step === "custom" ? (
        /*
         * ÉTAPE 2 : CRÉER OU MODIFIER UN ALIMENT PERSONNALISÉ
         */
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.customFormContainer}
        >
          <View style={styles.customHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Back")}
              hitSlop={8}
              onPress={closeCustomFoodForm}
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
                {editingFood ? t("Edit custom food") : t("New custom food")}
              </Text>

              <Text style={styles.subtitle}>
                {editingFood
                  ? t("Change the name of this food")
                  : t("Check the name before adding it")}
              </Text>
            </View>
          </View>

          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>{t("Food name")}</Text>

            <View style={styles.customNameField}>
              <BottomSheetTextInput
                ref={customNameInputRef}
                value={customName}
                onChangeText={setCustomName}
                placeholder={t("Food name")}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="sentences"
                autoCorrect={false}
                returnKeyType="done"
                selectionColor={colors.primary}
                onSubmitEditing={() => {
                  if (canSaveCustomFood) {
                    handleSaveCustomFood();
                  }
                }}
                style={styles.customNameInput}
              />

              {customName.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("Clear food name")}
                  hitSlop={8}
                  onPress={() => {
                    setCustomName("");

                    requestAnimationFrame(() => {
                      customNameInputRef.current?.focus();
                    });
                  }}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              ) : null}
            </View>

            {duplicateCustomFood ? (
              <Text style={styles.errorText}>
                {t("A food with this name already exists")}
              </Text>
            ) : null}
          </View>

          <View style={styles.formActions}>
            {editingFood ? (
              <>
                <PrimaryButton
                  title={t("Delete")}
                  variant="destructive"
                  disabled={isSavingCustomFood}
                  onPress={handleDeleteCustomFood}
                  style={styles.formActionButton}
                />

                <PrimaryButton
                  title={t("Save changes")}
                  disabled={!canSaveCustomFood}
                  loading={isSavingCustomFood}
                  onPress={handleSaveCustomFood}
                  style={styles.formActionButton}
                />
              </>
            ) : (
              <PrimaryButton
                title={t("Add this food")}
                disabled={!canSaveCustomFood}
                loading={isSavingCustomFood}
                onPress={handleSaveCustomFood}
              />
            )}
          </View>
        </BottomSheetScrollView>
      ) : (
        /*
         * ÉTAPE 3 : CHOISIR LA QUANTITÉ
         */
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.detailsContent}
        >
          <View style={styles.detailsHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Back")}
              hitSlop={10}
              onPress={() =>
                runAfterKeyboardHidden(() => {
                  setSelectedFood(null);
                  setAmount("");
                  setSelectedFraction(null);
                  setUnit("piece");
                  setStep("search");

                  setTimeout(() => {
                    searchInputRef.current?.focus();
                  }, 150);
                })
              }
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={colors.textPrimary}
              />
            </Pressable>

            <Text style={styles.detailsTitle}>{t("Food details")}</Text>

            <View style={styles.headerPlaceholder} />
          </View>

          <View style={styles.selectedFoodCard}>
            <FoodIllustration food={selectedFood} styles={styles} />

            <View style={styles.selectedFoodText}>
              <Text numberOfLines={1} style={styles.selectedFoodName}>
                {selectedFood?.name}
              </Text>

              <Text style={styles.optionalLabel}>
                {t("Quantity is optional")}
              </Text>
            </View>

            {selectedFood?.isCustom ? (
              <View style={styles.customPill}>
                <Text style={styles.customPillText}>{t("Custom")}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>{t("Quick quantity")}</Text>

            <View style={styles.fractionOptions}>
              {FRACTION_OPTIONS.map((option, index) => {
                const isSelected = selectedFraction === option.id;
                const isLastOption = index === FRACTION_OPTIONS.length - 1;

                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => handleSelectFraction(option)}
                    style={({ pressed }) => [
                      styles.fractionOption,
                      isLastOption && styles.fractionOptionLast,
                      isSelected && styles.fractionOptionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.fractionLabel,
                        isSelected && styles.fractionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>{t("Precise quantity")}</Text>

            <View style={styles.quantityRow}>
              <View style={styles.amountField}>
                <BottomSheetTextInput
                  value={amount}
                  onChangeText={(nextAmount) => {
                    const sanitizedAmount = nextAmount.replace(/[^0-9.,]/g, "");

                    setAmount(sanitizedAmount);
                    setSelectedFraction(null);
                  }}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  selectionColor={colors.primary}
                  style={styles.amountInput}
                />
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.unitOptions}
              >
                {UNIT_OPTIONS.map((option) => {
                  const isSelected = unit === option.id;

                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => setUnit(option.id)}
                      style={({ pressed }) => [
                        styles.unitOption,
                        isSelected && styles.unitOptionSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.unitLabel,
                          isSelected && styles.unitLabelSelected,
                        ]}
                      >
                        {t(option.label)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          <PrimaryButton title={t("Add this food")} onPress={handleAddFood} />
        </BottomSheetScrollView>
      )}
    </BottomSheetModal>
  );
});

export default AddFoodSheet;

function FoodResultRow({ food, onPress, onEdit, styles, colors, t }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={food.name}
      onPress={onPress}
      style={({ pressed }) => [styles.foodResult, pressed && styles.pressed]}
    >
      <FoodIllustration food={food} styles={styles} />

      <View style={styles.foodResultInformation}>
        <View style={styles.foodResultNameRow}>
          <Text numberOfLines={1} style={styles.foodResultName}>
            {food.name}
          </Text>

          {food.isCustom ? (
            <View style={styles.customPill}>
              <Text style={styles.customPillText}>{t("Custom")}</Text>
            </View>
          ) : null}
        </View>

        {food.isCustom ? (
          <Text style={styles.personalFoodLabel}>{t("Personal food")}</Text>
        ) : null}
      </View>

      {food.isCustom ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Edit custom food")}
          hitSlop={10}
          onPress={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          style={({ pressed }) => [
            styles.editFoodButton,
            pressed && styles.editFoodButtonPressed,
          ]}
        >
          <FontAwesome6 name="pen" size={15} color={colors.primary} />
        </Pressable>
      ) : (
        <View style={styles.foodResultAdd}>
          <Ionicons name="add" size={18} color={colors.primary} />
        </View>
      )}
    </Pressable>
  );
}

function FoodIllustration({ food, styles }) {
  return (
    <View style={styles.foodIllustrationContainer}>
      {food?.image ? (
        <Image
          source={food.image}
          resizeMode="contain"
          style={styles.foodIllustration}
        />
      ) : (
        <Text style={styles.foodEmoji}>{food?.emoji ?? "🥣"}</Text>
      )}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
    },

    handleIndicator: {
      backgroundColor: colors.border,
      width: 42,
    },

    searchContent: {
      paddingBottom: 6,
      paddingHorizontal: 20,
    },

    /**
     * Sticky list header: it needs an opaque background and to bleed over the
     * list padding so results scroll behind it instead of next to it.
     */
    searchHeader: {
      backgroundColor: colors.white,
      gap: 14,
      marginHorizontal: -20,
      paddingBottom: 14,
      paddingHorizontal: 20,
    },

    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },

    headerText: {
      flex: 1,
    },

    title: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 18,
    },

    subtitle: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      marginTop: 3,
    },

    closeButton: {
      alignItems: "center",
      backgroundColor: colors.lightBlue,
      borderRadius: 999,
      height: 34,
      justifyContent: "center",
      marginLeft: 12,
      width: 34,
    },

    searchBar: {
      alignItems: "center",
      backgroundColor: colors.lightBlue,
      borderColor: colors.border,
      borderRadius: 17,
      borderWidth: 1,
      flexDirection: "row",
      minHeight: 52,
      paddingHorizontal: 14,
    },

    /**
     * Hauteur explicite + `padding: 0`, sans `textAlignVertical` ni
     * `includeFontPadding` : c’est le seul réglage où le placeholder tombe à la
     * même hauteur que le texte saisi (cf. MedicationPickerSheet). Toucher au
     * font padding ou au stretch décale le placeholder vers le bas.
     */
    searchInput: {
      flex: 1,
      height: 50,
      marginLeft: 10,
      padding: 0,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      color: colors.textPrimary,
    },
    foodResult: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderRadius: 15,
      borderWidth: 1,
      flexDirection: "row",
      marginBottom: 8,
      minHeight: 60,
      paddingHorizontal: 10,
    },

    foodIllustrationContainer: {
      alignItems: "center",
      backgroundColor: colors.lightBlue,
      borderRadius: 12,
      height: 42,
      justifyContent: "center",
      width: 42,
    },

    foodIllustration: {
      height: 36,
      width: 36,
    },

    foodEmoji: {
      fontSize: 26,
    },

    foodResultAdd: {
      alignItems: "center",
      backgroundColor: `${colors.primary}12`,
      borderRadius: 999,
      height: 30,
      justifyContent: "center",
      width: 30,
    },

    createFoodCard: {
      alignItems: "center",
      backgroundColor: colors.selectedBackground,
      borderColor: `${colors.primary}35`,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: "row",
      marginBottom: 8,
      marginTop: 6,
      minHeight: 54,
      paddingHorizontal: 12,
    },

    createFoodIcon: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderRadius: 11,
      height: 34,
      justifyContent: "center",
      width: 34,
    },

    createFoodText: {
      flex: 1,
      marginHorizontal: 10,
    },

    createFoodTitle: {
      color: colors.primary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 12,
    },

    createFoodDescription: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      marginTop: 2,
    },

    noResults: {
      alignItems: "center",
      paddingVertical: 18,
    },

    noResultsIcon: {
      alignItems: "center",
      backgroundColor: colors.lightBlue,
      borderRadius: 999,
      height: 44,
      justifyContent: "center",
      width: 44,
    },

    noResultsTitle: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 13,
      marginTop: 8,
    },

    noResultsDescription: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      marginTop: 3,
    },

    detailsContent: {
      gap: 18,
      paddingBottom: 24,
      paddingHorizontal: 20,
    },

    detailsHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },

    backButton: {
      alignItems: "center",
      backgroundColor: colors.lightBlue,
      borderRadius: 999,
      height: 34,
      justifyContent: "center",
      width: 34,
    },

    detailsTitle: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 16,
    },

    headerPlaceholder: {
      width: 34,
    },

    selectedFoodCard: {
      alignItems: "center",
      backgroundColor: colors.lightBlue,
      borderColor: colors.border,
      borderRadius: 17,
      borderWidth: 1,
      flexDirection: "row",
      minHeight: 68,
      paddingHorizontal: 12,
    },

    selectedFoodText: {
      flex: 1,
      marginLeft: 11,
    },

    selectedFoodName: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 14,
    },

    optionalLabel: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      marginTop: 3,
    },

    customPill: {
      backgroundColor: `${colors.primary}14`,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },

    customPillText: {
      color: colors.primary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 9,
    },

    detailsSection: {
      gap: 10,
    },

    sectionTitle: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 13,
    },

    fractionOptions: {
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderRadius: 15,
      borderWidth: 1,
      flexDirection: "row",
      minHeight: 50,
      overflow: "hidden",
    },

    fractionOption: {
      alignItems: "center",
      borderColor: colors.border,
      borderRightWidth: 1,
      flex: 1,
      justifyContent: "center",
    },

    fractionOptionSelected: {
      backgroundColor: colors.selectedBackground,
    },

    fractionLabel: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 15,
    },

    fractionLabelSelected: {
      color: colors.primary,
      fontFamily: "PlusJakartaSans_700Bold",
    },

    quantityRow: {
      gap: 10,
    },

    amountField: {
      alignItems: "center",
      backgroundColor: colors.lightBlue,
      borderColor: colors.border,
      borderRadius: 15,
      borderWidth: 1,
      flexDirection: "row",
      minHeight: 50,
      paddingHorizontal: 14,
    },

    amountInput: {
      color: colors.textPrimary,
      flex: 1,
      height: 48,
      padding: 0,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
    },

    unitOptions: {
      gap: 7,
      paddingRight: 10,
    },

    unitOption: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 39,
      paddingHorizontal: 13,
    },

    unitOptionSelected: {
      backgroundColor: colors.selectedBackground,
      borderColor: `${colors.primary}65`,
    },

    unitLabel: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 10,
    },

    unitLabelSelected: {
      color: colors.primary,
      fontFamily: "PlusJakartaSans_700Bold",
    },

    addButton: {
      alignItems: "center",
      backgroundColor: colors.primary,
      borderRadius: 16,
      flexDirection: "row",
      gap: 7,
      justifyContent: "center",
      minHeight: 52,
    },

    addButtonPressed: {
      opacity: 0.8,
    },

    addButtonLabel: {
      color: colors.white,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 14,
    },

    pressed: {
      opacity: 0.7,
    },
    foodResultInformation: {
      flex: 1,
      marginHorizontal: 11,
      gap: 3,
    },

    foodResultNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },

    foodResultName: {
      flexShrink: 1,
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
    },

    personalFoodLabel: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
    },

    editFoodButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 21,
      backgroundColor: `${colors.primary}18`,
    },

    editFoodButtonPressed: {
      opacity: 0.75,
      transform: [{ scale: 0.94 }],
    },

    customFormContainer: {
      paddingHorizontal: 20,
      paddingBottom: 24,
      gap: 22,
    },

    customHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    fractionOptionLast: {
      borderRightWidth: 0,
    },

    customHeaderInformation: {
      flex: 1,
    },

    fieldSection: {
      gap: 8,
    },

    fieldLabel: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 12,
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
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      color: colors.textPrimary,
    },
    errorText: {
      color: colors.error,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
    },

    formActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    formActionButton: {
      flex: 1,
      width: undefined,
    },
  });
