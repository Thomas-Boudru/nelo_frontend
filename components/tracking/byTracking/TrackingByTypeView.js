import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import TrackingSearchBar from "./TrackingSearchBar.js";

import { mockTrackingTypeSections } from "../../../data/mockTrackingData.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const DEFAULT_QUICK_ACCESS_IDS = ["sleep", "bottle", "diaper"];

function getTranslatedValue(item, keyName, valueName, t) {
  if (item?.[keyName]) {
    return t(item[keyName]);
  }

  return item?.[valueName] ?? "";
}

function getItemTitle(item, t) {
  return getTranslatedValue(item, "titleKey", "title", t);
}

function getItemSubtitle(item, t) {
  return getTranslatedValue(item, "subtitleKey", "subtitle", t);
}

function getItemMetadata(item, t) {
  return getTranslatedValue(item, "metadataKey", "metadata", t);
}

function getSearchableText(item, t) {
  return [
    getItemTitle(item, t),
    getItemSubtitle(item, t),
    getItemMetadata(item, t),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

function getAllItems(sections) {
  return sections.flatMap((section) => section.items ?? []);
}

function findItemByIdentifier(items, identifier) {
  const normalizedIdentifier = String(identifier ?? "").toLocaleLowerCase();

  return items.find((item) => {
    const possibleIdentifiers = [
      item.id,
      item.type,
      item.trackingType,
      item.category,
    ]
      .filter(Boolean)
      .map((value) => String(value).toLocaleLowerCase());

    return possibleIdentifiers.includes(normalizedIdentifier);
  });
}

function getQuickAccessItems(sections, quickAccessTypeIds) {
  const allItems = getAllItems(sections);

  const selectedItems = quickAccessTypeIds
    .map((identifier) => findItemByIdentifier(allItems, identifier))
    .filter(Boolean);

  const uniqueItems = [];

  selectedItems.forEach((item) => {
    const alreadyIncluded = uniqueItems.some(
      (selectedItem) => selectedItem.id === item.id,
    );

    if (!alreadyIncluded) {
      uniqueItems.push(item);
    }
  });

  if (uniqueItems.length < 3) {
    allItems.forEach((item) => {
      if (uniqueItems.length >= 3) {
        return;
      }

      const alreadyIncluded = uniqueItems.some(
        (selectedItem) => selectedItem.id === item.id,
      );

      if (!alreadyIncluded) {
        uniqueItems.push(item);
      }
    });
  }

  return uniqueItems.slice(0, 3);
}

function getItemBackgroundColor(item, colors) {
  return (
    item.backgroundColor ??
    item.iconBackgroundColor ??
    colors.lightBlue ??
    "#EFF4FF"
  );
}

function getItemAccentColor(item, colors) {
  return item.color ?? item.iconColor ?? item.accentColor ?? colors.primary;
}

function getFallbackIconName(item) {
  const itemId = String(item?.id ?? item?.type ?? "").toLocaleLowerCase();

  if (itemId.includes("sleep")) {
    return "moon-outline";
  }

  if (itemId.includes("bottle") || itemId.includes("feeding")) {
    return "water-outline";
  }

  if (itemId.includes("breast")) {
    return "body-outline";
  }

  if (itemId.includes("solid") || itemId.includes("meal")) {
    return "restaurant-outline";
  }

  if (itemId.includes("diaper") || itemId.includes("potty")) {
    return "water-outline";
  }

  if (itemId.includes("mood")) {
    return "happy-outline";
  }

  if (itemId.includes("medication")) {
    return "medkit-outline";
  }

  if (itemId.includes("vaccine")) {
    return "shield-checkmark-outline";
  }

  if (itemId.includes("temperature")) {
    return "thermometer-outline";
  }

  if (itemId.includes("symptom")) {
    return "pulse-outline";
  }

  if (itemId.includes("teething")) {
    return "happy-outline";
  }

  if (
    itemId.includes("growth") ||
    itemId.includes("weight") ||
    itemId.includes("height")
  ) {
    return "analytics-outline";
  }

  if (itemId.includes("note")) {
    return "document-text-outline";
  }

  return "grid-outline";
}

function TrackingTypeIllustration({ item, size, colors, styles }) {
  const backgroundColor = getItemBackgroundColor(item, colors);

  const accentColor = getItemAccentColor(item, colors);

  const imageSource = item.image ?? item.iconImage ?? item.illustration ?? null;

  return (
    <View
      style={[
        styles.illustrationContainer,
        {
          width: size,
          height: size,
          borderRadius: size * 0.3,
          backgroundColor,
        },
      ]}
    >
      {imageSource ? (
        <Image
          source={imageSource}
          resizeMode="contain"
          style={{
            width: size * 0.68,
            height: size * 0.68,
          }}
        />
      ) : (
        <Ionicons
          name={getFallbackIconName(item)}
          size={size * 0.48}
          color={accentColor}
        />
      )}
    </View>
  );
}

function QuickAccessCard({ item, onPress, colors, styles, t }) {
  const title = getItemTitle(item, t);

  const metadata = getItemMetadata(item, t) || getItemSubtitle(item, t);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => onPress?.(item)}
      style={({ pressed }) => [
        styles.quickAccessCard,
        pressed && styles.pressed,
      ]}
    >
      <TrackingTypeIllustration
        item={item}
        size={52}
        colors={colors}
        styles={styles}
      />

      <Text numberOfLines={1} style={styles.quickAccessTitle}>
        {title}
      </Text>

      {metadata ? (
        <Text numberOfLines={1} style={styles.quickAccessMetadata}>
          {metadata}
        </Text>
      ) : null}
    </Pressable>
  );
}

