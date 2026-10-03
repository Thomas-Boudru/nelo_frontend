import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useSelector } from "react-redux";

import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";

import { useTranslation } from "react-i18next";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../../auth/AuthProvider.js";

import {
  getLocalBottlePresets,
  createBottlePresetLocally,
  archiveBottlePresetLocally,
} from "../../../database/tracking/feed/bottlePresetsRepository.js";

import { updateLocalBottlePreset } from "../../../database/tracking/feed/bottlePresetUpdatesRepository.js";

import { synchronizeBottlePresets } from "../../../sync/tracking/feed/synchronizeBottlePresets.js";

import EditBottleCapacitySheet from "./EditBottleCapacitySheet.js";
import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const ML_PER_US_FL_OZ = 29.5735295625;

const BOTTLE_CAPACITIES_ML = [120, 160, 240, 260, 330];
const BOTTLE_CAPACITIES_FL_OZ = [4, 5, 8, 9, 11];

const MAX_CUSTOM_CAPACITIES = 2;
const MAX_CAPACITY_ML = 1000;

function roundToThreeDecimals(value) {
  return Math.round(value * 1000) / 1000;
}

function formatCapacity(capacityMl, volumeUnit) {
  const amount =
    volumeUnit === "fl_oz"
      ? Number((capacityMl / ML_PER_US_FL_OZ).toFixed(1))
      : Number(capacityMl.toFixed(3));

  return `${amount} ${volumeUnit === "fl_oz" ? "fl oz" : "ml"}`;
}

