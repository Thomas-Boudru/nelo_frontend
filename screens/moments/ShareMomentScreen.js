import { forwardRef, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

import BackButton from "../../components/ui/BackButton.js";
import PrimaryButton from "../../components/ui/PrimaryButton.js";
import { useThemeColors } from "../../theme/useThemeColors.js";

const TEMPLATES = [
  {
    id: "modern",
    label: "Modern",
  },
  {
    id: "pastel",
    label: "Pastel",
  },
  {
    id: "minimal",
    label: "Minimal",
  },
  {
    id: "polaroid",
    label: "Polaroid",
  },
  {
    id: "celebration",
    label: "Celebration",
  },
];

const FORMATS = [
  {
    id: "square",
    label: "Square",
    icon: "square-outline",
  },
  {
    id: "story",
    label: "Story",
    icon: "phone-portrait-outline",
  },
];

const DEFAULT_MOMENT = {
  id: "bath-time",
  childName: "Emma",
  type: "photo",
  title: "Bath time giggles",
  description: "She couldn't stop laughing with her little yellow duck.",
  dateLabel: "August 6, 2026",
  childAgeLabel: "9 months old",
  photo: require("../../assets/images/moments/bath.jpg"),
};

export default function ShareMomentScreen({ navigation, route }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const previewRef = useRef(null);

  const moment = route?.params?.moment ?? DEFAULT_MOMENT;

  const [selectedTemplate, setSelectedTemplate] = useState("modern");
  const [selectedFormat, setSelectedFormat] = useState("square");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateAndShare = async () => {
    if (isGenerating) {
      return;
    }

    setIsGenerating(true);

    try {
      const uri = await captureRef(previewRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      const sharingAvailable = await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        throw new Error(t("Sharing is not available on this device."));
      }

      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: t("Share memory card"),
        UTI: "public.png",
      });
    } catch (error) {
      Alert.alert(
        t("Unable to create memory card"),
        error?.message ?? t("Please try again in a moment."),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{t("Share memory")}</Text>

          <Text style={styles.headerDescription}>
            {t("Create a beautiful card to share")}
          </Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.formatToggle}>
          {FORMATS.map((format) => {
            const selected = selectedFormat === format.id;

            return (
              <Pressable
                key={format.id}
                accessibilityRole="radio"
                accessibilityLabel={t(format.label)}
                accessibilityState={{ selected }}
                onPress={() => setSelectedFormat(format.id)}
                style={({ pressed }) => [
                  styles.formatToggleOption,
                  selected && styles.formatToggleOptionSelected,
                  pressed && styles.formatToggleOptionPressed,
                ]}
              >
                <Ionicons
                  name={format.icon}
                  size={17}
                  color={selected ? colors.primary : colors.textSecondary}
                />

                <Text
                  style={[
                    styles.formatToggleText,
                    selected && styles.formatToggleTextSelected,
                  ]}
                >
                  {t(format.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>{t("Preview")}</Text>

          <View style={styles.previewWrapper}>
            <MemoryCardPreview
              ref={previewRef}
              moment={moment}
              template={selectedTemplate}
              format={selectedFormat}
              colors={colors}
              styles={styles}
              t={t}
            />
          </View>
        </View>

        <View style={styles.templatesSection}>
          <Text style={styles.sectionTitle}>{t("Choose a style")}</Text>

          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.templatesRow}
          >
            {TEMPLATES.map((template) => {
              const selected = template.id === selectedTemplate;

              return (
                <Pressable
                  key={template.id}
                  accessibilityRole="radio"
                  accessibilityLabel={t(template.label)}
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedTemplate(template.id)}
                  style={({ pressed }) => [
                    styles.templateOption,
                    pressed && styles.templateOptionPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.templatePreview,
                      selected && styles.templatePreviewSelected,
                    ]}
                  >
                    <TemplateThumbnail
                      template={template.id}
                      moment={moment}
                      colors={colors}
                      styles={styles}
                    />
                  </View>

                  <Text
                    style={[
                      styles.templateLabel,
                      selected && styles.templateLabelSelected,
                    ]}
                  >
                    {t(template.label)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={t("Generate and share")}
          loading={isGenerating}
          disabled={isGenerating}
          onPress={handleGenerateAndShare}
        />
      </View>
    </SafeAreaView>
  );
}

const MemoryCardPreview = forwardRef(function MemoryCardPreview(
  { moment, template, format, colors, styles, t },
  ref,
) {
  const isStory = format === "story";

  const photoSource = getMomentPhotoSource(moment);
  const hasPhoto = Boolean(photoSource);

  const cardFormatStyle = isStory
    ? styles.memoryCardStory
    : styles.memoryCardSquare;

  if (template === "modern") {
    return (
      <View
        ref={ref}
        collapsable={false}
        style={[styles.memoryCard, cardFormatStyle, styles.modernCard]}
      >
        <View
          style={[
            styles.modernPhotoContainer,
            isStory
              ? styles.modernPhotoContainerStory
              : styles.modernPhotoContainerSquare,
          ]}
        >
          {hasPhoto ? (
            <Image
              source={photoSource}
              resizeMode="cover"
              style={styles.modernPhoto}
            />
          ) : (
            <View style={styles.modernIllustration}>
              <Ionicons
                name={
                  moment.type === "milestone"
                    ? "star-outline"
                    : "create-outline"
                }
                size={52}
                color={colors.primary}
              />
            </View>
          )}

          {hasPhoto ? (
            <LinearGradient
              pointerEvents="none"
              colors={["transparent", "rgba(30, 62, 98, 0.42)"]}
              style={styles.modernPhotoGradient}
            />
          ) : null}

          <Text
            style={[
              styles.modernPhotoDate,
              !hasPhoto && styles.modernPhotoDateWithoutPhoto,
            ]}
          >
            {moment.dateLabel}
          </Text>
        </View>

        <View
          style={[
            styles.modernContent,
            isStory ? styles.modernContentStory : styles.modernContentSquare,
          ]}
        >
          {moment.type === "milestone" ? (
            <View style={styles.modernMilestoneBadge}>
              <Ionicons name="star" size={12} color="#C1871D" />

              <Text style={styles.modernMilestoneText}>{t("Milestone")}</Text>
            </View>
          ) : null}

          {moment.title ? (
            <Text
              style={[styles.modernTitle, isStory && styles.modernTitleStory]}
              numberOfLines={2}
            >
              {moment.title}
            </Text>
          ) : null}

          {moment.description ? (
            <Text
              style={[
                styles.modernDescription,
                isStory && styles.modernDescriptionStory,
              ]}
              numberOfLines={isStory ? 6 : 3}
            >
              {moment.description}
            </Text>
          ) : null}

          <View style={styles.modernFooterInformation}>
            <View style={styles.modernAgeDot} />

            <Text style={styles.modernAge}>
              {moment.childName} · {moment.childAgeLabel}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      ref={ref}
      collapsable={false}
      style={[
        styles.memoryCard,
        cardFormatStyle,
        getMemoryCardStyle(template, colors),
      ]}
    >
      {template === "celebration" ? (
        <View pointerEvents="none" style={styles.cardDecorations}>
          <Ionicons
            name="sparkles"
            size={23}
            color="#F3B34C"
            style={styles.decorationTopLeft}
          />

          <Ionicons
            name="star"
            size={18}
            color="#E98BA1"
            style={styles.decorationTopRight}
          />
        </View>
      ) : null}

      <View style={styles.cardTop}>
        <Text
          style={[
            styles.cardEyebrow,
            template === "minimal" && styles.cardTextMinimal,
          ]}
        >
          {t("Child moment", {
            childName: moment.childName,
          })}
        </Text>

        <Text
          style={[
            styles.cardDate,
            template === "minimal" && styles.cardTextMinimalSecondary,
          ]}
        >
          {moment.dateLabel}
        </Text>
      </View>

      {hasPhoto ? (
        <View
          style={[
            styles.cardPhotoContainer,
            template === "polaroid" && styles.cardPhotoPolaroid,
          ]}
        >
          <Image
            source={photoSource}
            resizeMode="cover"
            style={styles.cardPhoto}
          />
        </View>
      ) : (
        <View style={styles.cardIllustration}>
          <Ionicons
            name={
              moment.type === "milestone" ? "star-outline" : "create-outline"
            }
            size={42}
            color={colors.primary}
          />
        </View>
      )}

      <View style={styles.cardContent}>
        {moment.type === "milestone" ? (
          <View style={styles.milestoneBadge}>
            <Ionicons name="star" size={14} color="#EAAA2B" />

            <Text style={styles.milestoneBadgeText}>{t("Milestone")}</Text>
          </View>
        ) : null}

        {moment.title ? (
          <Text
            style={[
              styles.cardTitle,
              template === "minimal" && styles.cardTextMinimal,
            ]}
            numberOfLines={2}
          >
            {moment.title}
          </Text>
        ) : null}

        {moment.description ? (
          <Text
            style={[
              styles.cardDescription,
              template === "minimal" && styles.cardTextMinimalSecondary,
            ]}
            numberOfLines={isStory ? 4 : 3}
          >
            {moment.description}
          </Text>
        ) : null}

        <View style={styles.cardAgeBadge}>
          <Text style={styles.cardAgeText}>{moment.childAgeLabel}</Text>
        </View>
      </View>
    </View>
  );
});

function TemplateThumbnail({ template, moment, colors, styles }) {
  const photoSource = getMomentPhotoSource(moment);

  if (template === "modern") {
    return (
      <View style={styles.thumbnailModernCard}>
        <View style={styles.thumbnailModernPhotoContainer}>
          {photoSource ? (
            <Image
              source={photoSource}
              resizeMode="cover"
              style={styles.thumbnailModernPhoto}
            />
          ) : (
            <View style={styles.thumbnailModernIllustration}>
              <Ionicons
                name="create-outline"
                size={14}
                color={colors.primary}
              />
            </View>
          )}
        </View>

        <View style={styles.thumbnailModernContent}>
          <View style={styles.thumbnailModernLineLarge} />
          <View style={styles.thumbnailModernLineSmall} />
          <View style={styles.thumbnailModernAgeLine} />
        </View>
      </View>
    );
  }

  if (template === "polaroid") {
    return (
      <View style={[styles.thumbnailCard, styles.thumbnailPolaroidBackground]}>
        <View style={styles.thumbnailPolaroidPaper}>
          {photoSource ? (
            <Image
              source={photoSource}
              resizeMode="cover"
              style={styles.thumbnailPolaroidPhoto}
            />
          ) : null}

          <View style={styles.thumbnailDarkLine} />
        </View>
      </View>
    );
  }

  if (template === "celebration") {
    return (
      <View style={[styles.thumbnailCard, styles.thumbnailCelebration]}>
        <Ionicons name="sparkles" size={13} color="#F3B34C" />

        <View style={styles.thumbnailCelebrationCircle}>
          <Ionicons name="star" size={17} color="#EAAA2B" />
        </View>

        <View style={styles.thumbnailDarkLineLarge} />
        <View style={styles.thumbnailDarkLineSmall} />
      </View>
    );
  }

  const minimal = template === "minimal";

  return (
    <View
      style={[
        styles.thumbnailCard,
        minimal
          ? styles.thumbnailMinimal
          : {
              backgroundColor: colors.selectedBackground,
            },
      ]}
    >
      {photoSource ? (
        <Image
          source={photoSource}
          resizeMode="cover"
          style={styles.thumbnailClassicPhoto}
        />
      ) : (
        <View style={styles.thumbnailClassicIllustration}>
          <Ionicons name="create-outline" size={16} color={colors.primary} />
        </View>
      )}

      <View style={styles.thumbnailDarkLineLarge} />
      <View style={styles.thumbnailDarkLineSmall} />
    </View>
  );
}

function getMomentPhotoSource(moment) {
  return (
    moment.photo ??
    moment.photos?.[0]?.source ??
    (moment.photos?.[0]?.uri
      ? {
          uri: moment.photos[0].uri,
        }
      : null)
  );
}

function getMemoryCardStyle(template, colors) {
  switch (template) {
    case "minimal":
      return {
        backgroundColor: "#FFFFFF",
        borderColor: colors.border,
      };

    case "polaroid":
      return {
        backgroundColor: "#FFFDF8",
        borderColor: "#EDE3D3",
      };

    case "celebration":
      return {
        backgroundColor: "#FFF8E7",
        borderColor: "#F2DBA8",
      };

    case "pastel":
    default:
      return {
        backgroundColor: colors.selectedBackground,
        borderColor: `${colors.primary}30`,
      };
  }
}

const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },

    header: {
      minHeight: 66,

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 20,
    },

    headerTextContainer: {
      flex: 1,
      minWidth: 0,

      alignItems: "center",

      marginHorizontal: 10,
    },

    headerTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 18,
      lineHeight: 24,

      textAlign: "center",

      color: colors.textPrimary,
    },

    headerDescription: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 14,

      textAlign: "center",

      color: colors.textSecondary,
    },

    headerPlaceholder: {
      width: 42,
      height: 42,
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 115,
    },

    formatToggle: {
      flexDirection: "row",

      padding: 4,

      borderRadius: 18,

      backgroundColor: colors.selectedBackground,
    },

    formatToggleOption: {
      flex: 1,
      minHeight: 44,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",

      gap: 7,

      borderRadius: 14,
    },

    formatToggleOptionSelected: {
      backgroundColor: colors.white,

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.06,
      shadowRadius: 8,

      elevation: 2,
    },

    formatToggleOptionPressed: {
      opacity: 0.72,
    },

    formatToggleText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      lineHeight: 17,

      color: colors.textSecondary,
    },

    formatToggleTextSelected: {
      color: colors.primary,
    },

    previewSection: {
      marginTop: 24,
    },

    templatesSection: {
      marginTop: 27,
    },

    sectionTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 16,
      lineHeight: 22,

      color: colors.textPrimary,
    },

    previewWrapper: {
      alignItems: "center",
      justifyContent: "center",

      marginTop: 12,

      paddingHorizontal: 20,
      paddingVertical: 18,

      borderRadius: 24,

      backgroundColor: `${colors.textPrimary}08`,
    },

    memoryCard: {
      position: "relative",

      justifyContent: "space-between",

      padding: 18,

      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 25,

      overflow: "hidden",

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 7,
      },
      shadowOpacity: 0.1,
      shadowRadius: 18,

      elevation: 5,
    },

    memoryCardSquare: {
      width: "100%",
      maxWidth: 330,
      aspectRatio: 1,
    },

    memoryCardStory: {
      width: 245,
      aspectRatio: 9 / 16,
    },

    modernCard: {
      padding: 0,

      justifyContent: "flex-start",

      borderColor: "#C8D9F2",

      backgroundColor: "#DDE9FB",
    },

    modernPhotoContainer: {
      position: "relative",

      width: "100%",

      backgroundColor: "#EFF5FD",

      overflow: "hidden",
    },

    modernPhotoContainerSquare: {
      height: "60%",
    },

    modernPhotoContainerStory: {
      height: "38%",
    },

    modernPhoto: {
      width: "100%",
      height: "100%",
    },

    modernPhotoGradient: {
      position: "absolute",

      left: 0,
      right: 0,
      bottom: 0,

      height: "42%",
    },

    modernPhotoDate: {
      position: "absolute",

      left: 16,
      bottom: 12,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 9,
      lineHeight: 13,

      color: colors.white,
    },

    modernPhotoDateWithoutPhoto: {
      color: colors.textSecondary,
    },

    modernIllustration: {
      width: "100%",
      height: "100%",

      alignItems: "center",
      justifyContent: "center",
    },

    modernContent: {
      flex: 1,

      alignItems: "flex-start",
      justifyContent: "center",

      width: "100%",

      paddingHorizontal: 20,
    },

    modernContentSquare: {
      paddingVertical: 13,
    },

    modernContentStory: {
      paddingVertical: 22,
    },

    modernMilestoneBadge: {
      flexDirection: "row",
      alignItems: "center",

      gap: 5,

      marginBottom: 7,
      paddingHorizontal: 9,
      paddingVertical: 4,

      borderRadius: 12,

      backgroundColor: "#FFF0C6",
    },

    modernMilestoneText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 8,
      lineHeight: 11,

      color: "#C1871D",
    },

    modernTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 21,
      lineHeight: 27,

      color: "#173A67",
    },

    modernTitleStory: {
      fontSize: 23,
      lineHeight: 30,
    },

    modernDescription: {
      marginTop: 5,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 15,

      color: "#526D91",
    },

    modernDescriptionStory: {
      marginTop: 8,

      fontSize: 11,
      lineHeight: 17,
    },

    modernFooterInformation: {
      flexDirection: "row",
      alignItems: "center",

      marginTop: 9,
    },

    modernAgeDot: {
      width: 5,
      height: 5,

      marginRight: 7,

      borderRadius: 3,

      backgroundColor: colors.primary,
    },

    modernAge: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 9,
      lineHeight: 13,

      color: "#4E6F99",
    },

    cardDecorations: {
      ...StyleSheet.absoluteFillObject,
    },

    decorationTopLeft: {
      position: "absolute",
      top: 13,
      left: 13,
    },

    decorationTopRight: {
      position: "absolute",
      top: 18,
      right: 18,
    },

    cardTop: {
      alignItems: "center",
    },

    cardEyebrow: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 11,
      lineHeight: 15,

      textAlign: "center",
      textTransform: "uppercase",
      letterSpacing: 0.6,

      color: colors.primary,
    },

    cardDate: {
      marginTop: 3,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 9,
      lineHeight: 13,

      color: colors.textSecondary,
    },

    cardPhotoContainer: {
      width: "100%",
      flex: 1,
      maxHeight: "48%",

      marginVertical: 13,

      borderRadius: 20,

      backgroundColor: colors.white,

      overflow: "hidden",
    },

    cardPhotoPolaroid: {
      padding: 7,

      borderRadius: 5,

      backgroundColor: colors.white,

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.1,
      shadowRadius: 8,

      elevation: 3,
    },

    cardPhoto: {
      width: "100%",
      height: "100%",

      borderRadius: 14,
    },

    cardIllustration: {
      width: 82,
      height: 82,

      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",

      marginVertical: 18,

      borderRadius: 41,

      backgroundColor: colors.white,
    },

    cardContent: {
      alignItems: "center",
    },

    milestoneBadge: {
      flexDirection: "row",
      alignItems: "center",

      gap: 5,

      marginBottom: 7,
      paddingHorizontal: 9,
      paddingVertical: 4,

      borderRadius: 12,

      backgroundColor: "#FFF0C6",
    },

    milestoneBadgeText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 8,
      lineHeight: 11,

      color: "#C28719",
    },

    cardTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 18,
      lineHeight: 24,

      textAlign: "center",

      color: colors.textPrimary,
    },

    cardDescription: {
      marginTop: 5,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 15,

      textAlign: "center",

      color: colors.textSecondary,
    },

    cardAgeBadge: {
      marginTop: 9,

      paddingHorizontal: 9,
      paddingVertical: 4,

      borderRadius: 11,

      backgroundColor: colors.white,
    },

    cardAgeText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 8,
      lineHeight: 11,

      color: colors.primary,
    },

    cardTextMinimal: {
      color: "#171A20",
    },

    cardTextMinimalSecondary: {
      color: "#6C7280",
    },

    templatesRow: {
      gap: 11,

      paddingTop: 12,
      paddingRight: 20,
    },

    templateOption: {
      width: 82,

      alignItems: "center",
    },

    templateOptionPressed: {
      opacity: 0.72,
    },

    templatePreview: {
      width: 78,
      height: 86,

      padding: 3,

      borderWidth: 2,
      borderColor: "transparent",
      borderRadius: 17,
    },

    templatePreviewSelected: {
      borderColor: colors.primary,
    },

    templateLabel: {
      marginTop: 7,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 14,

      color: colors.textSecondary,
    },

    templateLabelSelected: {
      fontFamily: "PlusJakartaSans_600SemiBold",

      color: colors.primary,
    },

    thumbnailCard: {
      flex: 1,

      alignItems: "center",
      justifyContent: "center",

      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 12,

      backgroundColor: colors.white,

      overflow: "hidden",
    },

    thumbnailModernCard: {
      flex: 1,

      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "#C8D9F2",
      borderRadius: 12,

      backgroundColor: "#DDE9FB",

      overflow: "hidden",
    },

    thumbnailModernPhotoContainer: {
      width: "100%",
      height: "58%",

      backgroundColor: "#EFF5FD",

      overflow: "hidden",
    },

    thumbnailModernPhoto: {
      width: "100%",
      height: "100%",
    },

    thumbnailModernIllustration: {
      flex: 1,

      alignItems: "center",
      justifyContent: "center",
    },

    thumbnailModernContent: {
      flex: 1,

      justifyContent: "center",

      paddingHorizontal: 7,
    },

    thumbnailModernLineLarge: {
      width: "78%",
      height: 4,

      borderRadius: 2,

      backgroundColor: "#173A67",
    },

    thumbnailModernLineSmall: {
      width: "58%",
      height: 3,

      marginTop: 4,

      borderRadius: 2,

      backgroundColor: "#7890B0",
    },

    thumbnailModernAgeLine: {
      width: "42%",
      height: 2,

      marginTop: 5,

      borderRadius: 1,

      backgroundColor: colors.primary,
      opacity: 0.75,
    },

    thumbnailMinimal: {
      backgroundColor: "#FFFFFF",
    },

    thumbnailClassicPhoto: {
      width: 52,
      height: 39,

      marginBottom: 8,

      borderRadius: 7,
    },

    thumbnailClassicIllustration: {
      width: 34,
      height: 34,

      alignItems: "center",
      justifyContent: "center",

      marginBottom: 8,

      borderRadius: 17,

      backgroundColor: colors.selectedBackground,
    },

    thumbnailDarkLineLarge: {
      width: 40,
      height: 4,

      borderRadius: 2,

      backgroundColor: colors.textPrimary,
      opacity: 0.72,
    },

    thumbnailDarkLineSmall: {
      width: 28,
      height: 3,

      marginTop: 4,

      borderRadius: 2,

      backgroundColor: colors.textSecondary,
      opacity: 0.55,
    },

    thumbnailDarkLine: {
      alignSelf: "center",

      width: 28,
      height: 3,

      marginTop: 6,

      borderRadius: 2,

      backgroundColor: colors.textPrimary,
      opacity: 0.65,
    },

    thumbnailPolaroidBackground: {
      backgroundColor: "#F3EEE6",
    },

    thumbnailPolaroidPaper: {
      width: 52,

      padding: 5,
      paddingBottom: 9,

      borderRadius: 2,

      backgroundColor: colors.white,

      transform: [{ rotate: "-3deg" }],
    },

    thumbnailPolaroidPhoto: {
      width: "100%",
      height: 38,
    },

    thumbnailCelebration: {
      backgroundColor: "#FFF8E7",
    },

    thumbnailCelebrationCircle: {
      width: 31,
      height: 31,

      alignItems: "center",
      justifyContent: "center",

      marginVertical: 6,

      borderRadius: 16,

      backgroundColor: "#FFF0C6",
    },

    footer: {
      paddingTop: 12,
      paddingHorizontal: 20,
      paddingBottom: 16,

      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,

      backgroundColor: colors.background,
    },
  });
