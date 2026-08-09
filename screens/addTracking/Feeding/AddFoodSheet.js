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
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  FOODS,
  normalizeFoodSearch,
  getFoodSearchTerms,
} from "../../../data/foods.js";

import { useThemeColors } from "../../../theme/useThemeColors.js";

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

const AddFoodSheet = forwardRef(function AddFoodSheet({ onAddFood }, ref) {
  const { t, i18n } = useTranslation();

  const currentLanguage =
    i18n.resolvedLanguage?.split("-")[0] ??
    i18n.language?.split("-")[0] ??
    "en";

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const modalRef = useRef(null);
  const searchInputRef = useRef(null);
  const keyboardHideSubscriptionRef = useRef(null);
  const keyboardHideTimeoutRef = useRef(null);

  const [step, setStep] = useState("search");
  const [search, setSearch] = useState("");
  const [selectedFood, setSelectedFood] = useState(null);
  const [amount, setAmount] = useState("");
  const [selectedFraction, setSelectedFraction] = useState(null);
  const [unit, setUnit] = useState("piece");

  const translatedFoods = useMemo(
    () =>
      FOODS.map((food) => ({
        ...food,
        name: t(food.translationKey),
      })),
    [t, i18n.resolvedLanguage],
  );

  const filteredFoods = useMemo(() => {
    const normalizedSearch = normalizeFoodSearch(search);

    if (!normalizedSearch) {
      return translatedFoods.slice(0, 5);
    }

    return translatedFoods
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

        return {
          food,
          score,
        };
      })
      .filter(({ score }) => score > 0)
      .sort((first, second) => second.score - first.score)
      .map(({ food }) => food);
  }, [currentLanguage, search, translatedFoods]);

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

  const handleCreateFood = () => {
    const name = search.trim();

    if (!name) return;

    handleSelectFood({
      id: `custom-${Date.now()}`,
      name,
      emoji: "🥣",
      image: null,
      suggestedUnit: "piece",
      isCustom: true,
    });
  };

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

  const getDisplayQuantity = () => {
    if (!amount.trim()) {
      return "";
    }

    const fraction = FRACTION_OPTIONS.find(
      (option) => option.id === selectedFraction,
    );

    const displayedAmount = fraction?.label ?? amount.trim();

    if (unit === "piece") {
      return `${displayedAmount} ${t("piece")}`;
    }

    if (unit === "g" || unit === "ml") {
      return `${displayedAmount} ${unit}`;
    }

    return `${displayedAmount} ${t(
      UNIT_OPTIONS.find((option) => option.id === unit)?.label ?? unit,
    ).toLocaleLowerCase()}`;
  };

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
        <BottomSheetView style={styles.searchContent}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{t("Add a food")}</Text>

              <Text style={styles.subtitle}>
                {t("Search for the food baby ate")}
              </Text>
            </View>

            <Pressable
              hitSlop={10}
              onPress={() => modalRef.current?.dismiss()}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
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
              style={styles.searchInput}
            />

            {search.length > 0 ? (
              <Pressable
                hitSlop={8}
                onPress={() => setSearch("")}
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

          <BottomSheetFlatList
            data={filteredFoods}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.resultsList}
            style={styles.results}
            renderItem={({ item }) => (
              <FoodResultRow
                food={item}
                onPress={() => handleSelectFood(item)}
                styles={styles}
                colors={colors}
              />
            )}
            ListEmptyComponent={
              <View style={styles.noResults}>
                <View style={styles.noResultsIcon}>
                  <Ionicons
                    name="search-outline"
                    size={22}
                    color={colors.textSecondary}
                  />
                </View>

                <Text style={styles.noResultsTitle}>{t("No food found")}</Text>

                <Text style={styles.noResultsDescription}>
                  {t("You can add this food yourself")}
                </Text>
              </View>
            }
          />

          {search.trim() ? (
            <Pressable
              onPress={handleCreateFood}
              style={({ pressed }) => [
                styles.createFoodCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.createFoodIcon}>
                <Ionicons name="add" size={21} color={colors.primary} />
              </View>

              <View style={styles.createFoodText}>
                <Text style={styles.createFoodTitle}>
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
          ) : null}
        </BottomSheetView>
      ) : (
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.detailsContent}
        >
          <View style={styles.detailsHeader}>
            <Pressable
              hitSlop={10}
              onPress={() =>
                runAfterKeyboardHidden(() => {
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
              {FRACTION_OPTIONS.map((option) => {
                const isSelected = selectedFraction === option.id;

                return (
                  <Pressable
                    key={option.id}
                    onPress={() => handleSelectFraction(option)}
                    style={({ pressed }) => [
                      styles.fractionOption,
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
                    setAmount(nextAmount);
                    setSelectedFraction(null);
                  }}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  style={styles.amountInput}
                />
              </View>

              <View style={styles.unitOptions}>
                {UNIT_OPTIONS.map((option) => {
                  const isSelected = unit === option.id;

                  return (
                    <Pressable
                      key={option.id}
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
              </View>
            </View>
          </View>

          <Pressable
            onPress={handleAddFood}
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
            ]}
          >
            <Ionicons name="add" size={20} color={colors.white} />

            <Text style={styles.addButtonLabel}>{t("Add this food")}</Text>
          </Pressable>
        </BottomSheetScrollView>
      )}
    </BottomSheetModal>
  );
});

export default AddFoodSheet;

function FoodResultRow({ food, onPress, styles, colors }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.foodResult, pressed && styles.pressed]}
    >
      <FoodIllustration food={food} styles={styles} />

      <Text numberOfLines={1} style={styles.foodResultName}>
        {food.name}
      </Text>

      <View style={styles.foodResultAdd}>
        <Ionicons name="add" size={18} color={colors.primary} />
      </View>
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
      gap: 14,
      maxHeight: 430,
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

    searchInput: {
      color: colors.textPrimary,
      flex: 1,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      marginLeft: 10,
      paddingHorizontal: 0,
      paddingVertical: 0,
    },

    results: {
      maxHeight: 205,
    },

    resultsList: {
      gap: 8,
      paddingBottom: 2,
    },

    foodResult: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderRadius: 15,
      borderWidth: 1,
      flexDirection: "row",
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

    foodResultName: {
      color: colors.textPrimary,
      flex: 1,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      marginHorizontal: 11,
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
      minHeight: 62,
      paddingHorizontal: 12,
    },

    createFoodIcon: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderRadius: 12,
      height: 38,
      justifyContent: "center",
      width: 38,
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
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      paddingVertical: 0,
    },

    unitOptions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
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
  });
