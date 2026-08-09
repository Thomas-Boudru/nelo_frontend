import { useMemo, useRef } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import DateTimeRow from "../DateTimeRow.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";
import FeedingDetailsSheet from "../../../screens/addTracking/Feeding/FeedingDetailSheet.js";

const HAPPY_REACTION_IMAGE = require("../../../assets/illustrations/tracking/happyFace.png");
const NEUTRAL_REACTION_IMAGE = require("../../../assets/illustrations/tracking/neutralFace.png");
const UNHAPPY_REACTION_IMAGE = require("../../../assets/illustrations/tracking/angryFace.png");

const AMOUNT_OPTIONS = [
  { id: "tasted", label: "Just tasted" },
  { id: "little", label: "A little" },
  { id: "half", label: "About half" },
  { id: "almost_all", label: "Almost all" },
  { id: "all", label: "All" },
];

const REACTION_OPTIONS = [
  {
    id: "liked",
    label: "Liked it",
    image: HAPPY_REACTION_IMAGE,

    backgroundColor: "#F1FAF5",
    selectedBackgroundColor: "#E7F7EE",

    borderColor: "#CBEBD8",
    selectedBorderColor: "#69C893",

    labelColor: "#39865C",
  },
  {
    id: "neutral",
    label: "Neutral",
    image: NEUTRAL_REACTION_IMAGE,

    backgroundColor: "#FFF9EB",
    selectedBackgroundColor: "#FFF3D4",

    borderColor: "#F1DCA8",
    selectedBorderColor: "#E5AE42",

    labelColor: "#A6741F",
  },
  {
    id: "disliked",
    label: "Did not like it",
    image: UNHAPPY_REACTION_IMAGE,

    backgroundColor: "#FFF3F2",
    selectedBackgroundColor: "#FFE9E7",

    borderColor: "#F2CBC7",
    selectedBorderColor: "#E9776E",

    labelColor: "#B8544D",
  },
];

