import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import TrackingSearchBar from "./TrackingSearchBar.js";
import TrackingTypeCard from "./TrackingTypeCard.js";

import { mockTrackingTypeSections } from "../../../data/mockTrackingData.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

/*
 * La recherche porte sur les libellés traduits, pas sur les clés,
 * afin qu'une recherche en français trouve bien « Sommeil ».
 */
function getSearchableText(item, t) {
  return [
    item.titleKey ? t(item.titleKey) : item.title,
    item.subtitleKey ? t(item.subtitleKey) : item.subtitle,
    item.metadataKey ? t(item.metadataKey) : item.metadata,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function TrackingByTypeView({ onPressTrackingType }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [searchQuery, setSearchQuery] = useState("");

  const visibleSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return mockTrackingTypeSections;
    }

    return mockTrackingTypeSections
      .map((section) => ({
        ...section,

        items: section.items.filter((item) =>
          getSearchableText(item, t).includes(query),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [searchQuery, t]);

  return (
    <View style={styles.container}>
      <TrackingSearchBar value={searchQuery} onChangeText={setSearchQuery} />

      {visibleSections.length > 0 ? (
        visibleSections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {section.titleKey ? t(section.titleKey) : section.title}
            </Text>

            <View style={styles.sectionItems}>
              {section.items.map((item) => (
                <TrackingTypeCard
                  key={item.id}
                  item={item}
                  variant={item.variant}
                  onPress={onPressTrackingType}
                />
              ))}
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
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
      /*
       * Pas de padding horizontal ici : TrackingSearchBar
       * porte déjà sa propre marge.
       */
      paddingTop: 2,
    },

    section: {
      marginTop: 22,

      paddingHorizontal: 20,
    },

    sectionTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 16,
      lineHeight: 22,

      color: colors.textPrimary,
    },

    sectionItems: {
      marginTop: 12,

      gap: 10,
    },

    emptyState: {
      marginTop: 40,

      alignItems: "center",

      paddingHorizontal: 34,
    },

    emptyTitle: {
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
  });
