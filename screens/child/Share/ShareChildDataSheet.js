import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import ShareLinkActionSheet from "./ShareLinkActionSheet.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";
import CustomPeriodSheet from "./CustomPeriodSheet.js";

const PERIODS = [
  {
    id: "7days",
    label: "Last 7 days",
    description: "The previous 7 days",
  },
  {
    id: "30days",
    label: "Last 30 days",
    description: "The previous 30 days",
  },
  {
    id: "custom",
    label: "Custom period",
    description: "Choose a start and end date",
  },
];

const ShareChildDataSheet = forwardRef(function ShareChildDataSheet(
  {
    child,
    activeLinks = [],
    onCreateLink,
    onShareLink,
    onCopyLink,
    onDisableLink,
  },
  ref,
) {
  const { t, i18n } = useTranslation();
  const modalRef = useRef(null);
  const linkActionsSheetRef = useRef(null);
  const customPeriodSheetRef = useRef(null);

  const [selectedPeriod, setSelectedPeriod] = useState("7days");
  const [customPeriod, setCustomPeriod] = useState({
    startDate: null,
    endDate: null,
  });
  const [isPeriodExpanded, setIsPeriodExpanded] = useState(false);
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const snapPoints = useMemo(() => ["70%"], []);

  const selectedPeriodConfig =
    PERIODS.find((period) => period.id === selectedPeriod) ?? PERIODS[0];

  const formatShortDate = (date) => {
    if (!date) {
      return "";
    }

    return new Intl.DateTimeFormat(i18n.language, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const selectedPeriodDescription =
    selectedPeriod === "custom" &&
    customPeriod.startDate &&
    customPeriod.endDate
      ? `${formatShortDate(
          customPeriod.startDate,
        )} – ${formatShortDate(customPeriod.endDate)}`
      : t(selectedPeriodConfig.description);

  useImperativeHandle(ref, () => ({
    present() {
      modalRef.current?.present();
    },

    dismiss() {
      modalRef.current?.dismiss();
    },
  }));

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.22}
      />
    ),
    [],
  );

  const handleSelectPeriod = (periodId) => {
    setIsPeriodExpanded(false);

    if (periodId === "custom") {
      customPeriodSheetRef.current?.present(customPeriod);

      return;
    }

    setSelectedPeriod(periodId);
  };

  const handleConfirmCustomPeriod = ({ startDate, endDate }) => {
    setCustomPeriod({
      startDate,
      endDate,
    });

    setSelectedPeriod("custom");
  };

  const handleCreateLink = async () => {
    if (isCreatingLink) {
      return;
    }

    setIsCreatingLink(true);

    try {
      const createdLink = await onCreateLink?.({
        childId: child?.id,

        period: selectedPeriod,
        periodLabel:
          selectedPeriod === "custom"
            ? selectedPeriodDescription
            : t(selectedPeriodConfig.label),

        startDate:
          selectedPeriod === "custom"
            ? customPeriod.startDate?.toISOString()
            : null,

        endDate:
          selectedPeriod === "custom"
            ? customPeriod.endDate?.toISOString()
            : null,

        includeAttachments,
      });

      if (!createdLink) {
        console.warn(
          "[ShareChildDataSheet] onCreateLink did not return the created link.",
        );
        return;
      }

      linkActionsSheetRef.current?.present(createdLink, "created");
    } catch (error) {
      console.error("[ShareChildDataSheet] Unable to create the link:", error);
    } finally {
      setIsCreatingLink(false);
    }
  };

  return (
    <>
      <BottomSheetModal
        ref={modalRef}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        stackBehavior="push"
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {t("Share {{childName}}'s data", {
                childName: child?.name ?? "",
              })}
            </Text>

            <Text style={styles.description}>
              {t("Create a secure link for a healthcare professional")}
            </Text>
          </View>

          <BottomSheetScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.sectionTitle}>{t("Period")}</Text>

            <View style={styles.periodCard}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  expanded: isPeriodExpanded,
                }}
                onPress={() =>
                  setIsPeriodExpanded((currentValue) => !currentValue)
                }
                style={({ pressed }) => [
                  styles.periodHeader,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.iconContainer}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>
                      {t(selectedPeriodConfig.label)}
                    </Text>

                    <Text style={styles.rowDescription}>
                      {selectedPeriodDescription}
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name={
                    isPeriodExpanded
                      ? "chevron-up-outline"
                      : "chevron-down-outline"
                  }
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>

              {isPeriodExpanded ? (
                <View style={styles.periodOptions}>
                  {PERIODS.map((period) => {
                    const isSelected = selectedPeriod === period.id;

                    return (
                      <Pressable
                        key={period.id}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected: isSelected,
                        }}
                        onPress={() => handleSelectPeriod(period.id)}
                        style={({ pressed }) => [
                          styles.periodOption,
                          isSelected && styles.periodOptionSelected,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.periodOptionLabel,
                            isSelected && styles.periodOptionLabelSelected,
                          ]}
                        >
                          {t(period.label)}
                        </Text>

                        {isSelected ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={colors.primary}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <View style={styles.securityHint}>
              <Ionicons
                name="lock-closed-outline"
                size={16}
                color={colors.primary}
              />

              <Text style={styles.securityHintText}>
                {t("You can disable a shared link at any time")}
              </Text>
            </View>

            <View style={styles.attachmentsCard}>
              <View style={styles.attachmentsLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="images-outline"
                    size={20}
                    color={colors.primary}
                  />
                </View>

                <Text numberOfLines={2} style={styles.rowTitle}>
                  {t("Include notes and photos")}
                </Text>
              </View>

              <View style={styles.switchContainer}>
                <Switch
                  value={includeAttachments}
                  onValueChange={setIncludeAttachments}
                  trackColor={{
                    false: `${colors.white}10`,
                    true: `${colors.white}10`,
                  }}
                  thumbColor={
                    includeAttachments ? colors.primary : colors.white
                  }
                  ios_backgroundColor={`${colors.white}0`}
                  style={styles.switch}
                />
              </View>
            </View>

            {activeLinks.length > 0 ? (
              <View style={styles.activeLinksSection}>
                <Text style={styles.sectionTitle}>{t("Active links")}</Text>

                <View style={styles.links}>
                  {activeLinks.map((link) => (
                    <View key={link.id} style={styles.linkCard}>
                      <View style={styles.rowLeft}>
                        <View style={styles.linkIcon}>
                          <Ionicons
                            name="link-outline"
                            size={20}
                            color={colors.primary}
                          />
                        </View>

                        <View style={styles.rowText}>
                          <Text numberOfLines={1} style={styles.linkTitle}>
                            {t(link.label ?? "Shared tracking data")}
                          </Text>

                          <Text
                            numberOfLines={1}
                            style={styles.linkDescription}
                          >
                            {t(
                              "Created {{createdDate}} · Expires {{expiryDate}}",
                              {
                                createdDate: link.createdDateLabel ?? "",
                                expiryDate: link.expiryDateLabel ?? "",
                              },
                            )}
                          </Text>
                        </View>
                      </View>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("Link options")}
                        hitSlop={10}
                        onPress={() =>
                          linkActionsSheetRef.current?.present(link, "existing")
                        }
                        style={({ pressed }) => [
                          styles.moreButton,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Ionicons
                          name="ellipsis-vertical"
                          size={20}
                          color={colors.textSecondary}
                        />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </BottomSheetScrollView>

          {/*
           * Le bouton vit dans la card, sous le scroll : il reste fixe en bas
           * sans se superposer au contenu ni aux sheets ouvertes par-dessus.
           */}
          <View style={styles.footer}>
            <PrimaryButton
              title={
                isCreatingLink ? t("Creating link...") : t("Create secure link")
              }
              onPress={handleCreateLink}
              disabled={isCreatingLink}
            />
          </View>
        </View>
      </BottomSheetModal>

      <ShareLinkActionSheet
        ref={linkActionsSheetRef}
        onShareLink={onShareLink}
        onCopyLink={onCopyLink}
        onDisableLink={onDisableLink}
      />

      <CustomPeriodSheet
        ref={customPeriodSheetRef}
        minimumDate={child?.birthDate ? new Date(child.birthDate) : undefined}
        maximumDate={new Date()}
        maxRangeDays={includeAttachments ? 90 : undefined}
        onConfirm={handleConfirmCustomPeriod}
      />
    </>
  );
});

export default ShareChildDataSheet;

function createStyles(colors) {
  return StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,
      borderRadius: 30,
    },

    handle: {
      width: 38,
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.border,
    },

    sheet: {
      flex: 1,
    },

    header: {
      flexShrink: 0,
      paddingHorizontal: 20,
      paddingTop: 5,
      paddingBottom: 18,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 21,
      color: colors.textPrimary,
    },

    description: {
      marginTop: 5,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
    },

    scroll: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },

    sectionTitle: {
      marginBottom: 10,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      color: colors.textPrimary,
    },

    periodCard: {
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.white,
    },

    periodHeader: {
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
    },

    rowLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },

    iconContainer: {
      width: 40,
      height: 40,
      flexShrink: 0,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${colors.primary}12`,
    },

    rowText: {
      flex: 1,
      minWidth: 0,
    },

    rowTitle: {
      flexShrink: 1,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.textPrimary,
    },

    rowDescription: {
      marginTop: 3,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      color: colors.textSecondary,
    },

    periodOptions: {
      padding: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 4,
    },

    periodOption: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      borderRadius: 13,
    },

    periodOptionSelected: {
      backgroundColor: `${colors.primary}10`,
    },

    periodOptionLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      color: colors.textSecondary,
    },

    periodOptionLabelSelected: {
      color: colors.primary,
    },

    securityHint: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginTop: 10,
      paddingHorizontal: 5,
    },

    securityHintText: {
      flex: 1,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      color: colors.textSecondary,
    },

    attachmentsCard: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginTop: 20,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.white,
    },

    attachmentsLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },

    switchContainer: {
      width: 48,
      alignSelf: "stretch",
      alignItems: "center",
      justifyContent: "center",
    },

    switch: {
      transform: [
        {
          scaleX: 0.88,
        },
        {
          scaleY: 0.88,
        },
      ],
    },

    activeLinksSection: {
      marginTop: 24,
    },

    links: {
      gap: 9,
    },

    linkCard: {
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.white,
    },

    linkIcon: {
      width: 40,
      height: 40,
      flexShrink: 0,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${colors.primary}12`,
    },

    linkTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.textPrimary,
    },

    linkDescription: {
      marginTop: 3,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      color: colors.textSecondary,
    },

    moreButton: {
      width: 36,
      height: 36,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
    },

    footer: {
      flexShrink: 0,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.white,
    },

    pressed: {
      opacity: 0.72,
    },
  });
}
