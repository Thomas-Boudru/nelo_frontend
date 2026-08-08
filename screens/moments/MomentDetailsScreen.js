import { useMemo, useState } from "react";
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
import { useTranslation } from "react-i18next";

import BackButton from "../../components/ui/BackButton.js";
import { useThemeColors } from "../../theme/useThemeColors.js";
import { useToast } from "../../components/ui/toast/useToast.js";

const MOCK_MOMENTS = {
  "bath-time": {
    id: "bath-time",
    childId: "emma",
    childName: "Emma",
    type: "photo",
    title: "Bath time giggles",
    description:
      "She couldn't stop laughing with her little yellow duck. It was one of those tiny moments I never want to forget.",
    photos: [
      {
        id: "bath-1",
        source: require("../../assets/images/moments/bath.jpg"),
      },
    ],
    happenedAt: "2026-08-06T18:42:00.000Z",
    dateLabel: "August 6, 2026",
    timeLabel: "18:42",
    childAgeLabel: "9 months old",
    author: {
      id: "thomas",
      firstName: "Thomas",
      roleLabel: "Dad",
    },
    canEdit: true,
  },

  "first-tooth": {
    id: "first-tooth",
    childId: "emma",
    childName: "Emma",
    type: "milestone",
    title: "First tooth",
    description: "We finally spotted her first little tooth this morning.",
    milestone: {
      id: "first-tooth",
      label: "First tooth",
      category: "Growth and health",
      icon: "sparkles-outline",
    },
    photos: [],
    happenedAt: "2026-08-06T16:20:00.000Z",
    dateLabel: "August 6, 2026",
    timeLabel: "16:20",
    childAgeLabel: "9 months old",
    author: {
      id: "julie",
      firstName: "Julie",
      roleLabel: "Mom",
    },
    canEdit: true,
  },

  "bottle-note": {
    id: "bottle-note",
    childId: "emma",
    childName: "Emma",
    type: "note",
    title: null,
    description:
      "She fell asleep in my arms after her bottle. She looked so peaceful.",
    photos: [],
    happenedAt: "2026-08-05T14:20:00.000Z",
    dateLabel: "August 5, 2026",
    timeLabel: "14:20",
    childAgeLabel: "9 months old",
    author: {
      id: "grandma",
      firstName: "Sophie",
      roleLabel: "Grandma",
    },
    canEdit: false,
  },
};

