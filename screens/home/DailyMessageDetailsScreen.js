import { useMemo } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import BackButton from "../../components/ui/BackButton";
import PrimaryButton from "../../components/ui/PrimaryButton";

import { useThemeColors } from "../../theme/useThemeColors";

const SUPPORTED_SECTION_TYPES = [
  "paragraph",
  "bulletList",
  "numberedList",
  "highlight",
];

const DAILY_MESSAGE_ILLUSTRATIONS = {
  nightSleep: require("../../assets/illustrations/dailyMessages/nightSleep.png"),
  daytimeNap: require("../../assets/illustrations/dailyMessages/daytimeNap.png"),
  breastfeeding: require("../../assets/illustrations/dailyMessages/breastFeeding.png"),
  bottleFeeding: require("../../assets/illustrations/dailyMessages/bottleFeeding.png"),
  solidFood: require("../../assets/illustrations/dailyMessages/solidFood.png"),
  growth: require("../../assets/illustrations/dailyMessages/growth.png"),
  motorDevelopment: require("../../assets/illustrations/dailyMessages/motorDevelopment.png"),
  learning: require("../../assets/illustrations/dailyMessages/learning.png"),
  communication: require("../../assets/illustrations/dailyMessages/communication.png"),
  playtime: require("../../assets/illustrations/dailyMessages/playtime.png"),
  teething: require("../../assets/illustrations/dailyMessages/teething.png"),
  healthAndComfort: require("../../assets/illustrations/dailyMessages/healthAndComfort.png"),
  babyCare: require("../../assets/illustrations/dailyMessages/babyCare.png"),
  parentSupport: require("../../assets/illustrations/dailyMessages/parentSupport.png"),
};

