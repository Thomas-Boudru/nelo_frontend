import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const snapPoints = useMemo(() => ["42%"], []);

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
      snapPoints={snapPoints}
      stackBehavior="push"
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t("Add a note")}</Text>
            <Text style={styles.description}>
              {t("Add an optional detail about this feeding")}
            </Text>
          </View>
        </View>

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

        <View style={styles.footer}>
          {note.trim() ? (
            <Pressable onPress={handleClear} style={styles.clearButton}>
              <Text style={styles.clearLabel}>{t("Remove note")}</Text>
            </Pressable>
          ) : (
            <View />
          )}

          <View style={styles.saveButton}>
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
      paddingBottom: 18,
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

    input: {
      minHeight: 104,
      paddingHorizontal: 14,
      paddingVertical: 13,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      lineHeight: 21,
      color: colors.textPrimary,
      backgroundColor: colors.lightBlue,
    },

    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingTop: 16,
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
