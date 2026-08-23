import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "../../../theme/useThemeColors.js";
import ConfirmActionSheet from "../../ConfirmActionSheet.js";

const ShareLinkActionsSheet = forwardRef(function ShareLinkActionsSheet(
  { onShareLink, onCopyLink, onDisableLink },
  ref,
) {
  const { t } = useTranslation();

  const [selectedLink, setSelectedLink] = useState(null);
  const [mode, setMode] = useState("existing");
  const modalRef = useRef(null);
  const confirmActionSheetRef = useRef(null);

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const dismiss = useCallback(() => {
    modalRef.current?.dismiss();
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      /**
       * mode:
       * - "created" : le lien vient d’être créé
       * - "existing" : ouverture depuis les trois petits points
       */
      present(link, nextMode = "existing") {
        if (!link) {
          console.warn(
            "[ShareLinkActionsSheet] Unable to open without a link.",
          );
          return;
        }

        setSelectedLink(link);
        setMode(nextMode);

        requestAnimationFrame(() => {
          modalRef.current?.present();
        });
      },

      dismiss,
    }),
    [dismiss],
  );

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

  const handleShare = async () => {
    if (!selectedLink?.url) {
      console.warn("[ShareLinkActionsSheet] No URL to share.");
      return;
    }

    const linkToShare = selectedLink;

    dismiss();

    try {
      const result = await Share.share({
        title: t("Share child data"),
        message: t(
          "Here is the secure link to view the tracking data: {{url}}",
          {
            url: linkToShare.url,
          },
        ),
        url: linkToShare.url,
      });

      console.log("[ShareLinkActionsSheet] Share result:", result);
    } catch (error) {
      console.error("[ShareLinkActionsSheet] Share failed:", error);
    }
  };

  const handleCopy = () => {
    if (!selectedLink) {
      return;
    }

    console.log("[Copy link]", selectedLink);
    onCopyLink?.(selectedLink);
    dismiss();
  };

  const handleDisable = () => {
    if (!selectedLink) {
      return;
    }

    const linkToDisable = selectedLink;

    /*
     * On ferme d’abord cette sheet, avant d’empiler la confirmation.
     * Sinon la confirmation se retrouve au-dessus, et la fermer depuis
     * `onConfirm` casserait la pile de Gorhom : cette sheet resterait
     * enregistrée comme montée et les `present()` suivants seraient ignorés
     * (les trois petits points ne répondaient plus après une désactivation).
     */
    dismiss();

    confirmActionSheetRef.current?.present({
      title: t("Disable this link?"),
      description: t(
        "Anyone using this link will immediately lose access to the shared data.",
      ),
      confirmLabel: t("Disable link"),
      cancelLabel: t("Cancel"),
      errorMessage: t("The link could not be disabled. Please try again."),
      icon: "close-circle-outline",
      variant: "destructive",

      onConfirm: async () => {
        console.log("[Disable link]", linkToDisable);

        const result = await onDisableLink?.(linkToDisable);

        if (result === false) {
          return false;
        }

        return true;
      },
    });
  };

  const isNewlyCreated = mode === "created";

  return (
    <>
      <BottomSheetModal
        ref={modalRef}
        index={0}
        stackBehavior="push"
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
        onDismiss={() => {
          setSelectedLink(null);
          setMode("existing");
        }}
      >
        <BottomSheetView style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isNewlyCreated ? t("Secure link created") : t("Link options")}
            </Text>

            <Text style={styles.description}>
              {isNewlyCreated
                ? t("Your secure link is ready to share")
                : t("Choose what you want to do with this link")}
            </Text>
          </View>

          <View style={styles.actions}>
            <ActionRow
              icon="share-outline"
              title={t("Share link")}
              description={t("Send the link using another app")}
              onPress={handleShare}
              colors={colors}
              styles={styles}
            />

            <ActionRow
              icon="copy-outline"
              title={t("Copy link")}
              description={t("Copy the link to the clipboard")}
              onPress={handleCopy}
              colors={colors}
              styles={styles}
            />

            {!isNewlyCreated ? (
              <ActionRow
                icon="close-circle-outline"
                title={t("Disable link")}
                description={t("The link will no longer be accessible")}
                onPress={handleDisable}
                destructive
                colors={colors}
                styles={styles}
              />
            ) : null}
          </View>
        </BottomSheetView>
      </BottomSheetModal>
      <ConfirmActionSheet ref={confirmActionSheetRef} />
    </>
  );
});

function ActionRow({
  icon,
  title,
  description,
  onPress,
  destructive = false,
  colors,
  styles,
}) {
  const actionColor = destructive ? colors.error : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        destructive && styles.actionDestructive,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[styles.actionIcon, destructive && styles.actionIconDestructive]}
      >
        <Ionicons name={icon} size={21} color={actionColor} />
      </View>

      <View style={styles.actionText}>
        <Text
          style={[
            styles.actionTitle,
            destructive && styles.actionTitleDestructive,
          ]}
        >
          {title}
        </Text>

        <Text style={styles.actionDescription}>{description}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

export default ShareLinkActionsSheet;

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

    content: {
      paddingHorizontal: 20,
      paddingBottom: 24,
    },

    header: {
      paddingTop: 5,
      paddingBottom: 18,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 19,
      color: colors.textPrimary,
    },

    description: {
      marginTop: 3,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 17,
      color: colors.textSecondary,
    },

    urlContainer: {
      marginTop: 14,
      minHeight: 40,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: 13,
      backgroundColor: colors.lightBlue,
    },

    url: {
      flex: 1,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      color: colors.textSecondary,
    },

    actions: {
      gap: 9,
    },

    action: {
      minHeight: 62,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 17,
      backgroundColor: colors.white,
    },

    actionDestructive: {
      borderColor: `${colors.error}30`,
    },

    actionIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${colors.primary}12`,
    },

    actionIconDestructive: {
      backgroundColor: `${colors.error}12`,
    },

    actionText: {
      flex: 1,
    },

    actionTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      color: colors.textPrimary,
    },

    actionTitleDestructive: {
      color: colors.error,
    },

    actionDescription: {
      marginTop: 2,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      color: colors.textSecondary,
    },

    pressed: {
      opacity: 0.72,
    },
  });
}
