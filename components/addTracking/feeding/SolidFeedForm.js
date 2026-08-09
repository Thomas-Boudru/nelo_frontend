import { useMemo } from "react";
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

const AMOUNT_OPTIONS = [
  {
    id: "tasted",
    label: "Just tasted",
  },
  {
    id: "little",
    label: "A little",
  },
  {
    id: "half",
    label: "About half",
  },
  {
    id: "most",
    label: "Almost all",
  },
];

const REACTION_OPTIONS = [
  {
    id: "liked",
    label: "Liked it",
    icon: "happy-outline",
    color: "#4E83F7",
    backgroundColor: "#EDF4FF",
  },
  {
    id: "neutral",
    label: "Neutral",
    icon: "remove-outline",
    color: "#E4AD38",
    backgroundColor: "#FFF6D9",
  },
  {
    id: "disliked",
    label: "Did not like it",
    icon: "sad-outline",
    color: "#E97878",
    backgroundColor: "#FFF0F0",
  },
];

export default function SolidsFeedForm({
  value,
  onChange,
  childName,
  onPressAddFoods,
  onPressEditFood,
  onPressNote,
  onPressPhoto,
}) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const foods = value?.foods ?? [];
  const hasNote = Boolean(value?.note?.trim());
  const hasPhoto = Boolean(value?.photo);

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

            <Pressable
              onPress={onPressAddFoods}
              style={({ pressed }) => [
                styles.addMoreCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.addMoreIcon}>
                <Ionicons name="add" size={22} color={colors.primary} />
              </View>

              <Text style={styles.addMoreLabel}>{t("Add more")}</Text>
            </Pressable>
          </ScrollView>
        ) : (
          <ScrollView
            horizontal
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.foodsList}
          >
            <FoodPlaceholder styles={styles} width={112} />
            <FoodPlaceholder styles={styles} width={100} />
            <FoodPlaceholder styles={styles} width={108} />
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("Amount eaten")}</Text>

        <View style={styles.amountSelector}>
          {AMOUNT_OPTIONS.map((option, index) => {
            const isSelected = value?.amountEaten === option.id;
            const isLast = index === AMOUNT_OPTIONS.length - 1;

            return (
              <Pressable
                key={option.id}
                onPress={() =>
                  patchEntry({
                    amountEaten: isSelected ? null : option.id,
                  })
                }
                style={({ pressed }) => [
                  styles.amountOption,
                  !isLast && styles.amountOptionBorder,
                  isSelected && styles.amountOptionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
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
        </View>
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
                  isSelected && styles.reactionOptionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.reactionIllustration,
                    {
                      backgroundColor: option.backgroundColor,
                      borderColor: `${option.color}45`,
                    },
                  ]}
                >
                  <Ionicons name={option.icon} size={30} color={option.color} />
                </View>

                <Text
                  style={[
                    styles.reactionLabel,
                    isSelected && styles.reactionLabelSelected,
                  ]}
                >
                  {t(option.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View
          style={[
            styles.notePhotoCard,
            (hasNote || hasPhoto) && styles.notePhotoCardActive,
          ]}
        >
          <Pressable
            onPress={onPressNote}
            style={({ pressed }) => [
              styles.noteAction,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.notePhotoIcon,
                hasNote && styles.notePhotoIconActive,
              ]}
            >
              <Ionicons
                name={hasNote ? "document-text" : "document-text-outline"}
                size={21}
                color={hasNote ? colors.primary : colors.textSecondary}
              />
            </View>

            <View style={styles.noteTextContent}>
              <Text
                numberOfLines={1}
                style={[
                  styles.notePhotoTitle,
                  hasNote && styles.notePhotoTitleActive,
                ]}
              >
                {hasNote
                  ? t("Edit note or add a photo")
                  : t("Add a note or a photo")}
              </Text>

              {hasNote ? (
                <Text numberOfLines={1} style={styles.notePreview}>
                  {value.note}
                </Text>
              ) : null}
            </View>
          </Pressable>

          <View style={styles.actionDivider} />

          <Pressable
            hitSlop={8}
            onPress={onPressPhoto}
            style={({ pressed }) => [
              styles.photoAction,
              pressed && styles.pressed,
            ]}
          >
            {hasPhoto ? (
              <View style={styles.photoPreviewContainer}>
                <Image
                  source={
                    typeof value.photo === "string"
                      ? { uri: value.photo }
                      : value.photo
                  }
                  resizeMode="cover"
                  style={styles.photoPreview}
                />

                <View style={styles.photoEditBadge}>
                  <Ionicons name="camera" size={12} color={colors.primary} />
                </View>
              </View>
            ) : (
              <Ionicons
                name="camera-outline"
                size={25}
                color={colors.primary}
              />
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.timeSection}>
        <DateTimeRow
          value={value?.feedingDate ?? new Date()}
          isNow={!value?.isDateEdited}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      </View>
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

function FoodPlaceholder({ styles, width }) {
  return (
    <View style={[styles.foodPlaceholder, { width }]}>
      <View style={styles.placeholderIllustration} />

      <View style={styles.placeholderContent}>
        <View style={styles.placeholderName} />
        <View style={styles.placeholderQuantity} />
      </View>
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

    addMoreCard: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderRadius: 17,
      borderStyle: "dashed",
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 112,
      width: 88,
    },

    addMoreIcon: {
      alignItems: "center",
      backgroundColor: `${colors.primary}12`,
      borderRadius: 999,
      height: 36,
      justifyContent: "center",
      width: 36,
    },

    addMoreLabel: {
      color: colors.primary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 10,
      marginTop: 8,
    },

    foodPlaceholder: {
      alignItems: "center",
      backgroundColor: colors.lightBlue,
      borderColor: colors.border,
      borderRadius: 17,
      borderWidth: 1,
      flexDirection: "row",
      minHeight: 65,
      opacity: 0.66,
      paddingHorizontal: 10,
    },

    placeholderIllustration: {
      backgroundColor: colors.border,
      borderRadius: 12,
      height: 39,
      width: 39,
    },

    placeholderContent: {
      flex: 1,
      gap: 6,
      marginLeft: 8,
    },

    placeholderName: {
      backgroundColor: colors.border,
      borderRadius: 999,
      height: 8,
      width: "85%",
    },

    placeholderQuantity: {
      backgroundColor: colors.border,
      borderRadius: 999,
      height: 6,
      width: "58%",
    },

    amountSelector: {
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: "row",
      minHeight: 54,
      overflow: "hidden",

      elevation: 1,
      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.04,
      shadowRadius: 5,
    },

    amountOption: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 4,
    },

    amountOptionBorder: {
      borderColor: colors.border,
      borderRightWidth: 1,
    },

    amountOptionSelected: {
      backgroundColor: colors.selectedBackground,
    },

    amountOptionLabel: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 10,
      textAlign: "center",
    },

    amountOptionLabelSelected: {
      color: colors.primary,
      fontFamily: "PlusJakartaSans_700Bold",
    },

    reactionOptions: {
      flexDirection: "row",
      gap: 10,
    },

    reactionOption: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderRadius: 17,
      borderWidth: 1,
      flex: 1,
      justifyContent: "center",
      minHeight: 104,
      paddingHorizontal: 5,
      paddingVertical: 11,
    },

    reactionOptionSelected: {
      backgroundColor: colors.selectedBackground,
      borderColor: colors.primary,
    },

    reactionIllustration: {
      alignItems: "center",
      borderRadius: 999,
      borderWidth: 1,
      height: 48,
      justifyContent: "center",
      width: 48,
    },

    reactionLabel: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 10,
      marginTop: 8,
      textAlign: "center",
    },

    reactionLabelSelected: {
      color: colors.primary,
      fontFamily: "PlusJakartaSans_700Bold",
    },

    notePhotoCard: {
      alignItems: "stretch",
      backgroundColor: colors.lightBlue,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      flexDirection: "row",
      minHeight: 68,
      paddingHorizontal: 14,
    },

    notePhotoCardActive: {
      borderColor: `${colors.primary}50`,
    },

    noteAction: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
    },

    notePhotoIcon: {
      alignItems: "center",
      backgroundColor: `${colors.textSecondary}0D`,
      borderRadius: 13,
      height: 40,
      justifyContent: "center",
      width: 40,
    },

    notePhotoIconActive: {
      backgroundColor: `${colors.primary}12`,
    },

    noteTextContent: {
      flex: 1,
      marginLeft: 11,
    },

    notePhotoTitle: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
    },

    notePhotoTitleActive: {
      color: colors.textPrimary,
    },

    notePreview: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      marginTop: 3,
    },

    actionDivider: {
      backgroundColor: colors.border,
      marginVertical: 14,
      width: 1,
    },

    photoAction: {
      alignItems: "center",
      justifyContent: "center",
      paddingLeft: 14,
      width: 52,
    },

    photoPreviewContainer: {
      position: "relative",
    },

    photoPreview: {
      borderRadius: 10,
      height: 39,
      width: 39,
    },

    photoEditBadge: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      bottom: -4,
      height: 20,
      justifyContent: "center",
      position: "absolute",
      right: -4,
      width: 20,
    },

    timeSection: {
      marginTop: "auto",
    },

    pressed: {
      opacity: 0.7,
    },
  });
