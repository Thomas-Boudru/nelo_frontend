import {
  Fragment,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  AppState,
} from "react-native";

import * as Network from "expo-network";

import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";

import { useAuth } from "../../../auth/AuthProvider.js";
import {
  createLocalSleepEntry,
  startLocalSleepEntry,
  stopLocalSleepEntry,
  getLocalActiveSleepEntry,
  refreshSharedSleep,
} from "../../../database/tracking/sleep/sleepRepository.js";

import { processSyncQueue } from "../../../sync/processSyncQueue.js";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import ManualSleepSheet from "./ManualSleepSheet.js";

import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import TrackingHistoryButton from "../../../components/addTracking/TrackingHistoryButton.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const awakeIllustration = require("../../../assets/illustrations/tracking/sleep/wake.png");

const sleepingIllustration = require("../../../assets/illustrations/tracking/sleep/sleep.png");

const MAX_NOTE_LENGTH = 300;

const SleepEntrySheet = forwardRef(function SleepEntrySheet(
  {
    childId,
    childName,
    lastSleep,
    onStartSleep,
    onWakeUp,
    onAddManually,
    onSaveManualSleep,
    onRequestDelete,
    onPressHistory,
  },
  ref,
) {
  const { t } = useTranslation();
  const { user, accessToken, refreshSession } = useAuth();

  const modalRef = useRef(null);
  const manualSleepSheetRef = useRef(null);
  const savingWakeRef = useRef(false);

  const isMainSheetPresentedRef = useRef(false);

  const viewRef = useRef(view);
  const localChangeRef = useRef(0);

  viewRef.current = view;

  const dismissMainSheet = useCallback(() => {
    if (!isMainSheetPresentedRef.current) {
      return;
    }

    modalRef.current?.dismiss();
  }, []);

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const snapPoints = useMemo(() => ["92%"], []);
  const [sleepTags, setSleepTags] = useState([]);

  const [sleepType, setSleepType] = useState("nap");
  const [activeSleep, setActiveSleep] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [view, setView] = useState("main");
  const [completedSleep, setCompletedSleep] = useState(null);
  const [wakeNote, setWakeNote] = useState("");
  const [isSavingWake, setIsSavingWake] = useState(false);
  const [isStartingSleep, setIsStartingSleep] = useState(false);
  const startingSleepRef = useRef(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isLoadingSleep, setIsLoadingSleep] = useState(false);

  /*
   * Le chronomètre ne stocke pas chaque seconde.
   * Il recalcule la durée depuis startedAt.
   */
  useEffect(() => {
    if (!activeSleep?.startedAt) {
      return undefined;
    }

    setCurrentTime(Date.now());

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [activeSleep?.startedAt]);

  // Réinitialiser l'écran à l'ouverture ou au changement de bébé.
  useEffect(() => {
    setActiveSleep(null);
    setCompletedSleep(null);
    setWakeNote("");
    setSleepTags([]);
    setView("main");
    viewRef.current = "main";
  }, [isSheetOpen, user?.id, childId]);

  useEffect(() => {
    if (!isSheetOpen || !user?.id || !childId) {
      setIsLoadingSleep(false);
      return undefined;
    }

    let cancelled = false;
    let refreshing = false;

    const userId = user.id;

    function applyEntry(entry, expectedChange) {
      if (
        cancelled ||
        expectedChange !== localChangeRef.current ||
        startingSleepRef.current ||
        savingWakeRef.current ||
        viewRef.current !== "main"
      ) {
        return;
      }

      setActiveSleep(entry);
      setCurrentTime(Date.now());

      if (entry) {
        setSleepType(entry.sleepType);
      }
    }

    async function refresh() {
      if (
        cancelled ||
        refreshing ||
        AppState.currentState !== "active" ||
        startingSleepRef.current ||
        savingWakeRef.current ||
        viewRef.current !== "main"
      ) {
        return;
      }

      refreshing = true;
      const expectedChange = localChangeRef.current;

      try {
        // Afficher immédiatement les données locales.
        const localEntry = await getLocalActiveSleepEntry({
          userId,
          childId,
        });

        applyEntry(localEntry, expectedChange);

        if (!cancelled) {
          setIsLoadingSleep(false);
        }

        if (!accessToken || cancelled) {
          return;
        }

        const network = await Network.getNetworkStateAsync();

        if (
          !network.isConnected ||
          network.isInternetReachable === false ||
          cancelled
        ) {
          return;
        }

        // Envoyer d'abord nos modifications, puis lire le serveur.
        await processSyncQueue({
          userId,
          accessToken,
          refreshSession,
        });

        if (cancelled) {
          return;
        }

        const entry = await refreshSharedSleep({
          userId,
          childId,
          accessToken,
          refreshSession,
        });

        applyEntry(entry, expectedChange);
      } catch (error) {
        // En cas d'erreur réseau, conserver les données locales.
        console.error("Unable to refresh shared sleep:", error);
      } finally {
        refreshing = false;

        if (!cancelled) {
          setIsLoadingSleep(false);
        }
      }
    }

    refresh();

    // Vérification toutes les 15 secondes uniquement écran ouvert.
    const interval = setInterval(refresh, 15000);

    const appSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refresh();
      }
    });

    const networkSubscription = Network.addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        refresh();
      }
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      appSubscription.remove();
      networkSubscription.remove();
    };
  }, [isSheetOpen, user?.id, childId, accessToken, refreshSession]);

  useImperativeHandle(ref, () => ({
    present() {
      setIsLoadingSleep(true);
      setIsSheetOpen(true);

      isMainSheetPresentedRef.current = true;
      modalRef.current?.present();
    },

    presentForType(type = "nap") {
      const initialSleepType = type === "night" ? "night" : "nap";

      setCompletedSleep(null);
      setWakeNote("");
      setSleepTags([]);
      setView("main");
      setSleepType(initialSleepType);
      setIsLoadingSleep(true);
      setIsSheetOpen(true);

      isMainSheetPresentedRef.current = true;

      modalRef.current?.present();
    },

    presentManual(options = {}) {
      manualSleepSheetRef.current?.present(options);
    },

    dismiss() {
      setCompletedSleep(null);
      setWakeNote("");
      setSleepTags([]);
      setView("main");

      dismissMainSheet();
    },

    dismissManual() {
      manualSleepSheetRef.current?.dismiss();
    },

    setActiveSleep(currentActiveSleep) {
      if (!currentActiveSleep?.startedAt) {
        setActiveSleep(null);
        setCurrentTime(Date.now());
        return;
      }

      setActiveSleep({
        ...currentActiveSleep,
        startedAt: new Date(currentActiveSleep.startedAt),
      });

      setSleepType(currentActiveSleep.sleepType ?? "nap");
      setCurrentTime(Date.now());
    },
  }));

  const handleOpenManualSleep = (type) => {
    manualSleepSheetRef.current?.present({
      mode: "create",
      sleepType: type,
    });
  };
  const toggleSleepTag = (tag) => {
    setSleepTags((currentTags) =>
      currentTags.includes(tag)
        ? currentTags.filter((currentTag) => currentTag !== tag)
        : [...currentTags, tag],
    );
  };

  const handleSaveManualSleep = async (sleep) => {
    if (sleep.mode === "edit" || sleep.id) {
      throw new Error(t("Sleep editing is not available yet."));
    }

    if (!user?.id || !childId) {
      throw new Error(t("Missing user ID or child ID."));
    }

    const entry = await createLocalSleepEntry({
      userId: user.id,
      childId,
      data: {
        sleepType: sleep.sleepType,
        startedAt: sleep.startedAt,
        endedAt: sleep.endedAt,
        note: sleep.note,
      },
    });

    // La sauvegarde est terminée. Le parent actualise seulement l'affichage.
    try {
      await onSaveManualSleep?.({
        ...entry,
        entryMode: "manual",
        mode: "create",
        persistedLocally: true,
      });
    } catch (error) {
      console.error("Unable to refresh the saved sleep:", error);
    }

    synchronizeTracking();
    dismissMainSheet();

    return true;
  };

  const handleDismiss = () => {
    isMainSheetPresentedRef.current = false;

    setCompletedSleep(null);
    setWakeNote("");
    setSleepTags([]);
    setView("main");
    setIsSavingWake(false);
    setIsSheetOpen(false);
  };
  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.42}
      />
    ),
    [],
  );

  const synchronizeTracking = () => {
    if (!user?.id || !accessToken) {
      return;
    }

    processSyncQueue({
      userId: user.id,
      accessToken,
      refreshSession,
    }).catch((error) => {
      console.error("Unable to synchronize sleep:", error);
    });
  };

  const handleStartSleep = async () => {
    if (startingSleepRef.current || isLoadingSleep) {
      return;
    }
    startingSleepRef.current = true;
    localChangeRef.current += 1;
    setIsStartingSleep(true);

    try {
      if (!user?.id || !childId) {
        throw new Error(t("Missing user ID or child ID."));
      }

      const entry = await startLocalSleepEntry({
        userId: user.id,
        childId,
        data: {
          sleepType,
          startedAt: new Date(),
        },
      });

      setActiveSleep(entry);
      setCurrentTime(Date.now());

      // La sauvegarde locale a réussi : le callback affiche la confirmation.
      try {
        await onStartSleep?.({
          ...entry,
          persistedLocally: true,
        });
      } catch (error) {
        console.error("Unable to display sleep confirmation:", error);
      }

      synchronizeTracking();
      dismissMainSheet();
    } catch (error) {
      Alert.alert(
        t("Unable to start sleep"),
        error?.code === "SLEEP_ALREADY_RUNNING"
          ? t("A sleep is already running for this child.")
          : t("Please try again."),
      );
    } finally {
      startingSleepRef.current = false;
      setIsStartingSleep(false);
    }
  };

  const handleWakeUp = () => {
    if (!activeSleep?.startedAt) {
      return;
    }

    const endedAt = new Date();
    const startedAt = new Date(activeSleep.startedAt);

    const completedSleep = {
      ...activeSleep,
      startedAt,
      endedAt,
      durationSeconds: Math.max(
        0,
        Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000),
      ),
    };

    /*
     * L'heure de fin est provisoire : rien n'est encore enregistré.
     */
    setCompletedSleep(completedSleep);
    setWakeNote("");
    viewRef.current = "wakeConfirmation";
    setView("wakeConfirmation");
    setSleepTags([]);
  };

  const handleContinueTracking = () => {
    setCompletedSleep(null);
    setWakeNote("");
    setSleepTags([]);
    setCurrentTime(Date.now());
    viewRef.current = "main";
    setView("main");
  };
  const handleSaveCompletedSleep = async () => {
    if (!completedSleep || savingWakeRef.current) {
      return;
    }

    savingWakeRef.current = true;
    localChangeRef.current += 1;
    setIsSavingWake(true);

    try {
      if (!user?.id || !childId) {
        throw new Error(t("Missing user ID or child ID."));
      }

      if (!completedSleep.id) {
        throw new Error(t("The active sleep has no saved ID."));
      }

      const entry = await stopLocalSleepEntry({
        userId: user.id,
        childId,
        entryId: completedSleep.id,
        data: {
          endedAt: completedSleep.endedAt,
          note: wakeNote.trim(),
        },
      });

      // L'arrêt est enregistré localement.
      setActiveSleep(null);
      setCompletedSleep(null);
      setWakeNote("");
      setSleepTags([]);
      setView("main");

      // Une erreur d'affichage ne doit pas faire rejouer la sauvegarde.
      try {
        await onWakeUp?.({
          ...entry,
          persistedLocally: true,
        });
      } catch (error) {
        console.error("Unable to display sleep confirmation:", error);
      }

      synchronizeTracking();
      dismissMainSheet();
    } catch (error) {
      console.error("Unable to stop sleep:", error);

      Alert.alert(t("Unable to save sleep"), t("Please try again."));
    } finally {
      savingWakeRef.current = false;
      setIsSavingWake(false);
    }
  };

  const handleOpenHistory = () => {
    dismissMainSheet();

    setTimeout(() => {
      onPressHistory?.("sleep");
    }, 220);
  };

  const durationSeconds = activeSleep?.startedAt
    ? Math.max(
        0,
        Math.floor(
          (currentTime - new Date(activeSleep.startedAt).getTime()) / 1000,
        ),
      )
    : 0;

  return (
    <Fragment>
      <BottomSheetModal
        ref={modalRef}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        enableHandlePanningGesture
        enableContentPanningGesture
        enableOverDrag
        overDragResistanceFactor={1.8}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleStyle={styles.handleContainer}
        handleIndicatorStyle={styles.handleIndicator}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onDismiss={handleDismiss}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>
                {view === "wakeConfirmation"
                  ? t("Finish sleep")
                  : t("Track sleep")}
              </Text>

              <Text style={styles.subtitle}>
                {view === "wakeConfirmation"
                  ? t("Review the sleep before saving it")
                  : activeSleep
                    ? t("Sleep tracking is currently running")
                    : t("Record a nap or a night sleep")}
              </Text>
            </View>

            <TrackingHistoryButton
              accessibilityLabel={t("View sleep history")}
              onPress={handleOpenHistory}
            />
          </View>

          <View style={styles.stateContainer}>
            {view === "wakeConfirmation" && completedSleep ? (
              <WakeConfirmationState
                childName={childName}
                sleep={completedSleep}
                note={wakeNote}
                tags={sleepTags}
                isSaving={isSavingWake}
                onChangeNote={setWakeNote}
                onToggleTag={toggleSleepTag}
                onContinue={handleContinueTracking}
                onSave={handleSaveCompletedSleep}
                colors={colors}
                styles={styles}
                t={t}
              />
            ) : activeSleep ? (
              <SleepActiveState
                childName={childName}
                activeSleep={activeSleep}
                durationSeconds={durationSeconds}
                onWakeUp={handleWakeUp}
                styles={styles}
                t={t}
              />
            ) : (
              <SleepIdleState
                isLoading={isLoadingSleep}
                isStarting={isStartingSleep}
                childName={childName}
                sleepType={sleepType}
                lastSleep={lastSleep}
                onChangeSleepType={setSleepType}
                onStartSleep={handleStartSleep}
                onAddManually={handleOpenManualSleep}
                colors={colors}
                styles={styles}
                t={t}
              />
            )}
          </View>
        </View>
      </BottomSheetModal>
      <ManualSleepSheet
        ref={manualSleepSheetRef}
        onSave={handleSaveManualSleep}
        onRequestDelete={onRequestDelete}
      />
    </Fragment>
  );
});

