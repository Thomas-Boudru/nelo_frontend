import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
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

import { useThemeColors } from "../../theme/useThemeColors.js";

const ChildPictureSheet = forwardRef(function ChildPictureSheet(
  {
    childName,
    hasPicture = false,
    isUpdating = false,
    onPictureSelected,
    onPictureRemoved,
  },
  forwardedRef,
) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const sheetRef = useRef(null);

  const [error, setError] = useState("");
  const [activeAction, setActiveAction] = useState(null);

  useImperativeHandle(forwardedRef, () => ({
    present: () => {
      setError("");
      setActiveAction(null);
      sheetRef.current?.present();
    },

    dismiss: () => {
      sheetRef.current?.dismiss();
    },
  }));

  const isBusy = isUpdating || activeAction !== null;

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={isBusy ? "none" : "close"}
        opacity={0.42}
      />
    ),
    [isBusy],
  );

  const resetSheet = useCallback(() => {
    setError("");
    setActiveAction(null);
  }, []);

  const handleSelectedAsset = async (asset) => {
    if (!asset?.uri) {
      return;
    }

    const result = await onPictureSelected?.({
      uri: asset.uri,
      width: asset.width ?? null,
      height: asset.height ?? null,
      fileName: asset.fileName ?? null,
      mimeType: asset.mimeType ?? null,
      fileSize: asset.fileSize ?? null,
    });

    if (result === false) {
      return;
    }

    sheetRef.current?.dismiss();
  };

  const handleTakePhoto = async () => {
    if (isBusy) {
      return;
    }

    setError("");
    setActiveAction("camera");

    try {
      const currentPermission = await ImagePicker.getCameraPermissionsAsync();

      let permission = currentPermission;

      if (!currentPermission.granted && currentPermission.canAskAgain) {
        permission = await ImagePicker.requestCameraPermissionsAsync();
      }

      if (!permission.granted) {
        if (!permission.canAskAgain) {
          Alert.alert(
            t("Camera access disabled"),
            t(
              "Allow camera access in your device settings to take a profile picture",
            ),
            [
              {
                text: t("Not now"),
                style: "cancel",
              },
              {
                text: t("Open settings"),
                onPress: () => Linking.openSettings(),
              },
            ],
          );
        } else {
          setError(t("Camera access is required to take a profile picture"));
        }

        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      await handleSelectedAsset(result.assets[0]);
    } catch (cameraError) {
      setError(cameraError?.message || t("Unable to open the camera"));
    } finally {
      setActiveAction(null);
    }
  };

  const handleChooseFromLibrary = async () => {
    if (isBusy) {
      return;
    }

    setError("");
    setActiveAction("library");

    try {
      const currentPermission =
        await ImagePicker.getMediaLibraryPermissionsAsync();

      let permission = currentPermission;

      if (!currentPermission.granted && currentPermission.canAskAgain) {
        permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (!permission.granted) {
        if (!permission.canAskAgain) {
          Alert.alert(
            t("Photo access disabled"),
            t(
              "Allow photo access in your device settings to choose a profile picture",
            ),
            [
              {
                text: t("Not now"),
                style: "cancel",
              },
              {
                text: t("Open settings"),
                onPress: () => Linking.openSettings(),
              },
            ],
          );
        } else {
          setError(
            t("Photo library access is required to choose a profile picture"),
          );
        }

        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        selectionLimit: 1,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      await handleSelectedAsset(result.assets[0]);
    } catch (libraryError) {
      setError(libraryError?.message || t("Unable to open the photo library"));
    } finally {
      setActiveAction(null);
    }
  };

  const handleRemovePicture = async () => {
    if (isBusy || !hasPicture) {
      return;
    }

    setError("");
    setActiveAction("remove");

    try {
      const removed = await onPictureRemoved?.();

      if (removed === false) {
        return;
      }

      sheetRef.current?.dismiss();
    } catch (removeError) {
      setError(
        removeError?.message || t("Unable to remove the profile picture"),
      );
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      enableDynamicSizing
      enablePanDownToClose={!isBusy}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.handleIndicator}
      onDismiss={resetSheet}
    >
      <BottomSheetView style={styles.container}>
        <Text style={styles.title}>
          {t("Update child picture", {
            childName,
          })}
        </Text>

        <View style={styles.actions}>
          <PictureAction
            icon="camera-outline"
            title={t("Take a photo")}
            description={t("Use your device camera")}
            loading={activeAction === "camera"}
            disabled={isBusy}
            onPress={handleTakePhoto}
            colors={colors}
            styles={styles}
          />

          <PictureAction
            icon="images-outline"
            title={t("Choose from library")}
            description={t("Select an existing photo")}
            loading={activeAction === "library"}
            disabled={isBusy}
            onPress={handleChooseFromLibrary}
            colors={colors}
            styles={styles}
          />

          {hasPicture ? (
            <PictureAction
              icon="trash-outline"
              title={t("Remove current picture")}
              description={t("Use the default child illustration")}
              danger
              loading={activeAction === "remove"}
              disabled={isBusy}
              onPress={handleRemovePicture}
              colors={colors}
              styles={styles}
            />
          ) : null}
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={colors.error}
            />

            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

function PictureAction({
  icon,
  title,
  description,
  danger = false,
  loading = false,
  disabled = false,
  onPress,
  colors,
  styles,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{
        disabled,
        busy: loading,
      }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        pressed && !disabled && styles.actionPressed,
        disabled && styles.disabled,
      ]}
    >
      <View
        style={[
          styles.actionIconContainer,
          danger && styles.dangerIconContainer,
        ]}
      >
        <Ionicons
          name={loading ? "hourglass-outline" : icon}
          size={22}
          color={danger ? colors.error : colors.primary}
        />
      </View>

      <View style={styles.actionContent}>
        <Text style={[styles.actionTitle, danger && styles.dangerText]}>
          {title}
        </Text>

        <Text style={styles.actionDescription}>{description}</Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={17}
        color={danger ? colors.error : colors.textSecondary}
      />
    </Pressable>
  );
}

export default ChildPictureSheet;

const createStyles = (colors) =>
  StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
    },

    handle: {
      paddingTop: 10,
      paddingBottom: 5,
    },

    handleIndicator: {
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.textSecondary,
      opacity: 0.25,
    },

    container: {
      paddingHorizontal: 22,
      paddingBottom: 24,
    },

    iconContainer: {
      width: 58,
      height: 58,
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 5,
      borderRadius: 29,
      backgroundColor: colors.selectedBackground,
    },
    title: {
      marginTop: 6,
      marginBottom: 18,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
      lineHeight: 28,
      color: colors.textPrimary,
    },

    description: {
      maxWidth: 320,
      alignSelf: "center",
      marginTop: 5,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      color: colors.textSecondary,
    },

    actions: {
      marginTop: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 20,
      backgroundColor: colors.white,
      overflow: "hidden",
    },

    action: {
      minHeight: 70,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    actionPressed: {
      backgroundColor: colors.selectedBackground,
    },

    actionIconContainer: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      borderRadius: 21,
      backgroundColor: colors.selectedBackground,
    },

    dangerIconContainer: {
      backgroundColor: `${colors.error}10`,
    },

    actionContent: {
      flex: 1,
      marginRight: 10,
    },

    actionTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 19,
      color: colors.textPrimary,
    },

    actionDescription: {
      marginTop: 2,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,
      color: colors.textSecondary,
    },

    dangerText: {
      color: colors.error,
    },

    errorContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      marginTop: 14,
      paddingHorizontal: 4,
    },

    errorText: {
      flex: 1,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,
      color: colors.error,
    },

    cancelButton: {
      minHeight: 46,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 12,
      borderRadius: 15,
    },

    cancelButtonPressed: {
      backgroundColor: colors.selectedBackground,
    },

    cancelButtonText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },

    disabled: {
      opacity: 0.5,
    },
  });
