import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";

import TrackingHeader from "../../components/tracking/byDay/TrackingHeader.js";
import TrackingViewSwitcher from "../../components/tracking/byDay/TrackingViewSwitcher.js";
import TrackingDayToolbar from "../../components/tracking/byDay/TrackingDayToolbar.js";
import TrackingTimeline from "../../components/tracking/byDay/TrackingTimeline.js";
import TrackingWeekChart from "../../components/tracking/byDay/TrackingWeekChart.js";

import TrackingByTypeView from "../../components/tracking/byTracking/TrackingByTypeView.js";

import ChildSelectorSheet from "../child/ChildSelectorSheet.js";
import ShareChildDataSheet from "../child/Share/ShareChildDataSheet.js";

import {
  mockTrackingChildren,
  mockTrackingDay,
  mockSleepHistoryEntries,
  TRACKING_TYPE_CONFIG,
} from "../../data/mockTrackingData.js";

import { useThemeColors } from "../../theme/useThemeColors.js";

const EMPTY_SUMMARY = {
  entryCount: 0,
  feedingCount: 0,
  sleepDurationMinutes: 0,
  diaperCount: 0,
};

const INITIAL_ACTIVE_LINKS = [
  {
    id: "link-1",
    label: "Last 7 days",
    createdDateLabel: "Aug 17",
    expiryDateLabel: "Aug 24",
    url: "https://nelo.app/share/example",
  },
];

function createLocalDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day, 12, 0, 0);
}

function normalizeDate(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0,
  );
}

