import { useCallback, useMemo, useRef, useState } from "react";
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
import { useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";

import BackButton from "../../components/ui/BackButton.js";
import { useThemeColors } from "../../theme/useThemeColors.js";
import { useAuth } from "../../auth/AuthProvider.js";

import {
  getLocalMoment,
  deleteLocalMoment,
} from "../../database/moments/momentsRepository.js";
import { toMomentDisplay } from "../../utils/momentDisplay.js";

import { processSyncQueue } from "../../sync/processSyncQueue.js";
import { useToast } from "../../components/ui/toast/useToast.js";
import useMemoryCardAccess from "../../hooks/useMemoryCardAccess.js";

function getPhotoSource(photo) {
  if (photo?.source) {
    return photo.source;
  }

  const uri = photo?.uri ?? photo?.url;

  return typeof uri === "string" && uri.trim() ? { uri } : null;
}

export default function MomentDetailsScreen({ navigation, route }) {
  const { t, i18n } = useTranslation();
  const { user, accessToken, refreshSession } = useAuth();
  const { showToast } = useToast();

  const deleteInProgressRef = useRef(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const userId = user?.id ?? null;
  const childId = route?.params?.childId ?? null;
  const momentId = route?.params?.momentId ?? null;

  const child = useSelector((state) =>
    state.children.children.find((item) => item.id === childId),
  );

  const familyId = child?.familyId ?? null;

  const {
    requireAccess: requireMemoryCardAccess,
    checking: checkingMemoryCardAccess,
  } = useMemoryCardAccess({
    familyId,
    childId,
    navigation,
  });

  const requestIdRef = useRef(0);

  const [state, setState] = useState({
    userId: null,
    childId: null,
    momentId: null,
    item: null,
    loading: true,
    error: null,
  });

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const loadMoment = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setState({
      userId,
      childId,
      momentId,
      item: null,
      loading: true,
      error: null,
    });

    try {
      const item = await getLocalMoment({
        userId,
        childId,
        momentId,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      setSelectedPhotoIndex(0);

      setState({
        userId,
        childId,
        momentId,
        item,
        loading: false,
        error: null,
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      console.error("Unable to load local moment:", error);

      setState({
        userId,
        childId,
        momentId,
        item: null,
        loading: false,
        error,
      });
    }
  }, [userId, childId, momentId]);

  useFocusEffect(
    useCallback(() => {
      void loadMoment();

      return () => {
        // Ignorer les lectures terminées après avoir quitté cet écran.
        requestIdRef.current += 1;
      };
    }, [loadMoment]),
  );

  const isCurrentMoment =
    state.userId === userId &&
    state.childId === childId &&
    state.momentId === momentId;

  const moment = useMemo(() => {
    if (!isCurrentMoment || !state.item) {
      return null;
    }

    return toMomentDisplay(state.item, {
      child,
      userId,
      language: i18n.language,
      t,
    });
  }, [isCurrentMoment, state.item, child, userId, i18n.language, t]);

  const photos = moment?.photos ?? [];

  const activePhotoIndex =
    selectedPhotoIndex < photos.length ? selectedPhotoIndex : 0;

  const selectedPhoto = photos[activePhotoIndex] ?? null;
  const selectedPhotoSource = getPhotoSource(selectedPhoto);

  const handleShare = async () => {
    if (!moment || checkingMemoryCardAccess) {
      return;
    }

    const allowed = await requireMemoryCardAccess();

    if (!allowed) {
      return;
    }

    navigation.navigate("ShareMoment", {
      childId,
      familyId,
      momentId: moment.id,
      moment,
    });
  };

  // Pour l'instant, le menu est proposé uniquement à l'auteur.
  // Les autorisations du serveur restent vérifiées à la synchronisation.
  const canManageMoment = Boolean(
    userId && moment?.createdByUserId === userId && !moment?.deletedAt,
  );

  const handleEdit = () => {
    if (!canManageMoment || !state.item || deleteInProgressRef.current) {
      return;
    }

    navigation.navigate("MomentEditor", {
      mode: "edit",
      type: state.item.type,
      childId,
      childName: moment.childName,

      moment: {
        // Utiliser les données originales pour ne pas enregistrer
        // un titre ajouté uniquement pour l'affichage.
        ...state.item,
        description: state.item.story ?? "",

        photos: (state.item.photos ?? []).map((photo) => ({
          ...photo,
          id: photo.attachmentId ?? photo.id,
          uri: photo.uri ?? photo.url ?? null,
        })),

        // L'éditeur attend aussi les propriétés du sélecteur d'étape.
        milestone: moment.milestone,
      },
    });
  };

  const confirmDelete = async () => {
    if (!canManageMoment || !moment?.id || deleteInProgressRef.current) {
      return;
    }

    if (
      !Number.isSafeInteger(moment.localRevision) ||
      moment.localRevision < 1
    ) {
      showToast({
        type: "error",
        title: t("Unable to delete moment"),
        message: t("Reload this moment before deleting it."),
      });

      return;
    }

    deleteInProgressRef.current = true;
    setIsDeleting(true);

    try {
      await deleteLocalMoment({
        userId,
        childId,
        momentId: moment.id,
        expectedLocalRevision: moment.localRevision,
      });
    } catch (error) {
      console.error("Unable to delete moment locally:", error);

      deleteInProgressRef.current = false;
      setIsDeleting(false);

      showToast({
        type: "error",
        title: t("Unable to delete moment"),
        message:
          error?.code === "LOCAL_MOMENT_CHANGED"
            ? t("This moment has changed. Reopen it before deleting.")
            : t("The moment could not be deleted. Please try again."),
      });

      return;
    }

    void processSyncQueue({
      userId,
      accessToken,
      refreshSession,
    }).catch((error) => {
      console.warn("Unable to synchronize moment deletion:", error);
    });

    // Empêcher une lecture déjà en cours de réafficher le souvenir.
    requestIdRef.current += 1;

    try {
      showToast({
        type: "success",
        title: t("Moment deleted"),
        message: t(
          "The moment was removed from this device. The deletion will sync when connected.",
        ),
      });

      navigation.goBack();
    } finally {
      deleteInProgressRef.current = false;
      setIsDeleting(false);
    }
  };

  const handleDelete = () => {
    if (!canManageMoment || deleteInProgressRef.current) {
      return;
    }

    Alert.alert(
      t("Delete moment?"),
      t("This moment will be deleted from {{childName}}'s memories.", {
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
          onPress: () => {
            void confirmDelete();
          },
        },
      ],
    );
  };

  const handleOpenMenu = () => {
    if (!canManageMoment || deleteInProgressRef.current) {
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

  if (!moment) {
    const isLoading = !isCurrentMoment || state.loading;

    return (
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />

          <Text style={styles.headerTitle}>{t("Moment")}</Text>

          <View style={styles.headerActionPlaceholder} />
        </View>

        <View style={styles.stateContent}>
          <Text style={styles.stateText}>
            {isLoading
              ? t("Loading moment...")
              : state.error
                ? t("Unable to load moment.")
                : t("This moment is no longer available on this device.")}
          </Text>

          {!isLoading ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Try again")}
              onPress={() => void loadMoment()}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryButtonPressed,
              ]}
            >
              <Text style={styles.informationValue}>{t("Try again")}</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />

        <Text style={styles.headerTitle}>{t("Moment")}</Text>

        {canManageMoment ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Moment options")}
            accessibilityState={{ disabled: isDeleting }}
            disabled={isDeleting}
            onPress={handleOpenMenu}
            style={({ pressed }) => [
              styles.menuButton,
              (pressed || isDeleting) && styles.menuButtonPressed,
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
        {photos.length > 0 ? (
          <View style={styles.gallerySection}>
            <View style={styles.mainPhotoContainer}>
              {selectedPhotoSource ? (
                <Image
                  source={selectedPhotoSource}
                  resizeMode="cover"
                  style={styles.mainPhoto}
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons
                    name="image-outline"
                    size={36}
                    color={colors.textSecondary}
                  />
                </View>
              )}

              {photos.length > 1 ? (
                <View style={styles.photoCountBadge}>
                  <Ionicons
                    name="images-outline"
                    size={14}
                    color={colors.white}
                  />

                  <Text style={styles.photoCountText}>
                    {activePhotoIndex + 1}/{photos.length}
                  </Text>
                </View>
              ) : null}
            </View>

            {photos.length > 1 ? (
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnails}
              >
                {photos.map((photo, index) => {
                  const selected = index === activePhotoIndex;
                  const source = getPhotoSource(photo);

                  return (
                    <Pressable
                      key={photo.attachmentId ?? photo.id ?? `photo-${index}`}
                      accessibilityRole="button"
                      accessibilityLabel={t("View photo number", {
                        number: index + 1,
                      })}
                      accessibilityState={{ selected }}
                      onPress={() => setSelectedPhotoIndex(index)}
                      style={[
                        styles.thumbnailContainer,
                        selected && styles.thumbnailContainerSelected,
                      ]}
                    >
                      {source ? (
                        <Image
                          source={source}
                          resizeMode="cover"
                          style={styles.thumbnail}
                        />
                      ) : (
                        <View
                          style={[styles.thumbnail, styles.photoPlaceholder]}
                        >
                          <Ionicons
                            name="image-outline"
                            size={22}
                            color={colors.textSecondary}
                          />
                        </View>
                      )}
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
            {moment.dateLabel ? (
              <Text style={styles.metadataPrimary}>{moment.dateLabel}</Text>
            ) : null}

            {moment.childAgeLabel ? (
              <Text style={styles.metadataSecondary}>
                {moment.childName} · {moment.childAgeLabel}
              </Text>
            ) : null}

            <Text style={styles.metadataSecondary}>
              {t("Added by {{authorName}}", {
                authorName: moment.authorName,
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
                  {moment.milestone.label}
                </Text>

                {moment.milestone.category ? (
                  <Text style={styles.informationSecondary}>
                    {t(moment.milestone.category)}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Share as a memory card")}
            onPress={() => void handleShare()}
            disabled={checkingMemoryCardAccess}
            accessibilityState={{
              disabled: checkingMemoryCardAccess,
              busy: checkingMemoryCardAccess,
            }}
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
                  {checkingMemoryCardAccess
                    ? t("Checking your access...")
                    : t("Create a memory card")}
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

    headerActionPlaceholder: {
      width: 42,
      height: 42,
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 50,
    },

    stateContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 50,
    },

    stateText: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      lineHeight: 23,
      color: colors.textSecondary,
    },

    retryButton: {
      alignSelf: "flex-start",
      paddingVertical: 16,
    },

    retryButtonPressed: {
      opacity: 0.7,
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

    photoPlaceholder: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.selectedBackground,
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
  });