function CompactTrackingTypeRow({ item, isLast, onPress, colors, styles, t }) {
  const title = getItemTitle(item, t);

  const metadata = getItemMetadata(item, t) || getItemSubtitle(item, t);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => onPress?.(item)}
      style={({ pressed }) => [
        styles.trackingRow,
        !isLast && styles.trackingRowBorder,
        pressed && styles.rowPressed,
      ]}
    >
      <TrackingTypeIllustration
        item={item}
        size={48}
        colors={colors}
        styles={styles}
      />

      <View style={styles.trackingRowContent}>
        <Text numberOfLines={1} style={styles.trackingRowTitle}>
          {title}
        </Text>

        {metadata ? (
          <Text numberOfLines={1} style={styles.trackingRowMetadata}>
            {metadata}
          </Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

export default function TrackingByTypeView({
  onPressTrackingType,

  /*
   * Plus tard, cette liste pourra venir du store :
   * - types les plus consultés ;
   * - types récemment consultés ;
   * - éléments épinglés par l’utilisateur.
   */
  quickAccessTypeIds = DEFAULT_QUICK_ACCESS_IDS,
}) {
  const { t } = useTranslation();

  const colors = useThemeColors();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [searchQuery, setSearchQuery] = useState("");

  const quickAccessItems = useMemo(
    () => getQuickAccessItems(mockTrackingTypeSections, quickAccessTypeIds),
    [quickAccessTypeIds],
  );

  const visibleSections = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();

    if (!query) {
      return mockTrackingTypeSections;
    }

    return mockTrackingTypeSections
      .map((section) => ({
        ...section,

        items: (section.items ?? []).filter((item) =>
          getSearchableText(item, t).includes(query),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [searchQuery, t]);

  const handlePressItem = (item) => {
    onPressTrackingType?.(item);
  };
  const isSearching = searchQuery.trim().length > 0;

  return (
    <View style={styles.container}>
      <TrackingSearchBar value={searchQuery} onChangeText={setSearchQuery} />

      {!isSearching && quickAccessItems.length > 0 ? (
        <View style={styles.quickAccessSection}>
          <Text style={styles.sectionTitle}>{t("Quick access")}</Text>

          <View style={styles.quickAccessGrid}>
            {quickAccessItems.map((item) => (
              <QuickAccessCard
                key={`quick-${item.id}`}
                item={item}
                onPress={handlePressItem}
                colors={colors}
                styles={styles}
                t={t}
              />
            ))}
          </View>
        </View>
      ) : null}

      {visibleSections.length > 0 ? (
        visibleSections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {section.titleKey ? t(section.titleKey) : section.title}
            </Text>

            <View style={styles.sectionCard}>
              {section.items.map((item, index) => (
                <CompactTrackingTypeRow
                  key={item.id}
                  item={item}
                  isLast={index === section.items.length - 1}
                  onPress={handlePressItem}
                  colors={colors}
                  styles={styles}
                  t={t}
                />
              ))}
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="search-outline" size={27} color={colors.primary} />
          </View>

          <Text style={styles.emptyTitle}>{t("No tracking found")}</Text>

          <Text style={styles.emptyDescription}>
            {t("Try searching for another tracking type or note.")}
          </Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      paddingTop: 2,
      paddingBottom: 24,
    },

    quickAccessSection: {
      marginTop: 22,
      paddingHorizontal: 20,
    },

    section: {
      marginTop: 24,
      paddingHorizontal: 20,
    },

    sectionTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 16,
      lineHeight: 22,
      color: colors.textPrimary,
    },

    quickAccessGrid: {
      flexDirection: "row",
      gap: 9,
      marginTop: 12,
    },

    quickAccessCard: {
      flex: 1,
      minWidth: 0,
      minHeight: 126,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 7,
      paddingVertical: 12,
      borderRadius: 20,
      backgroundColor: colors.white,
    },

    illustrationContainer: {
      alignItems: "center",
      justifyContent: "center",
    },

    quickAccessTitle: {
      maxWidth: "100%",
      marginTop: 9,
      textAlign: "center",
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 12,
      lineHeight: 17,
      color: colors.textPrimary,
    },

    quickAccessMetadata: {
      maxWidth: "100%",
      marginTop: 3,
      textAlign: "center",
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 9,
      lineHeight: 13,
      color: colors.textSecondary,
    },

    sectionCard: {
      overflow: "hidden",
      marginTop: 11,
      borderRadius: 20,
      backgroundColor: colors.white,
    },

    trackingRow: {
      minHeight: 70,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 9,
    },

    trackingRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border ?? "#E7ECF4",
    },

    trackingRowContent: {
      flex: 1,
      minWidth: 0,
      marginLeft: 12,
      marginRight: 8,
    },

    trackingRowTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 13,
      lineHeight: 18,
      color: colors.textPrimary,
    },

    trackingRowMetadata: {
      marginTop: 2,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 15,
      color: colors.textSecondary,
    },

    emptyState: {
      alignItems: "center",
      marginTop: 42,
      paddingHorizontal: 34,
    },

    emptyIcon: {
      width: 54,
      height: 54,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 18,
      backgroundColor: colors.lightBlue ?? "#EDF3FF",
    },

    emptyTitle: {
      marginTop: 13,
      textAlign: "center",
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      lineHeight: 21,
      color: colors.textPrimary,
    },

    emptyDescription: {
      marginTop: 6,
      textAlign: "center",
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },

    pressed: {
      opacity: 0.72,
      transform: [{ scale: 0.98 }],
    },

    rowPressed: {
      opacity: 0.68,
      backgroundColor: colors.lightBackground ?? "#F7F9FC",
    },
  });