function getDateKey(date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isSameDay(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function addDays(date, numberOfDays) {
  const nextDate = normalizeDate(date);

  nextDate.setDate(nextDate.getDate() + numberOfDays);

  return nextDate;
}

function formatSelectedDate(date, language, t) {
  const today = normalizeDate(new Date());

  if (isSameDay(date, today)) {
    return t("Today");
  }

  return new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatSleepDuration(totalMinutes) {
  const safeMinutes = Number(totalMinutes) || 0;

  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes}`;
}

export default function TrackingScreen({ navigation, onEditTrackingEntry }) {
  const { t, i18n } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const childSelectorSheetRef = useRef(null);
  const shareChildDataSheetRef = useRef(null);

  const [selectedChildId, setSelectedChildId] = useState("emma");

  const [viewMode, setViewMode] = useState("day");

  const [selectedFilterIds, setSelectedFilterIds] = useState([]);
  const [dayDisplayMode, setDayDisplayMode] = useState("timeline");
  const [activeLinks, setActiveLinks] = useState(INITIAL_ACTIVE_LINKS);

  const [selectedDate, setSelectedDate] = useState(() =>
    createLocalDate(mockTrackingDay.date),
  );

  const [draftDate, setDraftDate] = useState(selectedDate);

  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  const selectedChild =
    mockTrackingChildren.find((child) => child.id === selectedChildId) ??
    mockTrackingChildren[0];

  const today = useMemo(() => normalizeDate(new Date()), []);

  const selectedDateKey = useMemo(
    () => getDateKey(selectedDate),
    [selectedDate],
  );

  const selectedDay = useMemo(() => {
    const matchesDate = mockTrackingDay.date === selectedDateKey;

    const matchesChild = mockTrackingDay.childId === selectedChildId;

    if (!matchesDate || !matchesChild) {
      return null;
    }

    return mockTrackingDay;
  }, [selectedChildId, selectedDateKey]);

  const selectedDaySummary = selectedDay?.summary ?? EMPTY_SUMMARY;

  const selectedDayEntries = selectedDay?.entries ?? [];

  const chartEntries = useMemo(() => {
    const nonSleepDayEntries = selectedDayEntries.filter(
      (entry) => entry.type !== "sleep",
    );

    return [...mockSleepHistoryEntries, ...nonSleepDayEntries];
  }, [selectedDayEntries]);

  const dateLabel = useMemo(
    () => formatSelectedDate(selectedDate, i18n.language, t),
    [i18n.language, selectedDate, t],
  );

  const isNextDayDisabled = selectedDate.getTime() >= today.getTime();

  const filterValues = useMemo(() => {
    const healthEntryCount = selectedDayEntries.filter((entry) => {
      const visual =
        TRACKING_TYPE_CONFIG[entry.type] ?? TRACKING_TYPE_CONFIG.bottle;

      return visual.category === "health";
    }).length;

    return {
      all: selectedDaySummary.entryCount,

      feeding: selectedDaySummary.feedingCount,

      sleep: formatSleepDuration(selectedDaySummary.sleepDurationMinutes),

      diaper: selectedDaySummary.diaperCount,

      health: healthEntryCount,
    };
  }, [selectedDayEntries, selectedDaySummary]);

  const handleOpenChildSelector = () => {
    childSelectorSheetRef.current?.present();
  };

  const handleSelectChild = (child) => {
    setSelectedChildId(child.id);
    setSelectedFilterIds([]);
  };

  const handleAddChild = () => {
    navigation?.navigate("AddChild");
  };

  const handleChangeViewMode = (mode) => {
    setViewMode(mode);
  };

  const handleSelectFilter = (filterId) => {
    if (filterId === "all") {
      setSelectedFilterIds([]);
      return;
    }

    setSelectedFilterIds((currentFilterIds) => {
      const isAlreadySelected = currentFilterIds.includes(filterId);

      if (isAlreadySelected) {
        return currentFilterIds.filter(
          (currentFilterId) => currentFilterId !== filterId,
        );
      }

      return [...currentFilterIds, filterId];
    });
  };

  const handleToggleDayDisplayMode = () => {
    setDayDisplayMode((currentMode) =>
      currentMode === "timeline" ? "chart" : "timeline",
    );
  };

  const handlePreviousDay = () => {
    setSelectedDate((currentDate) => addDays(currentDate, -1));

    setSelectedFilterIds([]);
  };

  const handleNextDay = () => {
    if (isNextDayDisabled) {
      return;
    }

    setSelectedDate((currentDate) => addDays(currentDate, 1));

    setSelectedFilterIds([]);
  };

  const handleSelectDate = (date) => {
    setSelectedDate(normalizeDate(date));
    setSelectedFilterIds([]);
  };

  const handleOpenDatePicker = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: selectedDate,
        mode: "date",
        maximumDate: today,

        onChange: (event, date) => {
          if (event.type === "set" && date) {
            handleSelectDate(date);
          }
        },
      });

      return;
    }

    setDraftDate(selectedDate);
    setIsDatePickerVisible(true);
  };

  const handleCloseDatePicker = () => {
    setIsDatePickerVisible(false);
  };

  const handleConfirmDatePicker = () => {
    handleSelectDate(draftDate);
    setIsDatePickerVisible(false);
  };

  const handlePressEntry = (entry) => {
    if (!entry) {
      return;
    }

    onEditTrackingEntry?.(entry);
  };

  const handlePressTrackingType = (item) => {
    if (!item?.id) {
      return;
    }

    switch (item.id) {
      case "temperature":
      case "medication":
      case "vaccine":
      case "teething":
      case "note":
        navigation.navigate("TrackingTypeHistory", {
          trackingType: item.id,
          titleKey: item.titleKey,
        });
        return;

      case "symptoms":
      case "feeding":
      case "diaper":
      case "mood":
        navigation.navigate("TrackingStatsHistory", {
          trackingType: item.id,
          titleKey: item.titleKey,
        });
        return;

      case "sleep":
        navigation.navigate("SleepHistory");
        return;
      case "growth":
        navigation.navigate("GrowthHistory");
        return;

      default:
        console.log("Unknown tracking type:", item.id);
    }
  };
  const handleCreateLink = (options = {}) => {
    const now = new Date();

    const newLink = {
      id: `link-${Date.now()}`,
      label: options.periodLabel ?? "Last 7 days",
      createdDateLabel: new Intl.DateTimeFormat(i18n.language, {
        day: "numeric",
        month: "short",
      }).format(now),
      expiryDateLabel: "No expiry",
      url: `https://nelo.app/share/demo-${Date.now()}`,
    };

    console.log("[Share child data] Link created:", {
      ...options,
      link: newLink,
    });

    setActiveLinks((currentLinks) => [newLink, ...currentLinks]);

    return newLink;
  };

  const openCustomPeriodPicker = () => {
    console.log("[Share child data] Open custom period picker");

    Alert.alert(
      t("Custom period"),
      t("The custom period picker will be connected later."),
    );
  };

  const handleShareLink = (link) => {
    console.log("[Share child data] Share link:", link);

    Alert.alert(
      t("Share link"),
      link?.url ?? t("No sharing link is available."),
    );
  };

  const handleCopyLink = (link) => {
    console.log("[Share child data] Copy link:", link);

    Alert.alert(
      t("Link copied"),
      link?.url ?? t("No sharing link is available."),
    );
  };

  const handleDisableLink = async (link) => {
    if (!link?.id) {
      console.warn("[Share child data] Missing link ID.");
      return false;
    }

    console.log("[Share child data] Link disabled:", link.id);

    setActiveLinks((currentLinks) =>
      currentLinks.filter((currentLink) => currentLink.id !== link.id),
    );

    return true;
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <TrackingHeader
          child={selectedChild}
          onPressChild={handleOpenChildSelector}
          onPressShare={() => shareChildDataSheetRef.current?.present()}
        />

        <ShareChildDataSheet
          ref={shareChildDataSheetRef}
          child={selectedChild}
          activeLinks={activeLinks}
          onCreateLink={handleCreateLink}
          onSelectCustomPeriod={openCustomPeriodPicker}
          onShareLink={handleShareLink}
          onCopyLink={handleCopyLink}
          onDisableLink={handleDisableLink}
        />

        <TrackingViewSwitcher
          mode={viewMode}
          onChangeMode={handleChangeViewMode}
        />

        {viewMode === "day" ? (
          <>
            <TrackingDayToolbar
              dateLabel={dateLabel}
              isNextDayDisabled={isNextDayDisabled}
              filterValues={filterValues}
              selectedFilterIds={selectedFilterIds}
              viewMode={dayDisplayMode}
              onPressDate={handleOpenDatePicker}
              onPressPreviousDay={handlePreviousDay}
              onPressNextDay={handleNextDay}
              onSelectFilter={handleSelectFilter}
              onToggleView={handleToggleDayDisplayMode}
            />

            {dayDisplayMode === "timeline" ? (
              <TrackingTimeline
                entries={selectedDayEntries}
                selectedFilterIds={selectedFilterIds}
                onPressEntry={handlePressEntry}
              />
            ) : (
              <TrackingWeekChart
                entries={chartEntries}
                endDate={selectedDate}
                selectedFilterIds={selectedFilterIds}
                onPressEntry={handlePressEntry}
              />
            )}
          </>
        ) : (
          <TrackingByTypeView onPressTrackingType={handlePressTrackingType} />
        )}
      </ScrollView>

      <ChildSelectorSheet
        ref={childSelectorSheetRef}
        children={mockTrackingChildren}
        selectedChildId={selectedChildId}
        onSelectChild={handleSelectChild}
        onAddChild={handleAddChild}
      />

      {Platform.OS === "ios" ? (
        <Modal
          visible={isDatePickerVisible}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={handleCloseDatePicker}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Close date picker")}
              onPress={handleCloseDatePicker}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.datePickerCard}>
              <View style={styles.datePickerHeader}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("Cancel")}
                  onPress={handleCloseDatePicker}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.datePickerAction,
                    pressed && styles.actionPressed,
                  ]}
                >
                  <Text style={styles.datePickerCancel}>{t("Cancel")}</Text>
                </Pressable>

                <Text style={styles.datePickerTitle}>{t("Choose a date")}</Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("Done")}
                  onPress={handleConfirmDatePicker}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.datePickerAction,
                    pressed && styles.actionPressed,
                  ]}
                >
                  <Text style={styles.datePickerConfirm}>{t("Done")}</Text>
                </Pressable>
              </View>

              <DateTimePicker
                value={draftDate}
                mode="date"
                display="inline"
                maximumDate={today}
                onChange={(event, date) => {
                  if (date) {
                    setDraftDate(normalizeDate(date));
                  }
                }}
                style={styles.datePicker}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,

      backgroundColor: colors.background,
    },

    scrollContent: {
      paddingTop: 4,

      /*
       * Espace nécessaire pour la tab bar flottante.
       */
      paddingBottom: 130,
    },

    modalOverlay: {
      flex: 1,

      justifyContent: "flex-end",

      paddingHorizontal: 14,
      paddingBottom: 24,

      backgroundColor: "rgba(18, 31, 53, 0.32)",
    },

    datePickerCard: {
      paddingTop: 6,
      paddingBottom: 12,

      borderRadius: 24,

      backgroundColor: colors.white,

      overflow: "hidden",

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.12,
      shadowRadius: 20,

      elevation: 8,
    },

    datePickerHeader: {
      minHeight: 48,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",

      paddingHorizontal: 16,
    },

    datePickerAction: {
      minWidth: 58,
      minHeight: 40,

      alignItems: "center",
      justifyContent: "center",
    },

    datePickerTitle: {
      flex: 1,

      textAlign: "center",

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      lineHeight: 21,

      color: colors.textPrimary,
    },

    datePickerCancel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,

      color: colors.textSecondary,
    },

    datePickerConfirm: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 13,
      lineHeight: 18,

      color: colors.primary ?? "#4F7DF3",
    },

    datePicker: {
      alignSelf: "center",
    },

    actionPressed: {
      opacity: 0.65,
      transform: [{ scale: 0.97 }],
    },

    chartPlaceholder: {
      minHeight: 300,

      alignItems: "center",
      justifyContent: "center",

      marginHorizontal: 20,
      marginTop: 20,

      borderRadius: 20,

      backgroundColor: colors.white,
    },

    chartPlaceholderText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 20,

      color: colors.textSecondary,
    },
  });
