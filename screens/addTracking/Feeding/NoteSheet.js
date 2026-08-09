import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const NoteSheet = forwardRef(function NoteSheet({ onSave }, ref) {
  const { t } = useTranslation();
  const modalRef = useRef(null);
  const [note, setNote] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
    });

    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useImperativeHandle(ref, () => ({
    present(currentNote = "") {
      setNote(currentNote);
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
        opacity={0.18}
      />
    ),
    [],
  );

  const handleSave = () => {
    onSave?.(note.trim());
    modalRef.current?.dismiss();
  };

  const handleClear = () => {
    setNote("");
    onSave?.("");
    modalRef.current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={modalRef}
      index={0}
      // « push » : sans ça, gorhom minimise la sheet d'ajout de repas qui nous
      // contient au moment où on se présente, et les deux disparaissent.
      stackBehavior="push"
      enablePanDownToClose
      // La hauteur suit le contenu : avec un snap point fixe, le clavier
      // laissait un grand vide sous les boutons.
      enableDynamicSizing
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView
        style={[
          styles.content,
          keyboardVisible
            ? styles.contentKeyboardVisible
            : styles.contentKeyboardHidden,
        ]}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t("Add a note")}</Text>
            <Text style={styles.description}>
              {t("Add an optional detail about this feeding")}
            </Text>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <BottomSheetTextInput
            value={note}
            onChangeText={setNote}
            placeholder={t("For example, drank slowly or refused the end")}
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={300}
            textAlignVertical="top"
            style={styles.input}
          />
          <Text style={styles.characterCounter}>{note.length}/300</Text>
        </View>
        <View style={styles.footer}>
          {note.trim() ? (
            <View style={styles.footerButton}>
              <PrimaryButton
                title={t("Remove note")}
                onPress={handleClear}
                variant="destructive"
              />
            </View>
          ) : null}

          <View style={styles.footerButton}>
            <PrimaryButton title={t("Save note")} onPress={handleSave} />
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default NoteSheet;

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
    },

    contentKeyboardHidden: {
      paddingBottom: 24,
    },

    contentKeyboardVisible: {
      paddingBottom: 8,
    },

    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 16,
      paddingTop: 4,
      paddingBottom: 18,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
      color: colors.textPrimary,
    },

    description: {
      marginTop: 5,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      color: colors.textSecondary,
    },

    closeButton: {
      alignItems: "center",
      justifyContent: "center",
      width: 35,
      height: 35,
      borderRadius: 18,
      backgroundColor: colors.lightBlue,
    },
    inputContainer: {
      position: "relative",
    },

    input: {
      minHeight: 104,
      paddingHorizontal: 14,
      paddingTop: 13,
      paddingBottom: 30,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      lineHeight: 21,
      color: colors.textPrimary,
      backgroundColor: colors.lightBlue,
    },

    characterCounter: {
      position: "absolute",
      right: 12,
      bottom: 10,
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
    },

    footer: {
      flexDirection: "row",
      gap: 10,
      paddingTop: 16,
    },

    footerButton: {
      flex: 1,
    },

    clearButton: {
      paddingVertical: 10,
      paddingHorizontal: 4,
    },

    clearLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.error,
    },

    saveButton: {
      flex: 1,
    },
  });
}