export default function MomentDetailsScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const momentId = route?.params?.momentId ?? "bath-time";

  const [moment] = useState(
    route?.params?.moment ??
      MOCK_MOMENTS[momentId] ??
      MOCK_MOMENTS["bath-time"],
  );

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const selectedPhoto = moment.photos?.[selectedPhotoIndex] ?? null;

  const handleEdit = () => {
    navigation.navigate("MomentEditor", {
      mode: "edit",
      type: moment.type,
      childId: moment.childId,
      childName: moment.childName,
      moment: {
        ...moment,
        photos:
          moment.photos?.map((photo) => ({
            id: photo.id,
            uri: photo.uri,
            source: photo.source,
          })) ?? [],
      },
    });
  };

  const handleShare = () => {
    navigation.navigate("ShareMoment", {
      momentId: moment.id,
      moment,
    });
  };

  const confirmDelete = async () => {
    try {
      /*
       * Plus tard :
       * await api.delete(`/moments/${moment.id}`);
       */

      showToast({
        type: "success",
        title: t("Moment deleted"),
        message: t("The moment has been permanently deleted."),
      });

      navigation.goBack();
    } catch (error) {
      showToast({
        type: "error",
        title: t("Unable to delete moment"),
        message: error?.message ?? t("Please try again in a moment."),
      });
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t("Delete moment?"),
      t("This moment will be permanently removed from child story", {
        childName: moment.childName,
      }),
      [
        {
          text: t("Cancel"),
          style: "cancel",
        },
        {
          text: t("Delete"),
          style: "destructive",
          onPress: confirmDelete,
        },
      ],
    );
  };

  const handleOpenMenu = () => {
    if (!moment.canEdit) {
      return;
    }

    Alert.alert(t("Moment options"), undefined, [
      {
        text: t("Edit moment"),
        onPress: () => {
          setTimeout(handleEdit, 200);
        },
      },
      {
        text: t("Delete moment"),
        style: "destructive",
        onPress: () => {
          setTimeout(handleDelete, 200);
        },
      },
      {
        text: t("Cancel"),
        style: "cancel",
      },
    ]);
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />

        <Text style={styles.headerTitle}>{t("Moment")}</Text>

        {moment.canEdit ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Moment options")}
            onPress={handleOpenMenu}
            style={({ pressed }) => [
              styles.menuButton,
              pressed && styles.menuButtonPressed,
            ]}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={colors.textPrimary}
            />
          </Pressable>
        ) : (
          <View style={styles.headerActionPlaceholder} />
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {moment.photos?.length > 0 ? (
          <View style={styles.gallerySection}>
            <View style={styles.mainPhotoContainer}>
              <Image
                source={
                  selectedPhoto?.source ?? {
                    uri: selectedPhoto?.uri,
                  }
                }
                resizeMode="cover"
                style={styles.mainPhoto}
              />

              {moment.photos.length > 1 ? (
                <View style={styles.photoCountBadge}>
                  <Ionicons
                    name="images-outline"
                    size={14}
                    color={colors.white}
                  />

                  <Text style={styles.photoCountText}>
                    {selectedPhotoIndex + 1}/{moment.photos.length}
                  </Text>
                </View>
              ) : null}
            </View>

            {moment.photos.length > 1 ? (
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnails}
              >
                {moment.photos.map((photo, index) => {
                  const selected = index === selectedPhotoIndex;

                  return (
                    <Pressable
                      key={photo.id}
                      accessibilityRole="button"
                      accessibilityLabel={t("View photo number", {
                        number: index + 1,
                      })}
                      onPress={() => setSelectedPhotoIndex(index)}
                      style={[
                        styles.thumbnailContainer,
                        selected && styles.thumbnailContainerSelected,
                      ]}
                    >
                      <Image
                        source={
                          photo.source ?? {
                            uri: photo.uri,
                          }
                        }
                        resizeMode="cover"
                        style={styles.thumbnail}
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
          </View>
        ) : null}

        <View style={styles.content}>
          {moment.title ? (
            <Text style={styles.title}>{moment.title}</Text>
          ) : null}

          {moment.description ? (
            <Text
              style={[
                styles.description,
                moment.type === "note" && styles.noteDescription,
              ]}
            >
              {moment.description}
            </Text>
          ) : null}

          <View style={styles.metadata}>
            <Text style={styles.metadataPrimary}>
              {t("Moment happened on date at time", {
                date: moment.dateLabel,
                time: moment.timeLabel,
              })}
            </Text>

            <Text style={styles.metadataSecondary}>
              {t("Child was age when added by author", {
                childName: moment.childName,
                childAge: moment.childAgeLabel,
                authorName: moment.author.firstName,
              })}
            </Text>
          </View>

          {moment.type === "milestone" && moment.milestone ? (
            <View style={styles.milestoneInformation}>
              <View style={styles.milestoneInformationIcon}>
                <Ionicons
                  name={moment.milestone.icon ?? "star-outline"}
                  size={22}
                  color={colors.primary}
                />
              </View>

              <View style={styles.milestoneInformationText}>
                <Text style={styles.informationLabel}>{t("Milestone")}</Text>

                <Text style={styles.informationValue}>
                  {t(moment.milestone.label)}
                </Text>

                <Text style={styles.informationSecondary}>
                  {t(moment.milestone.category)}
                </Text>
              </View>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Share as a memory card")}
            onPress={handleShare}
            style={({ pressed }) => [
              styles.shareCard,
              pressed && styles.shareCardPressed,
            ]}
          >
            <View style={styles.shareIcon}>
              <Ionicons
                name="color-palette-outline"
                size={20}
                color={colors.primary}
              />
            </View>

            <View style={styles.shareContent}>
              <View style={styles.shareTitleRow}>
                <Text style={styles.shareTitle} numberOfLines={1}>
                  {t("Create a memory card")}
                </Text>

                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumText}>{t("Premium")}</Text>
                </View>
              </View>

              <Text style={styles.shareDescription} numberOfLines={2}>
                {t("Share this moment with family and friends")}
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,

      backgroundColor: colors.background,
    },

    header: {
      minHeight: 64,

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 20,
    },

    headerTitle: {
      flex: 1,

      marginHorizontal: 12,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 18,
      lineHeight: 24,

      textAlign: "center",

      color: colors.textPrimary,
    },

    menuButton: {
      width: 42,
      height: 42,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 21,

      backgroundColor: colors.selectedBackground,
    },

    menuButtonPressed: {
      opacity: 0.7,
    },

    headerActionPlaceholder: {
      width: 42,
      height: 42,
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 50,
    },

    gallerySection: {
      marginBottom: 22,
    },

    mainPhotoContainer: {
      position: "relative",

      width: "100%",
      aspectRatio: 1,

      borderRadius: 25,

      backgroundColor: colors.selectedBackground,

      overflow: "hidden",
    },

    mainPhoto: {
      width: "100%",
      height: "100%",
    },

    photoCountBadge: {
      position: "absolute",

      right: 13,
      bottom: 13,

      flexDirection: "row",
      alignItems: "center",

      gap: 5,

      paddingHorizontal: 10,
      paddingVertical: 7,

      borderRadius: 16,

      backgroundColor: `${colors.textPrimary}C4`,
    },

    photoCountText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 10,
      lineHeight: 14,

      color: colors.white,
    },

    thumbnails: {
      gap: 9,

      paddingTop: 10,
    },

    thumbnailContainer: {
      width: 62,
      height: 62,

      padding: 3,

      borderWidth: 2,
      borderColor: "transparent",
      borderRadius: 17,
    },

    thumbnailContainerSelected: {
      borderColor: colors.primary,
    },

    thumbnail: {
      width: "100%",
      height: "100%",

      borderRadius: 12,
    },

    content: {
      gap: 20,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 24,
      lineHeight: 33,

      color: colors.textPrimary,
    },

    description: {
      marginTop: -10,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      lineHeight: 23,

      color: colors.textSecondary,
    },

    noteDescription: {
      marginTop: 0,

      padding: 19,

      borderWidth: StyleSheet.hairlineWidth,
      borderColor: `${colors.primary}28`,
      borderRadius: 22,

      backgroundColor: colors.selectedBackground,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 17,
      lineHeight: 28,

      color: colors.textPrimary,
    },

    metadata: {
      marginTop: -7,
    },

    metadataPrimary: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 11,
      lineHeight: 17,

      color: colors.textSecondary,
    },

    metadataSecondary: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 17,

      color: colors.textSecondary,
    },

    milestoneInformation: {
      minHeight: 78,

      flexDirection: "row",
      alignItems: "center",

      padding: 15,

      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "#F2DFAE",
      borderRadius: 21,

      backgroundColor: "#FFF9E9",
    },

    milestoneInformationIcon: {
      width: 47,
      height: 47,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 13,

      borderRadius: 24,

      backgroundColor: "#FFF0C6",
    },

    milestoneInformationText: {
      flex: 1,
      minWidth: 0,
    },

    informationLabel: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 14,

      color: colors.textSecondary,
    },

    informationValue: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      lineHeight: 20,

      color: colors.textPrimary,
    },

    informationSecondary: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 14,

      color: colors.textSecondary,
    },

    shareCard: {
      minHeight: 88,

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 15,

      borderWidth: StyleSheet.hairlineWidth,
      borderColor: `${colors.primary}28`,
      borderRadius: 21,

      backgroundColor: colors.selectedBackground,
    },

    shareCardPressed: {
      opacity: 0.75,
      transform: [{ scale: 0.99 }],
    },

    shareIcon: {
      width: 44,
      height: 44,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 12,

      borderRadius: 22,

      backgroundColor: colors.white,
    },

    shareContent: {
      flex: 1,
      minWidth: 0,

      marginRight: 12,
    },

    shareTitleRow: {
      flexDirection: "row",
      alignItems: "center",

      gap: 7,
    },

    shareTitle: {
      flexShrink: 1,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 13,
      lineHeight: 18,

      color: colors.textPrimary,
    },

    premiumBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,

      borderRadius: 9,

      backgroundColor: colors.white,
    },

    premiumText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 8,
      lineHeight: 11,

      color: colors.primary,
    },

    shareDescription: {
      marginTop: 4,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 15,

      color: colors.textSecondary,
    },
  });
