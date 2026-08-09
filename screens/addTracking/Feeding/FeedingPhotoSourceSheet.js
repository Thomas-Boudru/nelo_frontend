import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "../../../theme/useThemeColors.js";

const FeedingPhotoSourceSheet = forwardRef(function FeedingPhotoSourceSheet(
  { remainingPhotoCount = 5, onPhotosSelected },
  forwardedRef,
) {
  const { t } = useTranslation();

  const sheetRef = useRef(null);
  const [activeAction, setActiveAction] = useState(null);

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isBusy = activeAction !== null;

  useImperativeHandle(forwardedRef, () => ({
    present() {
      if (remainingPhotoCount <= 0) {
        return;
      }

      sheetRef.current?.present();
    },

    dismiss() {
      sheetRef.current?.dismiss();
    },
  }));

  const resetSheet = useCallback(() => {
    setActiveAction(null);
  }, []);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={isBusy ? "none" : "close"}
        opacity={0.22}
      />
    ),
    [isBusy],
  );

  const openSettings = () => {
    Linking.openSettings().catch(() => {
      Alert.alert(
        t("Unable to open settings"),
        t("Please open your device settings manually"),
      );
    });
  };

  const showCameraPermissionAlert = (canAskAgain) => {
    if (canAskAgain) {
      Alert.alert(
        t("Camera access required"),
        t("Camera access is required to take a photo"),
      );

      return;
    }

    Alert.alert(
      t("Camera access required"),
      t("Allow camera access in your device settings to take a photo"),
      [
        {
          text: t("Cancel"),
          style: "cancel",
        },
        {
          text: t("Open settings"),
          onPress: openSettings,
        },
      ],
    );
  };

  const showLibraryPermissionAlert = (canAskAgain) => {
    if (canAskAgain) {
      Alert.alert(
        t("Photo library access required"),
        t("Photo library access is required to choose photos"),
      );

      return;
    }

    Alert.alert(
      t("Photo library access required"),
      t("Allow photo access in your device settings to choose photos"),
      [
        {
          text: t("Cancel"),
          style: "cancel",
        },
        {
          text: t("Open settings"),
          onPress: openSettings,
        },
      ],
    );
  };

  const handleSelectedAssets = async (assets = []) => {
    const selectedPhotos = assets
      .filter((asset) => Boolean(asset?.uri))
      .slice(0, remainingPhotoCount)
      .map((asset, index) => ({
        id: asset.assetId ?? `${asset.uri}-${Date.now()}-${index}`,
        uri: asset.uri,
        width: asset.width ?? null,
        height: asset.height ?? null,
        fileName: asset.fileName ?? null,
        mimeType: asset.mimeType ?? null,
        fileSize: asset.fileSize ?? null,
      }));

    if (!selectedPhotos.length) {
      return false;
    }

    /*
     * onPhotosSelected peut renvoyer false si le composant parent
     * refuse les images, par exemple si la limite a été atteinte.
     */
    const result = await onPhotosSelected?.(selectedPhotos);

    if (result === false) {
      return false;
    }

    sheetRef.current?.dismiss();

    return true;
  };

  const handleTakePhoto = async () => {
    if (isBusy || remainingPhotoCount <= 0) {
      return;
    }

    setActiveAction("camera");

    try {
      let permission = await ImagePicker.getCameraPermissionsAsync();

      if (!permission.granted && permission.canAskAgain) {
        permission = await ImagePicker.requestCameraPermissionsAsync();
      }

      if (!permission.granted) {
        showCameraPermissionAlert(permission.canAskAgain);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      await handleSelectedAssets([result.assets[0]]);
    } catch (error) {
      console.error("Unable to take feeding photo:", error);

      Alert.alert(
        t("Unable to take photo"),
        t("An error occurred while opening the camera"),
      );
    } finally {
      setActiveAction(null);
    }
  };

  const handleChooseFromLibrary = async () => {
    if (isBusy || remainingPhotoCount <= 0) {
      return;
    }

    setActiveAction("library");

    try {
      let permission = await ImagePicker.getMediaLibraryPermissionsAsync();

      if (!permission.granted && permission.canAskAgain) {
        permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (!permission.granted) {
        showLibraryPermissionAlert(permission.canAskAgain);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: remainingPhotoCount,
        quality: 0.85,
        orderedSelection: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      await handleSelectedAssets(result.assets);
    } catch (error) {
      console.error("Unable to choose feeding photos:", error);

      Alert.alert(
        t("Unable to choose photos"),
        t("An error occurred while opening the photo library"),
      );
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      stackBehavior="push"
      enableDynamicSizing
      enablePanDownToClose={!isBusy}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      backdropComponent={renderBackdrop}
      onDismiss={resetSheet}
    >
      <BottomSheetView style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t("Add photos")}</Text>

            <Text style={styles.description}>
              {remainingPhotoCount === 1
                ? t("You can add one more photo")
                : t("You can add remaining photos", {
                    count: remainingPhotoCount,
                  })}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <PhotoSourceAction
            icon="camera-outline"
            title={t("Take a photo")}
            description={t("Use your device camera")}
            loading={activeAction === "camera"}
            disabled={isBusy}
            onPress={handleTakePhoto}
            colors={colors}
            styles={styles}
          />

          <PhotoSourceAction
            icon="images-outline"
            title={t("Choose from library")}
            description={t("Select one or more photos")}
            loading={activeAction === "library"}
            disabled={isBusy}
            onPress={handleChooseFromLibrary}
            colors={colors}
            styles={styles}
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default FeedingPhotoSourceSheet;

function PhotoSourceAction({
  icon,
  title,
  description,
  loading,
  disabled,
  onPress,
  colors,
  styles,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        pressed && !disabled && styles.actionPressed,
        disabled && !loading && styles.disabled,
      ]}
    >
      <View style={styles.actionIcon}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name={icon} size={23} color={colors.primary} />
        )}
      </View>

      <View style={styles.actionText}>
        <Text style={styles.actionTitle}>{title}</Text>

        <Text style={styles.actionDescription}>{description}</Text>
      </View>

      {!loading ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.textSecondary}
        />
      ) : null}
    </Pressable>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,
      borderRadius: 30,
    },

    handleIndicator: {
      backgroundColor: colors.border,
      borderRadius: 999,
      height: 4,
      width: 38,
    },

    content: {
      paddingBottom: 26,
      paddingHorizontal: 20,
      paddingTop: 4,
    },

    header: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 16,
      justifyContent: "space-between",
      paddingBottom: 18,
    },

    headerText: {
      flex: 1,
    },

    title: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
    },

    description: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 19,
      marginTop: 5,
    },

    closeButton: {
      alignItems: "center",
      backgroundColor: colors.lightBlue,
      borderRadius: 18,
      height: 35,
      justifyContent: "center",
      width: 35,
    },

    actions: {
      gap: 10,
    },

    action: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      flexDirection: "row",
      minHeight: 76,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },

    actionPressed: {
      backgroundColor: colors.lightBlue,
      borderColor: colors.primary,
      transform: [{ scale: 0.99 }],
    },

    actionIcon: {
      alignItems: "center",
      backgroundColor: colors.selectedBackground,
      borderRadius: 15,
      height: 48,
      justifyContent: "center",
      width: 48,
    },

    actionText: {
      flex: 1,
      marginLeft: 13,
      marginRight: 10,
    },

    actionTitle: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
    },

    actionDescription: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,
      marginTop: 3,
    },

    pressed: {
      opacity: 0.72,
    },

    disabled: {
      opacity: 0.5,
    },
  });
}