export default function SolidsFeedForm({
  value,
  onChange,
  childName,
  onPressAddFoods,
  onPressEditFood,
}) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const feedingDetailsSheetRef = useRef(null);

  const foods = value?.foods ?? [];
  const amountEaten = value?.amountEaten ?? "tasted";
  const hasNote = Boolean(value?.note?.trim());
  const hasPhotos = Array.isArray(value?.photos) && value.photos.length > 0;
  const hasDetails = hasNote || hasPhotos;

  const handleOpenDetails = () => {
    feedingDetailsSheetRef.current?.present({
      note: value?.note ?? "",
      photos: value?.photos ?? [],
    });
  };

  const handleAddNote = () => {
    feedingDetailsSheetRef.current?.present({
      note: value?.note ?? "",
      photos: value?.photos ?? [],
    });
  };

  const patchEntry = (patch) => {
    onChange?.({
      ...value,
      ...patch,
    });
  };

  const handleRemoveFood = (foodId) => {
    patchEntry({
      foods: foods.filter((food) => food.id !== foodId),
    });
  };

  const handleDateChange = (feedingDate) => {
    patchEntry({
      feedingDate,
      isDateEdited: true,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {childName
            ? t("What did child eat?", { childName })
            : t("What did baby eat?")}
        </Text>

        <Pressable
          onPress={onPressAddFoods}
          style={({ pressed }) => [
            styles.foodSearchButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="search-outline"
            size={24}
            color={colors.textSecondary}
          />

          <Text style={styles.foodSearchLabel}>{t("Add a food")}</Text>

          <View style={styles.addFoodIcon}>
            <Ionicons name="add" size={18} color={colors.primary} />
          </View>
        </Pressable>

        {foods.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.foodsList}
          >
            {foods.map((food) => (
              <FoodCard
                key={food.id}
                food={food}
                onPress={() => onPressEditFood?.(food)}
                onRemove={() => handleRemoveFood(food.id)}
                colors={colors}
                styles={styles}
              />
            ))}
          </ScrollView>
        ) : (
          <ScrollView
            horizontal
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.foodsList}
          >
            <FoodPlaceholder styles={styles} />
            <FoodPlaceholder styles={styles} />
            <FoodPlaceholder styles={styles} />
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("Amount eaten")}</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.amountSelector}
        >
          {AMOUNT_OPTIONS.map((option) => {
            const isSelected = amountEaten === option.id;

            return (
              <Pressable
                key={option.id}
                onPress={() => patchEntry({ amountEaten: option.id })}
                style={({ pressed }) => [
                  styles.amountOption,
                  isSelected && styles.amountOptionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.amountOptionLabel,
                    isSelected && styles.amountOptionLabelSelected,
                  ]}
                >
                  {t(option.label)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {childName
            ? t("How did child react?", { childName })
            : t("How did baby react?")}
        </Text>

        <View style={styles.reactionOptions}>
          {REACTION_OPTIONS.map((option) => {
            const isSelected = value?.appreciation === option.id;

            return (
              <Pressable
                key={option.id}
                onPress={() =>
                  patchEntry({
                    appreciation: isSelected ? null : option.id,
                  })
                }
                style={({ pressed }) => [
                  styles.reactionOption,
                  {
                    backgroundColor: isSelected
                      ? option.selectedBackgroundColor
                      : "transparent",
                    borderColor: isSelected
                      ? option.selectedBorderColor
                      : colors.border,
                  },
                  isSelected && styles.reactionOptionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Image
                  source={option.image}
                  resizeMode="contain"
                  style={[
                    styles.reactionImage,
                    isSelected && styles.reactionImageSelected,
                  ]}
                />

                <Text
                  style={[
                    styles.reactionLabel,
                    {
                      color: isSelected
                        ? option.labelColor
                        : colors.textPrimary,
                    },
                    isSelected && styles.reactionLabelSelected,
                  ]}
                >
                  {t(option.label)}
                </Text>

                {isSelected ? (
                  <View
                    style={[
                      styles.reactionSelectedBadge,
                      {
                        backgroundColor: option.selectedBorderColor,
                      },
                    ]}
                  >
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Add a note or photos")}
          onPress={handleOpenDetails}
          style={({ pressed }) => [
            styles.detailsCard,
            hasDetails && styles.detailsCardActive,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.detailsIcon}>
            <Ionicons
              name="document-text-outline"
              size={21}
              color={colors.primary}
            />
          </View>

          <Text numberOfLines={1} style={styles.detailsTitle}>
            {hasDetails ? t("Edit note or photos") : t("Add a note or photos")}
          </Text>

          {hasDetails ? (
            <View style={styles.detailsActiveDot} />
          ) : (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textSecondary}
            />
          )}
        </Pressable>
      </View>

      <View style={styles.timeSection}>
        <DateTimeRow
          value={value?.feedingDate ?? new Date()}
          isNow={!value?.isDateEdited}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      </View>

      <FeedingDetailsSheet
        ref={feedingDetailsSheetRef}
        onSave={({ note, photos }) => {
          patchEntry({
            note,
            photos,
          });
        }}
      />
    </View>
  );
}

function FoodCard({ food, onPress, onRemove, colors, styles }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.foodCard, pressed && styles.pressed]}
    >
      <Pressable
        hitSlop={8}
        onPress={(event) => {
          event.stopPropagation();
          onRemove?.();
        }}
        style={({ pressed }) => [
          styles.removeFoodButton,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="close" size={13} color={colors.textSecondary} />
      </Pressable>

      <View style={styles.foodIllustrationContainer}>
        {food.image ? (
          <Image
            source={food.image}
            resizeMode="contain"
            style={styles.foodIllustration}
          />
        ) : (
          <Text style={styles.foodEmoji}>{food.emoji ?? "🥣"}</Text>
        )}
      </View>

      <Text numberOfLines={1} style={styles.foodName}>
        {food.name}
      </Text>

      {food.quantity ? (
        <Text numberOfLines={1} style={styles.foodQuantity}>
          {food.quantity}
        </Text>
      ) : null}
    </Pressable>
  );
}

function FoodPlaceholder({ styles }) {
  return (
    <View style={styles.foodPlaceholder}>
      <View style={styles.placeholderIllustration} />

      <View style={styles.placeholderName} />
      <View style={styles.placeholderQuantity} />
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: 22,
      paddingBottom: 6,
      paddingTop: 0,
    },

    section: {
      gap: 12,
    },

    sectionTitle: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
    },

    foodSearchButton: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      flexDirection: "row",
      minHeight: 58,
      paddingHorizontal: 16,

      elevation: 2,
      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.05,
      shadowRadius: 8,
    },

    foodSearchLabel: {
      color: colors.textSecondary,
      flex: 1,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      marginLeft: 12,
    },

    addFoodIcon: {
      alignItems: "center",
      backgroundColor: `${colors.primary}12`,
      borderRadius: 999,
      height: 30,
      justifyContent: "center",
      width: 30,
    },

    foodsList: {
      gap: 10,
      paddingBottom: 2,
      paddingRight: 4,
    },

    foodCard: {
      alignItems: "center",
      backgroundColor: colors.lightBlue,
      borderColor: colors.border,
      borderRadius: 17,
      borderWidth: 1,
      minHeight: 112,
      paddingBottom: 9,
      paddingHorizontal: 8,
      paddingTop: 8,
      position: "relative",
      width: 100,
    },

    removeFoodButton: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 21,
      justifyContent: "center",
      position: "absolute",
      right: 5,
      top: 5,
      width: 21,
      zIndex: 2,
    },

    foodIllustrationContainer: {
      alignItems: "center",
      height: 52,
      justifyContent: "center",
      width: 56,
    },

    foodIllustration: {
      height: "100%",
      width: "100%",
    },

    foodEmoji: {
      fontSize: 35,
    },

    foodName: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 11,
      marginTop: 3,
      maxWidth: "100%",
    },

    foodQuantity: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 9,
      marginTop: 3,
      maxWidth: "100%",
    },

    foodPlaceholder: {
      alignItems: "center",
      backgroundColor: colors.lightBlue,
      borderColor: colors.border,
      borderRadius: 17,
      borderWidth: 1,
      minHeight: 112,
      opacity: 0.55,
      paddingBottom: 9,
      paddingHorizontal: 8,
      paddingTop: 8,
      width: 100,
    },

    placeholderIllustration: {
      backgroundColor: colors.border,
      borderRadius: 15,
      height: 52,
      width: 56,
    },

    placeholderName: {
      backgroundColor: colors.border,
      borderRadius: 999,
      height: 8,
      marginTop: 7,
      width: 62,
    },

    placeholderQuantity: {
      backgroundColor: colors.border,
      borderRadius: 999,
      height: 6,
      marginTop: 6,
      width: 39,
    },

    amountSelector: {
      gap: 8,
      paddingRight: 16,
    },

    amountOption: {
      alignItems: "center",
      backgroundColor: "transparent",
      borderColor: colors.border,
      borderRadius: 13,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 40,
      paddingHorizontal: 14,
    },

    amountOptionSelected: {
      backgroundColor: colors.selectedBackground,
      borderColor: colors.primary,
    },

    amountOptionLabel: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 11,
    },

    amountOptionLabelSelected: {
      color: colors.primary,
      fontFamily: "PlusJakartaSans_700Bold",
    },

    reactionOptions: {
      flexDirection: "row",
      gap: 9,
    },

    reactionOption: {
      alignItems: "center",
      backgroundColor: "transparent",
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      flex: 1,
      justifyContent: "center",
      minHeight: 96,
      paddingHorizontal: 4,
      paddingVertical: 8,
      position: "relative",
    },

    reactionOptionSelected: {
      borderWidth: 1.5,
    },

    reactionImage: {
      height: 66,
      width: 66,
    },

    reactionImageSelected: {
      transform: [{ scale: 1.03 }],
    },

    reactionLabel: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 9,
      marginTop: 2,
      textAlign: "center",
    },

    reactionLabelSelected: {
      fontFamily: "PlusJakartaSans_700Bold",
    },

    reactionSelectedBadge: {
      alignItems: "center",
      borderColor: "#FFFFFF",
      borderRadius: 999,
      borderWidth: 2,
      height: 19,
      justifyContent: "center",
      position: "absolute",
      right: 5,
      top: 5,
      width: 19,
    },

    timeSection: {
      marginTop: "auto",
    },

    pressed: {
      opacity: 0.7,
    },

    detailsCard: {
      alignItems: "center",
      backgroundColor: colors.lightBlue,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      flexDirection: "row",
      minHeight: 68,
      paddingHorizontal: 14,
    },

    detailsCardActive: {
      borderColor: `${colors.primary}50`,
    },

    detailsIcon: {
      alignItems: "center",
      backgroundColor: `${colors.primary}14`,
      borderRadius: 13,
      height: 40,
      justifyContent: "center",
      width: 40,
    },

    detailsTitle: {
      color: colors.textPrimary,
      flex: 1,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      marginLeft: 11,
      marginRight: 12,
    },

    detailsActiveDot: {
      backgroundColor: colors.primary,
      borderColor: colors.white,
      borderRadius: 999,
      borderWidth: 2,
      height: 12,
      width: 12,
    },

    pressed: {
      opacity: 0.72,
    },
  });