function SectionHeader({ section, colors, styles }) {
  if (!section.title) {
    return null;
  }

  return (
    <View style={styles.sectionHeader}>
      {section.icon ? (
        <View style={styles.sectionIconContainer}>
          <Ionicons name={section.icon} size={18} color={colors.primary} />
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );
}

function ParagraphSection({ section, colors, styles }) {
  return (
    <View style={styles.section}>
      <SectionHeader section={section} colors={colors} styles={styles} />

      <Text style={styles.paragraph}>{section.content}</Text>
    </View>
  );
}

function BulletListSection({ section, colors, styles }) {
  return (
    <View style={styles.section}>
      <SectionHeader section={section} colors={colors} styles={styles} />

      <View style={styles.list}>
        {section.items?.map((item, index) => (
          <View key={`${section.id}-${index}`} style={styles.listItem}>
            <View style={styles.bullet} />

            <Text style={styles.listItemText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function NumberedListSection({ section, colors, styles }) {
  return (
    <View style={styles.section}>
      <SectionHeader section={section} colors={colors} styles={styles} />

      <View style={styles.list}>
        {section.items?.map((item, index) => (
          <View key={`${section.id}-${index}`} style={styles.listItem}>
            <View style={styles.numberContainer}>
              <Text style={styles.number}>{index + 1}</Text>
            </View>

            <Text style={styles.listItemText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function HighlightSection({ section, colors, styles }) {
  return (
    <View style={styles.highlight}>
      {section.icon ? (
        <Ionicons name={section.icon} size={21} color={colors.primary} />
      ) : null}

      <Text style={styles.highlightText}>{section.content}</Text>
    </View>
  );
}

function DailyMessageSection({ section, colors, styles }) {
  if (!SUPPORTED_SECTION_TYPES.includes(section.type)) {
    return null;
  }

  switch (section.type) {
    case "paragraph":
      return (
        <ParagraphSection section={section} colors={colors} styles={styles} />
      );

    case "bulletList":
      return (
        <BulletListSection section={section} colors={colors} styles={styles} />
      );

    case "numberedList":
      return (
        <NumberedListSection
          section={section}
          colors={colors}
          styles={styles}
        />
      );

    case "highlight":
      return (
        <HighlightSection section={section} colors={colors} styles={styles} />
      );

    default:
      return null;
  }
}

export default function DailyMessageDetailScreen({ navigation, route }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const message = route.params?.message;

  const illustrationSource = message?.illustration
    ? (DAILY_MESSAGE_ILLUSTRATIONS[message.illustration] ?? null)
    : null;

  const handleAskNelo = () => {
    if (!message?.askNeloPrompt) {
      return;
    }

    // À remplacer plus tard par l’ouverture réelle du copilote.
    Alert.alert(t("Ask Nelo"), message.askNeloPrompt);

    // Exemple futur :
    // navigation.navigate("Nelo", {
    //   initialQuestion: message.askNeloPrompt,
    // });
  };

  const handleOpenSource = async (source) => {
    if (!source?.url) {
      return;
    }

    const canOpen = await Linking.canOpenURL(source.url);

    if (!canOpen) {
      Alert.alert(t("Unable to open this link"));
      return;
    }

    await Linking.openURL(source.url);
  };

  if (!message) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {t("This daily message is unavailable.")}
          </Text>

          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.emptyButton}>{t("Go back")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />

        <Text style={styles.headerTitle} numberOfLines={1}>
          {t("A little note for today")}
        </Text>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/*
          Plus tard, l’illustration viendra ici :

          {message.illustration ? (
            <DailyMessageIllustration
              illustrationId={message.illustration}
            />
          ) : null}
        */}

        {illustrationSource ? (
          <View style={styles.illustrationContainer}>
            <Image
              source={illustrationSource}
              resizeMode="contain"
              style={styles.illustration}
            />
          </View>
        ) : null}

        <Text style={styles.title}>{message.title}</Text>

        <Text style={styles.summary}>{message.summary}</Text>

        {message.contextLabel ? (
          <View style={styles.contextLabel}>
            <Ionicons name="person-outline" size={16} color={colors.primary} />

            <Text style={styles.contextLabelText}>{message.contextLabel}</Text>
          </View>
        ) : null}

        <View style={styles.sections}>
          {message.sections?.map((section, index) => (
            <View key={section.id ?? `${section.type}-${index}`}>
              {index > 0 ? <View style={styles.separator} /> : null}

              <DailyMessageSection
                section={section}
                colors={colors}
                styles={styles}
              />
            </View>
          ))}
        </View>

        {message.sources?.length > 0 ? (
          <View style={styles.sources}>
            <Text style={styles.sourcesTitle}>{t("Sources")}</Text>

            {message.sources.map((source) => (
              <Pressable
                key={source.id}
                accessibilityRole="link"
                onPress={() => handleOpenSource(source)}
                style={({ pressed }) => [
                  styles.sourceButton,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.sourceContent}>
                  <Text style={styles.sourceLabel}>{source.label}</Text>

                  {source.publisher ? (
                    <Text style={styles.sourcePublisher}>
                      {source.publisher}
                    </Text>
                  ) : null}
                </View>

                <Ionicons
                  name="open-outline"
                  size={18}
                  color={colors.primary}
                />
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.primaryButtonContainer}>
          <PrimaryButton
            title={t("Ask Nelo about this")}
            icon={
              <Ionicons
                name="sparkles-outline"
                size={21}
                color={colors.white}
              />
            }
            onPress={handleAskNelo}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.gotItButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.gotItButtonText}>{t("Got it")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.lightBackground ?? colors.background,
    },

    header: {
      height: 62,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",

      paddingHorizontal: 20,
    },

    headerTitle: {
      flex: 1,

      marginHorizontal: 12,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 15,
      lineHeight: 21,
      textAlign: "center",

      color: colors.textPrimary,
    },

    headerPlaceholder: {
      width: 42,
    },

    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 48,
    },

    categoryIcon: {
      width: 54,
      height: 54,

      alignItems: "center",
      justifyContent: "center",

      marginBottom: 20,

      borderRadius: 27,
      backgroundColor: colors.selectedBackground,
    },

    title: {
      maxWidth: 340,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 30,
      lineHeight: 39,

      color: colors.textPrimary,
    },

    summary: {
      marginTop: 14,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 16,
      lineHeight: 25,

      color: colors.textSecondary,
    },

    contextLabel: {
      alignSelf: "flex-start",

      flexDirection: "row",
      alignItems: "center",
      gap: 7,

      marginTop: 18,
      paddingHorizontal: 12,
      paddingVertical: 8,

      borderRadius: 18,
      backgroundColor: colors.selectedBackground,
    },

    contextLabelText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      lineHeight: 17,

      color: colors.primary,
    },

    sections: {
      marginTop: 34,
    },

    separator: {
      height: 1,

      marginVertical: 28,

      backgroundColor: colors.border,
    },

    section: {},

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,

      marginBottom: 16,
    },

    sectionIconContainer: {
      width: 34,
      height: 34,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 17,
      backgroundColor: colors.selectedBackground,
    },

    sectionTitle: {
      flex: 1,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
      lineHeight: 27,

      color: colors.textPrimary,
    },

    paragraph: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 15,
      lineHeight: 24,

      color: colors.textSecondary,
    },

    list: {
      gap: 15,
    },

    listItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 13,
    },

    bullet: {
      width: 7,
      height: 7,

      marginTop: 8,

      borderRadius: 4,
      backgroundColor: colors.primary,
    },

    numberContainer: {
      width: 28,
      height: 28,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 14,
      backgroundColor: colors.selectedBackground,
    },

    number: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 13,

      color: colors.primary,
    },

    listItemText: {
      flex: 1,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 15,
      lineHeight: 23,

      color: colors.textPrimary,
    },

    highlight: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,

      padding: 16,

      borderRadius: 18,
      backgroundColor: colors.selectedBackground,
    },

    highlightText: {
      flex: 1,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      lineHeight: 22,

      color: colors.textPrimary,
    },

    sources: {
      marginTop: 34,
      paddingTop: 26,

      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    sourcesTitle: {
      marginBottom: 12,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,

      color: colors.textSecondary,
    },

    sourceButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,

      paddingVertical: 8,
    },

    sourceContent: {
      flex: 1,
    },

    sourceLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 20,

      color: colors.textPrimary,
    },

    sourcePublisher: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 17,

      color: colors.textSecondary,
    },

    primaryButton: {
      minHeight: 56,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,

      marginTop: 38,
      paddingHorizontal: 20,

      borderRadius: 18,
      backgroundColor: colors.primary,
    },

    primaryButtonPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.99 }],
    },

    primaryButtonText: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      lineHeight: 21,

      color: colors.white,
    },

    gotItButton: {
      alignItems: "center",
      justifyContent: "center",

      minHeight: 48,
      marginTop: 8,
    },

    gotItButtonText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 20,

      color: colors.primary,
    },

    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",

      paddingHorizontal: 30,
    },

    emptyText: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 15,
      lineHeight: 23,
      textAlign: "center",

      color: colors.textSecondary,
    },

    emptyButton: {
      marginTop: 16,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,

      color: colors.primary,
    },

    pressed: {
      opacity: 0.72,
    },

    illustrationContainer: {
      height: 180,

      alignItems: "center",
      justifyContent: "center",

      marginBottom: 22,
    },

    illustration: {
      width: "100%",
      height: "100%",
    },

    primaryButtonContainer: {
      marginTop: 38,
    },
  });