export default SleepEntrySheet;

function SleepIdleState({
  isLoading,
  isStarting,
  childName,
  sleepType,
  lastSleep,
  onChangeSleepType,
  onStartSleep,
  onAddManually,
  colors,
  styles,
  t,
}) {
  return (
    <View style={styles.stateContent}>
      <View style={styles.awakeIllustrationContainer}>
        <Image
          source={awakeIllustration}
          resizeMode="contain"
          style={styles.awakeIllustration}
        />
      </View>

      <View style={styles.stateTextContainer}>
        <Text style={styles.stateTitle}>
          {childName ? t("child is awake", { childName }) : t("Baby is awake")}
        </Text>

        <Text style={styles.stateDescription}>
          {t("Choose the type of sleep before starting the timer")}
        </Text>
      </View>

      <SleepTypeToggle
        value={sleepType}
        onChange={onChangeSleepType}
        colors={colors}
        styles={styles}
        t={t}
      />

      {lastSleep ? (
        <LastSleepCard
          sleep={lastSleep}
          colors={colors}
          styles={styles}
          t={t}
        />
      ) : null}

      <View style={styles.idleActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Add sleep manually")}
          onPress={() => onAddManually?.(sleepType)}
          style={({ pressed }) => [
            styles.addManuallyButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.addManuallyText}>{t("Add manually")}</Text>
        </Pressable>

        <PrimaryButton
          variant="wake"
          title={
            isLoading
              ? t("Loading...")
              : isStarting
                ? t("Starting...")
                : sleepType === "night"
                  ? t("Start night sleep")
                  : t("Start nap")
          }
          disabled={isLoading || isStarting}
          onPress={onStartSleep}
        />
      </View>
    </View>
  );
}

function SleepActiveState({
  childName,
  activeSleep,
  durationSeconds,
  onWakeUp,
  styles,
  t,
}) {
  const isNight = activeSleep.sleepType === "night";

  return (
    <View style={styles.stateContent}>
      <View style={styles.sleepingIllustrationContainer}>
        <Image
          source={sleepingIllustration}
          resizeMode="contain"
          style={styles.sleepingIllustration}
        />
      </View>

      <View style={styles.progressBadge}>
        <View style={styles.progressDot} />

        <Text style={styles.progressBadgeText}>
          {isNight ? t("Night sleep in progress") : t("Nap in progress")}
        </Text>
      </View>

      <View style={styles.activeStateTextContainer}>
        <Text style={styles.stateTitle}>
          {childName
            ? t("child is sleeping", { childName })
            : t("Baby is sleeping")}
        </Text>

        <Text style={styles.startedAtText}>
          {t("Started at time", {
            time: formatTime(activeSleep.startedAt),
          })}
        </Text>
      </View>

      <View style={styles.timerCard}>
        <Text style={styles.timerValue}>{formatDuration(durationSeconds)}</Text>
      </View>

      <View style={styles.activeActions}>
        <PrimaryButton title={t("Wake up")} onPress={onWakeUp} />
      </View>
    </View>
  );
}

function WakeConfirmationState({
  childName,
  sleep,
  note,
  tags,
  isSaving,
  onChangeNote,
  onToggleTag,
  onContinue,
  onSave,
  colors,
  styles,
  t,
}) {
  const isNightSleep = sleep?.sleepType === "night";

  const sleepTagOptions = [
    {
      id: "peaceful",
      label: t("Peaceful"),
    },
    {
      id: "restless",
      label: t("Restless"),
    },
    {
      id: "severalWakeUps",
      label: t("Several wake-ups"),
    },
  ];

  return (
    <View style={styles.wakeConfirmationContainer}>
      <BottomSheetScrollView
        style={styles.confirmationScroll}
        contentContainerStyle={styles.confirmationScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sleepSummaryCard}>
          <View style={styles.sleepSummaryIconContainer}>
            <Ionicons
              name={isNightSleep ? "moon-outline" : "partly-sunny-outline"}
              size={24}
              color={colors.primary}
            />
          </View>

          <View style={styles.sleepSummaryContent}>
            <View style={styles.sleepSummaryHeader}>
              <Text style={styles.sleepSummaryType}>
                {isNightSleep ? t("Night sleep") : t("Nap")}
              </Text>

              <Text style={styles.sleepSummaryDuration}>
                {formatSleepDuration(sleep?.durationSeconds, t)}
              </Text>
            </View>

            <View style={styles.sleepSummaryPeriod}>
              <Text style={styles.sleepSummaryTime}>
                {formatTime(sleep?.startedAt)}
              </Text>

              <Ionicons
                name="arrow-forward"
                size={14}
                color={colors.textSecondary}
              />

              <Text style={styles.sleepSummaryTime}>
                {formatTime(sleep?.endedAt)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.noteSection}>
          <View style={styles.noteHeader}>
            <Text style={styles.noteLabel}>{t("How was the sleep?")}</Text>

            <Text
              style={[
                styles.noteCounter,
                note.length >= MAX_NOTE_LENGTH && styles.noteCounterLimit,
              ]}
            >
              {note.length}/{MAX_NOTE_LENGTH}
            </Text>
          </View>

          <View style={styles.sleepTags}>
            {sleepTagOptions.map((tag) => {
              const selected = tags.includes(tag.id);

              return (
                <Pressable
                  key={tag.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  disabled={isSaving}
                  onPress={() => onToggleTag(tag.id)}
                  style={({ pressed }) => [
                    styles.sleepTag,
                    selected && styles.sleepTagSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.sleepTagText,
                      selected && styles.sleepTagTextSelected,
                    ]}
                  >
                    {tag.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={note}
            onChangeText={onChangeNote}
            editable={!isSaving}
            placeholder={t("Add an optional note")}
            placeholderTextColor={`${colors.textSecondary}90`}
            multiline
            maxLength={MAX_NOTE_LENGTH}
            textAlignVertical="top"
            style={styles.noteInput}
          />
        </View>
      </BottomSheetScrollView>

      <View style={styles.confirmationActions}>
        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={onContinue}
          style={({ pressed }) => [
            styles.continueSleepButton,
            isSaving && styles.disabledButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="play-outline" size={19} color={colors.primary} />

          <Text style={styles.continueSleepButtonText}>
            {t("Continue sleep")}
          </Text>
        </Pressable>

        <PrimaryButton
          title={isSaving ? t("Saving...") : t("Save sleep")}
          disabled={isSaving}
          onPress={onSave}
        />
      </View>
    </View>
  );
}

function SleepTypeToggle({ value, onChange, colors, styles, t }) {
  return (
    <View style={styles.typeSection}>
      <Text style={styles.typeSectionTitle}>{t("Sleep type")}</Text>

      <View style={styles.typeToggle}>
        <SleepTypeOption
          icon="cloud-outline"
          label={t("Nap")}
          selected={value === "nap"}
          onPress={() => onChange("nap")}
          colors={colors}
          styles={styles}
        />

        <SleepTypeOption
          icon="moon-outline"
          label={t("Night")}
          selected={value === "night"}
          onPress={() => onChange("night")}
          colors={colors}
          styles={styles}
        />
      </View>
    </View>
  );
}

function SleepTypeOption({ icon, label, selected, onPress, colors, styles }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.typeOption,
        selected && styles.typeOptionSelected,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.typeIconContainer,
          selected && styles.typeIconContainerSelected,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={selected ? colors.primary : colors.textSecondary}
        />
      </View>

      <Text
        style={[
          styles.typeOptionLabel,
          selected && styles.typeOptionLabelSelected,
        ]}
      >
        {label}
      </Text>

      {selected ? (
        <View style={styles.selectedCheck}>
          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
        </View>
      ) : null}
    </Pressable>
  );
}

function LastSleepCard({ sleep, colors, styles, t }) {
  const isNight = sleep.type === "night";

  const durationSeconds =
    sleep.durationSeconds ??
    calculateDurationSeconds(sleep.startedAt, sleep.endedAt);

  return (
    <View style={styles.lastSleepCard}>
      <View style={styles.lastSleepHeader}>
        <View style={styles.lastSleepIconContainer}>
          <Ionicons
            name={isNight ? "moon-outline" : "cloud-outline"}
            size={18}
            color={colors.primary}
          />
        </View>

        <View style={styles.lastSleepTitleContainer}>
          <Text style={styles.lastSleepTitle}>
            {isNight ? t("Last night") : t("Last nap")}
          </Text>

          <Text style={styles.lastSleepTimes}>
            {formatTime(sleep.startedAt)}
            {" – "}
            {formatTime(sleep.endedAt)}
          </Text>
        </View>

        <Text style={styles.lastSleepDuration}>
          {formatShortDuration(durationSeconds, t)}
        </Text>
      </View>
    </View>
  );
}

function calculateDurationSeconds(startedAt, endedAt) {
  if (!startedAt || !endedAt) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
    ),
  );
}

function formatTime(dateValue) {
  if (!dateValue) {
    return "--:--";
  }

  return new Date(dateValue).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds ?? 0);

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

function formatShortDuration(totalSeconds, t) {
  const safeSeconds = Math.max(0, totalSeconds ?? 0);

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return t("hours and minutes short", {
      hours,
      minutes,
    });
  }

  return t("minutes short", {
    minutes,
  });
}

function formatSleepDuration(totalSeconds, t) {
  const safeSeconds = Math.max(0, totalSeconds ?? 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return t("hours and minutes short", {
      hours,
      minutes,
    });
  }

  return t("minutes short", {
    minutes,
  });
}

function createStyles(colors) {
  return StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
    },

    handleContainer: {
      paddingTop: 10,
      paddingBottom: 7,
    },

    handleIndicator: {
      width: 46,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.textSecondary,
      opacity: 0.24,
    },

    content: {
      flex: 1,
    },

    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",

      paddingHorizontal: 20,
      paddingTop: 2,
      paddingBottom: 14,
    },

    headerContent: {
      flex: 1,
      paddingRight: 12,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 22,
      lineHeight: 30,
      letterSpacing: -0.4,
      color: colors.textPrimary,
    },

    subtitle: {
      marginTop: 3,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },

    stateContainer: {
      flex: 1,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },

    stateContent: {
      flex: 1,
      alignItems: "center",
    },

    awakeIllustrationContainer: {
      width: "100%",
      height: 170,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
      overflow: "hidden",
    },

    awakeIllustration: {
      width: 205,
      height: 165,
    },

    sleepingIllustrationContainer: {
      width: "100%",
      height: 160,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
      overflow: "hidden",
    },

    sleepingIllustration: {
      width: 200,
      height: 155,
    },

    stateTextContainer: {
      alignItems: "center",
      marginTop: 12,
    },

    activeStateTextContainer: {
      alignItems: "center",
      marginTop: 13,
    },

    stateTitle: {
      textAlign: "center",
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 21,
      lineHeight: 28,
      color: colors.textPrimary,
    },

    stateDescription: {
      maxWidth: 290,
      marginTop: 6,
      textAlign: "center",
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
    },

    startedAtText: {
      marginTop: 5,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
    },

    typeSection: {
      width: "100%",
      marginTop: 20,
    },

    typeSectionTitle: {
      marginBottom: 9,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.textPrimary,
    },

    typeToggle: {
      flexDirection: "row",
      gap: 10,
    },

    typeOption: {
      position: "relative",
      flex: 1,
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 13,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      backgroundColor: colors.white,
    },

    typeOptionSelected: {
      borderColor: `${colors.primary}70`,
      backgroundColor: colors.selectedBackground,
    },

    typeIconContainer: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: colors.lightBackground,
    },

    typeIconContainerSelected: {
      backgroundColor: `${colors.primary}12`,
    },

    typeOptionLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      color: colors.textSecondary,
    },

    typeOptionLabelSelected: {
      color: colors.primary,
    },

    selectedCheck: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 18,
      height: 18,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 9,
      backgroundColor: colors.primary,
    },

    lastSleepHeader: {
      flexDirection: "row",
      alignItems: "center",
    },

    lastSleepCard: {
      width: "100%",
      marginTop: 16,
      paddingHorizontal: 14,
      paddingVertical: 13,
      borderWidth: 1,
      borderColor: `${colors.primary}30`,
      borderRadius: 20,
      backgroundColor: `${colors.primary}08`,
    },

    lastSleepIconContainer: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: `${colors.primary}14`,
    },

    lastSleepDuration: {
      marginLeft: 10,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 13,
      color: colors.primary,
    },
    lastSleepTitleContainer: {
      flex: 1,
      marginLeft: 11,
    },

    lastSleepTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,
      color: colors.textPrimary,
    },

    lastSleepTimes: {
      marginTop: 2,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,
      color: colors.textSecondary,
    },

    idleActions: {
      width: "100%",
      marginTop: "auto",
      paddingTop: 16,
    },

    progressBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: "#F1F0FF",
    },

    progressDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: "#756BD8",
    },

    progressBadgeText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 11,
      color: "#645BBB",
    },

    timerCard: {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 20,
      paddingVertical: 20,
      borderWidth: 1,
      borderColor: "#DED9FA",
      borderRadius: 24,
      backgroundColor: "#F8F7FF",
    },

    timerValue: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 38,
      lineHeight: 48,
      letterSpacing: 1,
      color: colors.textPrimary,
    },

    activeActions: {
      width: "100%",
      marginTop: "auto",
      paddingTop: 20,
    },

    confirmationScrollContent: {
      alignItems: "center",
      paddingBottom: 24,
    },

    sleepSummaryCard: {
      width: "100%",
      marginTop: 22,
      padding: 14,
      borderWidth: 1,
      borderColor: `${colors.primary}30`,
      borderRadius: 20,
      backgroundColor: `${colors.primary}08`,
    },

    sleepSummaryDuration: {
      marginLeft: 10,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 14,
      color: colors.primary,
    },

    noteSection: {
      width: "100%",
      marginTop: 20,
    },

    noteHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 9,
    },

    noteLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.textPrimary,
    },

    noteCounter: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      color: colors.textSecondary,
    },

    noteCounterLimit: {
      color: colors.error,
    },

    noteInputContainer: {
      minHeight: 116,
      flexDirection: "row",
      alignItems: "flex-start",
      paddingHorizontal: 13,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.white,
    },

    noteIcon: {
      marginTop: 1,
      marginRight: 9,
    },

    noteInput: {
      minHeight: 92,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.white,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 19,
      color: colors.textPrimary,
    },

    sleepTags: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 10,
    },

    sleepTag: {
      minHeight: 32,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.lightBackground,
    },

    sleepTagSelected: {
      borderColor: `${colors.primary}55`,
      backgroundColor: `${colors.primary}10`,
    },

    sleepTagText: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      color: colors.textSecondary,
    },

    sleepTagTextSelected: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      color: colors.primary,
    },

    pressed: {
      opacity: 0.68,
      transform: [{ scale: 0.98 }],
    },

    addManuallyButton: {
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      marginBottom: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },

    addManuallyText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 16,
      lineHeight: 19,
      color: colors.textPrimary,
    },
    wakeConfirmationContainer: {
      flex: 1,
      width: "100%",
    },

    confirmationScroll: {
      flex: 1,
    },

    confirmationScrollContent: {
      paddingTop: 4,
      paddingBottom: 28,
    },

    wakeIntroduction: {
      marginBottom: 20,
    },

    wakeTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
      lineHeight: 27,
      color: colors.textPrimary,
    },

    wakeDescription: {
      marginTop: 5,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
    },

    sleepSummaryCard: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderWidth: 1,
      borderColor: `${colors.primary}22`,
      borderRadius: 20,
      backgroundColor: `${colors.primary}08`,
    },

    sleepSummaryIconContainer: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
      borderRadius: 16,
      backgroundColor: `${colors.primary}12`,
    },

    sleepSummaryContent: {
      flex: 1,
    },

    sleepSummaryHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },

    sleepSummaryType: {
      flex: 1,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      color: colors.textPrimary,
    },

    sleepSummaryDuration: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      color: colors.primary,
    },

    sleepSummaryPeriod: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginTop: 7,
    },

    sleepSummaryTime: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      color: colors.textSecondary,
    },

    noteSection: {
      width: "100%",
      marginTop: 24,
    },

    noteHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    noteLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.textPrimary,
    },

    noteCounter: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      color: colors.textSecondary,
    },

    noteCounterLimit: {
      color: colors.error,
    },

    sleepTags: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 11,
    },

    sleepTag: {
      minHeight: 32,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.lightBackground,
    },

    sleepTagSelected: {
      borderColor: `${colors.primary}50`,
      backgroundColor: `${colors.primary}10`,
    },

    sleepTagText: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      color: colors.textSecondary,
    },

    sleepTagTextSelected: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      color: colors.primary,
    },

    noteInput: {
      minHeight: 96,
      marginTop: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.white,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 19,
      color: colors.textPrimary,
    },

    confirmationActions: {
      width: "100%",
      gap: 12,
      paddingTop: 14,
      paddingBottom: Platform.OS === "ios" ? 6 : 2,

      backgroundColor: colors.white,
    },

    continueSleepButton: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: `${colors.primary}35`,
      borderRadius: 16,
      backgroundColor: `${colors.primary}07`,
    },

    continueSleepButtonText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.primary,
    },

    disabledButton: {
      opacity: 0.5,
    },
  });
}