const BottleCapacitySheet = forwardRef(function BottleCapacitySheet(
  { childId, userId: providedUserId, onSelect },
  ref,
) {
  const { t } = useTranslation();

  const { user, accessToken, refreshSession } = useAuth();

  const userId = providedUserId ?? user?.id;

  const volumeUnit = useSelector((state) => state.measurementUnits.volume);

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const modalRef = useRef(null);
  const editCapacitySheetRef = useRef(null);

  const mountedRef = useRef(false);
  const requestRef = useRef(0);
  const mutationRef = useRef(false);
  const editingPresetRef = useRef(null);

  const scope = `${userId ?? ""}:${childId ?? ""}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  const [selectedCapacityMl, setSelectedCapacityMl] = useState(null);
  const [customPresets, setCustomPresets] = useState([]);
  const [isAddingCustomCapacity, setIsAddingCustomCapacity] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
    };
  }, []);

  const bottleCapacities = useMemo(
    () =>
      volumeUnit === "fl_oz"
        ? BOTTLE_CAPACITIES_FL_OZ.map((amount) => ({
            capacityMl: Math.round(amount * ML_PER_US_FL_OZ),
            label: `${amount} fl oz`,
          }))
        : BOTTLE_CAPACITIES_ML.map((amount) => ({
            capacityMl: amount,
            label: `${amount} ml`,
          })),
    [volumeUnit],
  );

  const loadPresets = useCallback(async () => {
    const requestId = ++requestRef.current;
    const requestedScope = scope;

    const isCurrent = () =>
      mountedRef.current &&
      requestRef.current === requestId &&
      scopeRef.current === requestedScope;

    if (!userId || !childId) {
      if (isCurrent()) {
        setCustomPresets([]);
        setIsLoading(false);
      }

      return;
    }

    if (isCurrent()) {
      setIsLoading(true);
      setError("");
    }

    try {
      const localPresets = await getLocalBottlePresets({
        userId,
        childId,
      });

      if (!isCurrent()) {
        return;
      }

      setCustomPresets(localPresets);
      setIsLoading(false);

      if (
        !accessToken ||
        user?.id !== userId ||
        typeof refreshSession !== "function"
      ) {
        return;
      }

      try {
        await synchronizeBottlePresets({
          userId,
          childId,
          accessToken,
          refreshSession,
        });

        if (!isCurrent()) {
          return;
        }

        // Relire SQLite : elle contient également les éventuelles
        // modifications locales intervenues pendant l'appel réseau.
        const latestPresets = await getLocalBottlePresets({
          userId,
          childId,
        });

        if (isCurrent()) {
          setCustomPresets(latestPresets);
        }
      } catch (syncError) {
        // La liste locale reste disponible hors connexion.
        console.warn("Unable to synchronize bottle presets:", syncError);
      }
    } catch (loadError) {
      console.error("Unable to load bottle presets:", loadError);

      if (isCurrent()) {
        setError(t("Unable to load custom bottles. Please try again."));
      }
    } finally {
      if (isCurrent()) {
        setIsLoading(false);
      }
    }
  }, [accessToken, childId, refreshSession, scope, t, user?.id, userId]);

  useEffect(() => {
    requestRef.current += 1;
    editingPresetRef.current = null;

    setCustomPresets([]);
    setSelectedCapacityMl(null);
    setIsAddingCustomCapacity(false);
    setCustomAmount("");
    setError("");

    editCapacitySheetRef.current?.dismiss();

    void loadPresets();

    return () => {
      requestRef.current += 1;
    };
  }, [loadPresets]);

  useImperativeHandle(
    ref,
    () => ({
      present(currentCapacityMl) {
        if (mutationRef.current) {
          return;
        }

        setSelectedCapacityMl(currentCapacityMl);
        setIsAddingCustomCapacity(false);
        setCustomAmount("");
        setError("");

        modalRef.current?.present();
        void loadPresets();
      },

      dismiss() {
        modalRef.current?.dismiss();
      },
    }),
    [loadPresets],
  );

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={isSaving ? "none" : "close"}
        opacity={0.18}
      />
    ),
    [isSaving],
  );

  function handleSelect(capacityMl) {
    if (mutationRef.current) {
      return;
    }

    setSelectedCapacityMl(capacityMl);
    onSelect?.(capacityMl);
    modalRef.current?.dismiss();
  }

  function handleEditCustomCapacity(preset) {
    if (mutationRef.current) {
      return;
    }

    editingPresetRef.current = {
      preset,
      scope,
    };

    editCapacitySheetRef.current?.present(preset.capacityMl);
  }

  async function runLocalMutation(action, onCompleted) {
    if (mutationRef.current) {
      return false;
    }

    if (!userId || !childId) {
      throw new Error(t("Unable to save this bottle. Please try again."));
    }

    const mutationScope = scope;

    mutationRef.current = true;

    // Une lecture ancienne ne doit pas remplacer la liste modifiée.
    requestRef.current += 1;

    setIsSaving(true);
    setIsLoading(false);
    setError("");

    try {
      const result = await action();

      if (mountedRef.current && scopeRef.current === mutationScope) {
        const presets = await getLocalBottlePresets({
          userId,
          childId,
        });

        if (mountedRef.current && scopeRef.current === mutationScope) {
          setCustomPresets(presets);
          onCompleted?.(result);
        }
      }

      return true;
    } finally {
      mutationRef.current = false;

      if (mountedRef.current) {
        setIsSaving(false);

        // L'envoi réseau se fait après l'enregistrement local.
        void loadPresets();
      }
    }
  }

  async function handleUpdateCustomCapacity({ capacityMl }) {
    const editing = editingPresetRef.current;

    if (!editing || editing.scope !== scope) {
      throw new Error(
        t("The selected child has changed. Open the bottle again."),
      );
    }

    return runLocalMutation(
      () =>
        updateLocalBottlePreset({
          userId,
          childId,
          presetId: editing.preset.id,

          // La feuille d'édition retourne déjà un volume en ml.
          originalValue: capacityMl,
          originalUnit: "ml",
        }),
      (updatedPreset) => {
        if (selectedCapacityMl === editing.preset.capacityMl) {
          setSelectedCapacityMl(updatedPreset.capacityMl);
          onSelect?.(updatedPreset.capacityMl);
        }
      },
    );
  }

  async function handleDeleteCustomCapacity() {
    const editing = editingPresetRef.current;

    if (!editing || editing.scope !== scope) {
      throw new Error(
        t("The selected child has changed. Open the bottle again."),
      );
    }

    return runLocalMutation(
      () =>
        archiveBottlePresetLocally({
          userId,
          childId,
          presetId: editing.preset.id,
        }),
      () => {
        // Retirer le preset de la liste ne modifie pas le volume
        // du repas actuellement saisi.
        editingPresetRef.current = null;
      },
    );
  }

  const parsedCustomAmount = Number(customAmount.trim().replace(",", "."));

  const originalValue = roundToThreeDecimals(parsedCustomAmount);

  const customCapacityMl = roundToThreeDecimals(
    volumeUnit === "fl_oz" ? originalValue * ML_PER_US_FL_OZ : originalValue,
  );

  const isAlreadyAvailable =
    bottleCapacities.some(
      ({ capacityMl }) => capacityMl === customCapacityMl,
    ) || customPresets.some((preset) => preset.capacityMl === customCapacityMl);

  const canAddAnotherCustomCapacity =
    customPresets.length < MAX_CUSTOM_CAPACITIES;

  const canConfirmCustomAmount =
    Boolean(userId && childId) &&
    !isLoading &&
    !isSaving &&
    canAddAnotherCustomCapacity &&
    customAmount.trim().length > 0 &&
    Number.isFinite(originalValue) &&
    originalValue > 0 &&
    customCapacityMl > 0 &&
    customCapacityMl <= MAX_CAPACITY_ML &&
    !isAlreadyAvailable;

  async function handleConfirmCustomAmount() {
    if (!canConfirmCustomAmount) {
      return;
    }

    try {
      await runLocalMutation(
        () =>
          createBottlePresetLocally({
            userId,
            childId,
            originalValue,
            originalUnit: volumeUnit === "fl_oz" ? "fl_oz" : "ml",
            label: null,
          }),
        (preset) => {
          setSelectedCapacityMl(preset.capacityMl);
          setIsAddingCustomCapacity(false);
          setCustomAmount("");

          onSelect?.(preset.capacityMl);
          modalRef.current?.dismiss();
        },
      );
    } catch (saveError) {
      console.error("Unable to create bottle preset:", saveError);

      if (mountedRef.current && scopeRef.current === scope) {
        setError(t("Unable to save this bottle. Please try again."));
      }
    }
  }

  return (
    <BottomSheetModal
      ref={modalRef}
      index={0}
      enableDynamicSizing={true}
      stackBehavior="push"
      enablePanDownToClose={!isSaving}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t("Bottle capacity")}</Text>

          <Text style={styles.description}>
            {t("Choose the size of the bottle you use most often")}
          </Text>
        </View>

        <View style={styles.capacityGrid}>
          {bottleCapacities.map(({ capacityMl, label }) => (
            <CapacityCard
              key={`standard-${capacityMl}`}
              label={label}
              isSelected={selectedCapacityMl === capacityMl}
              disabled={isSaving}
              onPress={() => handleSelect(capacityMl)}
              colors={colors}
              styles={styles}
            />
          ))}

          {customPresets.map((preset) => (
            <CapacityCard
              key={preset.id}
              label={formatCapacity(preset.capacityMl, volumeUnit)}
              isCustom
              isSelected={selectedCapacityMl === preset.capacityMl}
              disabled={isSaving}
              onPress={() => handleSelect(preset.capacityMl)}
              onEdit={() => handleEditCustomCapacity(preset)}
              colors={colors}
              styles={styles}
            />
          ))}

          {canAddAnotherCustomCapacity &&
          !isAddingCustomCapacity &&
          userId &&
          childId ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Add custom capacity")}
              disabled={isLoading || isSaving}
              onPress={() => {
                setError("");
                setIsAddingCustomCapacity(true);
              }}
              style={({ pressed }) => [
                styles.customCard,
                pressed && styles.pressed,
                (isLoading || isSaving) && styles.disabled,
              ]}
            >
              <Ionicons name="add" size={20} color={colors.primary} />

              <Text style={styles.customCardLabel}>{t("Custom")}</Text>
            </Pressable>
          ) : null}
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : null}

        {isAddingCustomCapacity ? (
          <View style={styles.customInputArea}>
            <View style={styles.customAmountRow}>
              <BottomSheetTextInput
                value={customAmount}
                onChangeText={(value) => {
                  setCustomAmount(value);
                  setError("");
                }}
                placeholder={
                  volumeUnit === "fl_oz"
                    ? t("Amount in fl oz")
                    : t("Amount in ml")
                }
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                editable={!isSaving}
                autoFocus
                style={styles.customAmountInput}
              />

              <Text style={styles.unit}>
                {volumeUnit === "fl_oz" ? "fl oz" : "ml"}
              </Text>
            </View>

            {isAlreadyAvailable ? (
              <Text style={styles.errorText}>
                {t("This bottle capacity already exists.")}
              </Text>
            ) : null}

            <PrimaryButton
              title={t("Add custom capacity")}
              onPress={handleConfirmCustomAmount}
              disabled={!canConfirmCustomAmount}
              loading={isSaving}
            />
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </BottomSheetScrollView>

      <EditBottleCapacitySheet
        ref={editCapacitySheetRef}
        existingCapacities={[
          ...bottleCapacities.map(({ capacityMl }) => capacityMl),
          ...customPresets.map((preset) => preset.capacityMl),
        ]}
        onSave={handleUpdateCustomCapacity}
        onDelete={handleDeleteCustomCapacity}
      />
    </BottomSheetModal>
  );
});

export default BottleCapacitySheet;

function CapacityCard({
  label,
  isCustom = false,
  isSelected,
  disabled,
  onPress,
  onEdit,
  colors,
  styles,
}) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{
        selected: Boolean(isSelected),
        disabled: Boolean(disabled),
      }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.capacityOption,
        isSelected && styles.capacityOptionSelected,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View>
        {isCustom ? (
          <Text style={styles.customBadge}>{t("Custom")}</Text>
        ) : null}

        <Text
          style={[
            styles.capacityOptionLabel,
            isSelected && styles.capacityOptionLabelSelected,
          ]}
        >
          {label}
        </Text>
      </View>

      {isCustom ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Edit custom bottle")}
          disabled={disabled}
          hitSlop={10}
          onPress={(event) => {
            event.stopPropagation();
            onEdit?.();
          }}
          style={({ pressed }) => [
            styles.editButton,
            pressed && styles.pressed,
          ]}
        >
          <FontAwesome6 name="pen" size={12} color={colors.primary} />
        </Pressable>
      ) : isSelected ? (
        <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
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
    handle: {
      width: 38,
      height: 4,
      borderRadius: 99,
      backgroundColor: colors.border,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    header: {
      paddingTop: 5,
    },
    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 19,
      color: colors.textPrimary,
    },
    description: {
      marginTop: 5,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    capacityGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 22,
    },
    capacityOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "48%",
      minHeight: 58,
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.white,
    },
    capacityOptionSelected: {
      borderColor: `${colors.primary}70`,
      backgroundColor: colors.lightBlue,
    },
    capacityOptionLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      color: colors.textPrimary,
    },
    capacityOptionLabelSelected: {
      color: colors.primary,
    },
    customBadge: {
      alignSelf: "flex-start",
      marginBottom: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      overflow: "hidden",
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 8,
      color: colors.primary,
      backgroundColor: `${colors.primary}16`,
    },
    customCard: {
      alignItems: "center",
      justifyContent: "center",
      width: "48%",
      minHeight: 58,
      gap: 3,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: `${colors.primary}70`,
      borderRadius: 16,
      backgroundColor: colors.lightBlue,
    },
    customCardLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.primary,
    },
    customInputArea: {
      gap: 12,
      marginTop: 14,
    },
    customAmountRow: {
      flexDirection: "row",
      alignItems: "center",
      height: 54,
      gap: 10,
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.white,
    },
    customAmountInput: {
      flex: 1,
      paddingVertical: 0,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 15,
      color: colors.textPrimary,
    },
    unit: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.textSecondary,
    },
    editButton: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 17,
      backgroundColor: `${colors.primary}14`,
    },
    errorText: {
      marginTop: 8,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      color: colors.error,
    },
    loader: {
      marginTop: 14,
    },
    pressed: {
      opacity: 0.78,
    },
    disabled: {
      opacity: 0.5,
    },
  });
}
