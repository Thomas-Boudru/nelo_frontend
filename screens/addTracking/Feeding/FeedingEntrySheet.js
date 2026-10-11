import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../../auth/AuthProvider.js";

import {
  getLocalBottlePreferences,
  saveLocalBottlePreference,
} from "../../../database/tracking/feed/bottlePreferencesLocal.js";

import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import TrackingHistoryButton from "../../../components/addTracking/TrackingHistoryButton.js";

import FeedingTypeTabs from "../../../components/addTracking/feeding/FeedingTypeTabs.js";
import BottleFeedForm from "../../../components/addTracking/feeding/BottleFeedForm.js";
import SolidsFeedForm from "../../../components/addTracking/feeding/SolidFeedForm.js";
import PumpingForm from "../../../components/addTracking/feeding/PumpingForm.js";
import BreastfeedingForm, {
  getCurrentBreastfeedingDurations,
} from "../../../components/addTracking/feeding/BreastfeedingForm.js";
import {
  createLocalSolidFeedingEntry,
  updateLocalSolidFeedingEntry,
} from "../../../database/tracking/feed/solidsRepository.js";

import BottleCapacitySheet from "./BottleCapacitySheet.js";
import MilkTypeSheet from "../../../components/addTracking/feeding/MilkyTypeSheet.js";
import ExactAmountSheet from "./ExactAmountSheet.js";
import ManualBreastfeedingSheet from "./ManualBreastFeedingSheet.js";
import NoteSheet from "./NoteSheet.js";
import AddFoodSheet from "./AddFoodSheet.js";

import {
  createLocalBottleEntry,
  updateLocalBottleEntry,
} from "../../../database/tracking/feed/bottleRepository.js";
import {
  createLocalBreastfeedingEntry,
  updateLocalBreastfeedingEntry,
} from "../../../database/tracking/feed/breastFeedingRepository.js";

import {
  createLocalPumpingEntry,
  updateLocalPumpingEntry,
} from "../../../database/tracking/feed/pumpingRepository.js";
import {
  getLocalCustomFoods,
  saveCustomFoodLocally,
  deleteCustomFoodLocally,
} from "../../../database/tracking/feed/customFoodsRepository.js";

import { processSyncQueue } from "../../../sync/processSyncQueue.js";

import {
  BOTTLE_PORTIONS,
  DEFAULT_BOTTLE_CAPACITY_ML,
  getBottleAmountMl,
  getBottleEntryAmountMl,
} from "../../../components/addTracking/feeding/feedingUnits.js";

import { useThemeColors } from "../../../theme/useThemeColors.js";

const EDIT_TITLE_BY_TYPE = {
  bottle: "Edit bottle",
  breastfeeding: "Edit breastfeeding",
  solids: "Edit solid food",
  pumping: "Edit pumping",
};

function getEntryDate(entry, preferredDateKey) {
  const dateValue =
    entry?.[preferredDateKey] ??
    entry?.feedingDate ??
    entry?.occurredAt ??
    entry?.startedAt ??
    entry?.date;

  if (!dateValue) {
    return {
      date: new Date(),
      hasRecordedDate: false,
    };
  }

  const parsedDate = new Date(dateValue);
  const hasRecordedDate = !Number.isNaN(parsedDate.getTime());

  return {
    date: hasRecordedDate ? parsedDate : new Date(),

    hasRecordedDate,
  };
}

const DEFAULT_BOTTLE_PREFS = {
  capacityMl: DEFAULT_BOTTLE_CAPACITY_ML,
  milkType: "formula",
  viewMode: "bottle",
};

function createDefaultBottleEntry(prefs = DEFAULT_BOTTLE_PREFS) {
  return {
    bottleCapacityMl: prefs.capacityMl,
    portionId: "full",
    milkType: prefs.milkType,
    note: "",
    fraction: 1,
    isExactAmountMode: false,
    exactAmount: "",
    feedingDate: new Date(),
    isDateEdited: false,
  };
}

function createDefaultBreastfeedingEntry() {
  return {
    leftDurationSeconds: 0,
    rightDurationSeconds: 0,

    activeSide: null,
    activeStartedAt: null,

    note: "",

    feedingDate: new Date(),
    isDateEdited: false,
  };
}

function createDefaultPumpingEntry() {
  return {
    pumpingDate: new Date(),

    leftDurationSeconds: 0,
    rightDurationSeconds: 0,

    leftAmountMl: 0,
    rightAmountMl: 0,

    activeSide: null,
    activeStartedAt: null,

    isDateEdited: false,
    note: "",
  };
}

function createDefaultSolidsEntry() {
  return {
    foods: [],
    amountEaten: "tasted",
    appreciation: null,

    note: "",
    photos: [],

    feedingDate: new Date(),
    isDateEdited: false,
  };
}

function createBottleEntryFromTrackingEntry(entry) {
  const amountMl = Number(
    entry?.amountMl ?? entry?.details?.amountMl ?? entry?.value ?? 0,
  );

  const capacityMl = Math.max(
    Number(entry?.bottleCapacityMl ?? entry?.details?.bottleCapacityMl) ||
      DEFAULT_BOTTLE_CAPACITY_ML,

    amountMl,
  );

  const fraction =
    capacityMl > 0 ? Math.min(Math.max(amountMl / capacityMl, 0), 1) : 0;

  const matchingPortion = BOTTLE_PORTIONS.find(
    (portion) =>
      getBottleAmountMl(capacityMl, portion.fraction) === Math.round(amountMl),
  );

  const { date, hasRecordedDate } = getEntryDate(entry, "feedingDate");

  return {
    bottleCapacityMl: capacityMl,

    portionId: matchingPortion?.id ?? null,

    milkType: entry?.milkType ?? entry?.details?.milkType ?? "formula",

    note: entry?.note ?? entry?.details?.note ?? "",

    fraction,

    isExactAmountMode: false,

    exactAmount: amountMl > 0 ? String(Math.round(amountMl)) : "",

    feedingDate: date,
    isDateEdited: hasRecordedDate,
  };
}

function createBreastfeedingEntryFromTrackingEntry(entry) {
  const { date, hasRecordedDate } = getEntryDate(entry, "feedingDate");

  return {
    leftDurationSeconds: Number(
      entry?.leftDurationSeconds ?? entry?.details?.leftDurationSeconds ?? 0,
    ),

    rightDurationSeconds: Number(
      entry?.rightDurationSeconds ?? entry?.details?.rightDurationSeconds ?? 0,
    ),

    firstSide: entry?.firstSide ?? entry?.details?.firstSide ?? null,

    lastSide: entry?.lastSide ?? entry?.details?.lastSide ?? null,

    activeSide: null,
    activeStartedAt: null,

    note: entry?.note ?? entry?.details?.note ?? "",

    feedingDate: date,
    isDateEdited: hasRecordedDate,
  };
}

function createPumpingEntryFromTrackingEntry(entry) {
  const { date, hasRecordedDate } = getEntryDate(entry, "pumpingDate");

  const totalAmountMl = Number(
    entry?.totalAmountMl ?? entry?.details?.totalAmountMl ?? 0,
  );

  const storedLeftAmount = Number(
    entry?.leftAmountMl ?? entry?.details?.leftAmountMl ?? 0,
  );

  const storedRightAmount = Number(
    entry?.rightAmountMl ?? entry?.details?.rightAmountMl ?? 0,
  );

  /*
   * Pour les anciens mocks qui ne contiennent que
   * totalAmountMl, on place temporairement le volume
   * total du côté gauche afin de ne pas perdre la valeur.
   */
  const hasSeparatedAmounts = storedLeftAmount > 0 || storedRightAmount > 0;

  return {
    pumpingDate: date,

    leftDurationSeconds: Number(
      entry?.leftDurationSeconds ?? entry?.details?.leftDurationSeconds ?? 0,
    ),

    rightDurationSeconds: Number(
      entry?.rightDurationSeconds ?? entry?.details?.rightDurationSeconds ?? 0,
    ),

    leftAmountMl: hasSeparatedAmounts ? storedLeftAmount : totalAmountMl,

    rightAmountMl: hasSeparatedAmounts ? storedRightAmount : 0,

    activeSide: null,
    activeStartedAt: null,

    isDateEdited: hasRecordedDate,

    note: entry?.note ?? entry?.details?.note ?? "",
  };
}

function createSolidsEntryFromTrackingEntry(entry) {
  const { date, hasRecordedDate } = getEntryDate(entry, "feedingDate");

  const foods = Array.isArray(entry?.foods)
    ? entry.foods
    : Array.isArray(entry?.details?.foods)
      ? entry.details.foods
      : [];

  return {
    foods,

    amountEaten: entry?.amountEaten ?? entry?.details?.amountEaten ?? "tasted",

    appreciation: entry?.appreciation ?? entry?.details?.appreciation ?? null,

    note: entry?.note ?? entry?.details?.note ?? "",

    photo: entry?.photo ?? entry?.details?.photo ?? null,

    feedingDate: date,
    isDateEdited: hasRecordedDate,
  };
}

const FeedingEntrySheet = forwardRef(function FeedingEntrySheet(
  {
    childName,
    childId,
    userId,
    visibleFeedingMethods = ["breastfeeding", "bottle", "solids", "pumping"],

    onSaveBottle,
    onSaveBreastfeeding,
    onSaveSolids,
    onSavePumping,
    onRequestDelete,
    onPressHistory,
  },
  ref,
) {
  const { t } = useTranslation();

  const { user, accessToken, refreshSession } = useAuth();

  const [isSavingFeeding, setIsSavingFeeding] = useState(false);
  const [feedingSaveError, setFeedingSaveError] = useState("");

  const savingFeedingRef = useRef(false);

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const modalRef = useRef(null);
  const bottleCapacitySheetRef = useRef(null);
  const milkTypeSheetRef = useRef(null);
  const noteSheetRef = useRef(null);
  const exactAmountSheetRef = useRef(null);
  const manualBreastfeedingSheetRef = useRef(null);
  const addFoodSheetRef = useRef(null);

  const bottlePrefsRef = useRef(DEFAULT_BOTTLE_PREFS);
  const [bottleViewMode, setBottleViewMode] = useState("bottle");

  const [sheetMode, setSheetMode] = useState("create");

  const [selectedType, setSelectedType] = useState("bottle");

  const [editingEntry, setEditingEntry] = useState(null);

  const [noteTarget, setNoteTarget] = useState(null);

  const [customFoods, setCustomFoods] = useState([]);

  const customFoodScopeRef = useRef("");

  const customFoodScope = `${userId ?? ""}:${childId ?? ""}`;

  customFoodScopeRef.current = customFoodScope;

  useEffect(() => {
    let cancelled = false;

    setCustomFoods([]);

    if (!userId || !childId) {
      return undefined;
    }

    getLocalCustomFoods({ userId, childId })
      .then((foods) => {
        if (!cancelled) {
          setCustomFoods(foods);
        }
      })
      .catch((error) => {
        console.error("Unable to load local custom foods:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, childId]);

  const [bottleGesture, setBottleGesture] = useState(null);

  const [bottleEntry, setBottleEntry] = useState(createDefaultBottleEntry);

  const [breastfeedingEntry, setBreastfeedingEntry] = useState(
    createDefaultBreastfeedingEntry,
  );

  const [pumpingEntry, setPumpingEntry] = useState(createDefaultPumpingEntry);

  const [solidsEntry, setSolidsEntry] = useState(createDefaultSolidsEntry);

  const isEditMode = sheetMode === "edit";

  const bottleAmountMl = getBottleEntryAmountMl(bottleEntry);

  const breastfeedingDurations =
    getCurrentBreastfeedingDurations(breastfeedingEntry);

  const pumpingAmountMl =
    Number(pumpingEntry.leftAmountMl ?? 0) +
    Number(pumpingEntry.rightAmountMl ?? 0);

  const snapPoints = useMemo(() => ["92%"], []);

  useEffect(() => {
    if (selectedType !== "bottle") {
      setBottleGesture(null);
    }
  }, [selectedType]);

  useEffect(() => {
    if (!userId || !childId) return;

    let cancelled = false;

    getLocalBottlePreferences({ userId, childId })
      .then((row) => {
        if (cancelled) return;

        const next = {
          capacityMl:
            Number(row?.bottleCapacityMl) > 0
              ? Number(row.bottleCapacityMl)
              : DEFAULT_BOTTLE_CAPACITY_ML,
          milkType: row?.milkType ?? "formula",
          viewMode: row?.amountView === "simple" ? "simple" : "bottle",
        };

        bottlePrefsRef.current = next;
        setBottleViewMode(next.viewMode);
      })
      .catch((error) => console.warn("Bottle preferences load failed", error));

    return () => {
      cancelled = true;
    };
  }, [userId, childId]);

  const persistBottlePreference = useCallback(
    (preference, value) => {
      if (!userId || !childId) return;

      saveLocalBottlePreference({ userId, childId, preference, value }).catch(
        (error) => console.warn("Bottle preference save failed", error),
      );
    },
    [userId, childId],
  );

  const synchronizeCustomFoods = useCallback(() => {
    if (
      user?.id !== userId ||
      !accessToken ||
      typeof refreshSession !== "function"
    ) {
      return;
    }

    processSyncQueue({
      userId,
      accessToken,
      refreshSession,
    }).catch((error) => {
      console.warn("Unable to synchronize custom foods:", error);
    });
  }, [user?.id, userId, accessToken, refreshSession]);

  const resetEntryForType = useCallback((feedingType) => {
    if (feedingType === "bottle") {
      setBottleEntry(createDefaultBottleEntry(bottlePrefsRef.current));
      return;
    }

    if (feedingType === "breastfeeding") {
      setBreastfeedingEntry(createDefaultBreastfeedingEntry());
      return;
    }

    if (feedingType === "solids") {
      setSolidsEntry(createDefaultSolidsEntry());
      return;
    }

    if (feedingType === "pumping") {
      setPumpingEntry(createDefaultPumpingEntry());
    }
  }, []);

  const loadEntryForType = useCallback((feedingType, entry) => {
    if (feedingType === "bottle") {
      setBottleEntry(createBottleEntryFromTrackingEntry(entry));
      return;
    }

    if (feedingType === "breastfeeding") {
      setBreastfeedingEntry(createBreastfeedingEntryFromTrackingEntry(entry));
      return;
    }

    if (feedingType === "solids") {
      setSolidsEntry(createSolidsEntryFromTrackingEntry(entry));
      return;
    }

    if (feedingType === "pumping") {
      setPumpingEntry(createPumpingEntryFromTrackingEntry(entry));
    }
  }, []);

  const availableFeedingMethods = useMemo(() => {
    const validMethods = ["bottle", "breastfeeding", "solids", "pumping"];

    const filteredMethods = Array.isArray(visibleFeedingMethods)
      ? visibleFeedingMethods.filter((method) => validMethods.includes(method))
      : [];

    return filteredMethods.length > 0 ? filteredMethods : validMethods;
  }, [visibleFeedingMethods]);

  useEffect(() => {
    if (
      sheetMode === "create" &&
      !availableFeedingMethods.includes(selectedType)
    ) {
      const nextType = availableFeedingMethods[0];

      setSelectedType(nextType);
      resetEntryForType(nextType);
    }
  }, [availableFeedingMethods, resetEntryForType, selectedType, sheetMode]);

  useImperativeHandle(
    ref,
    () => ({
      present(options = {}) {
        /*
         * Compatibilité temporaire avec present("bottle").
         */
        if (typeof options === "string") {
          const requestedType = options;

          const resolvedFeedingType = availableFeedingMethods.includes(
            requestedType,
          )
            ? requestedType
            : availableFeedingMethods[0];

          setSheetMode("create");
          setEditingEntry(null);
          setSelectedType(resolvedFeedingType);
          resetEntryForType(resolvedFeedingType);

          modalRef.current?.present();
          return;
        }

        const { mode = "create", feedingType, entry = null } = options;

        /*
         * En édition, on conserve toujours le type de l’entrée existante,
         * même si cette méthode est maintenant masquée.
         */
        const resolvedFeedingType =
          mode === "edit" && feedingType
            ? feedingType
            : availableFeedingMethods.includes(feedingType)
              ? feedingType
              : availableFeedingMethods[0];

        setSheetMode(mode);
        setSelectedType(resolvedFeedingType);

        if (mode === "edit" && entry) {
          setEditingEntry(entry);
          loadEntryForType(resolvedFeedingType, entry);
        } else {
          setEditingEntry(null);
          resetEntryForType(resolvedFeedingType);
        }

        modalRef.current?.present();
      },

      dismiss() {
        modalRef.current?.dismiss();
      },
    }),
    [availableFeedingMethods, loadEntryForType, resetEntryForType],
  );

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

  const handleBottleGestureChange = useCallback((gesture) => {
    setBottleGesture(gesture ?? null);
  }, []);

  const openNoteSheet = (target, currentNote = "") => {
    setNoteTarget(target);

    noteSheetRef.current?.present(currentNote);
  };

  const handleRequestDelete = () => {
    if (!isEditMode || !editingEntry) {
      return;
    }

    onRequestDelete?.(editingEntry);
  };

  const handleAddFood = useCallback((foodToAdd) => {
    if (!foodToAdd) {
      return;
    }

    setSolidsEntry((current) => ({
      ...current,

      foods: [...(current.foods ?? []), foodToAdd],
    }));
  }, []);

  const handleSaveCustomFood = useCallback(
    async (foodToSave) => {
      const scope = customFoodScope;

      const savedFood = await saveCustomFoodLocally({
        userId,
        childId,
        food: foodToSave,
      });

      if (customFoodScopeRef.current === scope) {
        setCustomFoods((currentFoods) => {
          const otherFoods = currentFoods.filter(
            (food) => food.id !== savedFood.id,
          );

          return [savedFood, ...otherFoods];
        });
      }

      synchronizeCustomFoods();

      return savedFood;
    },
    [userId, childId, customFoodScope, synchronizeCustomFoods],
  );

  const handleDeleteCustomFood = useCallback(
    async (foodToDelete) => {
      const scope = customFoodScope;

      const deletedFood = await deleteCustomFoodLocally({
        userId,
        childId,
        foodId: foodToDelete.id,
      });

      if (customFoodScopeRef.current === scope) {
        setCustomFoods((currentFoods) =>
          currentFoods.map((food) =>
            food.id === deletedFood.id ? deletedFood : food,
          ),
        );

        // Un aliment supprimé ne doit plus être envoyé dans
        // un nouveau repas encore en cours de préparation.
        setSolidsEntry((current) => ({
          ...current,
          foods: (current.foods ?? []).filter(
            (food) => !food.isCustom || food.foodId !== deletedFood.id,
          ),
        }));
      }

      synchronizeCustomFoods();

      return deletedFood;
    },
    [userId, childId, customFoodScope, synchronizeCustomFoods],
  );

  const canSaveBottle = selectedType === "bottle" && bottleAmountMl > 0;

  const canSaveBreastfeeding =
    selectedType === "breastfeeding" &&
    (breastfeedingDurations.leftDurationSeconds > 0 ||
      breastfeedingDurations.rightDurationSeconds > 0 ||
      !!breastfeedingEntry.activeSide);

  const canSaveSolids =
    selectedType === "solids" &&
    Array.isArray(solidsEntry.foods) &&
    solidsEntry.foods.length > 0;

  const canSavePumping = selectedType === "pumping" && pumpingAmountMl > 0;

  const canSaveFeeding =
    canSaveBottle || canSaveBreastfeeding || canSaveSolids || canSavePumping;

  const handleSaveFeeding = async () => {
    if (savingFeedingRef.current || !canSaveFeeding) {
      return;
    }

    savingFeedingRef.current = true;
    setIsSavingFeeding(true);
    setFeedingSaveError("");

    try {
      if (selectedType === "bottle") {
        if (bottleAmountMl <= 0) {
          return;
        }

        const data = {
          amountMl: bottleAmountMl,
          bottleCapacityMl: bottleEntry.bottleCapacityMl,
          milkType: bottleEntry.milkType,
          feedingDate: bottleEntry.feedingDate,
          note: bottleEntry.note,
        };

        const localEntry = isEditMode
          ? await updateLocalBottleEntry({
              userId,
              childId,
              entryId: editingEntry?.id,
              data,
            })
          : await createLocalBottleEntry({
              userId,
              childId,
              data,
            });

        modalRef.current?.dismiss();

        try {
          await onSaveBottle?.({
            ...localEntry,
            mode: isEditMode ? "edit" : "create",
            persistedLocally: true,
          });
        } catch (displayError) {
          console.error(
            "Bottle saved locally but unable to refresh the display:",
            displayError,
          );
        }

        if (
          user?.id === userId &&
          accessToken &&
          typeof refreshSession === "function"
        ) {
          processSyncQueue({
            userId,
            accessToken,
            refreshSession,
          }).catch((syncError) => {
            console.warn(
              "Bottle saved locally but synchronization failed:",
              syncError,
            );
          });
        }

        return;
      }

      if (selectedType === "breastfeeding") {
        const currentDurations =
          getCurrentBreastfeedingDurations(breastfeedingEntry);

        if (
          currentDurations.leftDurationSeconds <= 0 &&
          currentDurations.rightDurationSeconds <= 0
        ) {
          return;
        }

        const data = {
          feedingDate: breastfeedingEntry.feedingDate,
          leftDurationSeconds: currentDurations.leftDurationSeconds,
          rightDurationSeconds: currentDurations.rightDurationSeconds,
          firstSide: breastfeedingEntry.firstSide ?? null,
          lastSide: breastfeedingEntry.lastSide ?? null,
          note: breastfeedingEntry.note,
        };

        const localEntry = isEditMode
          ? await updateLocalBreastfeedingEntry({
              userId,
              childId,
              entryId: editingEntry?.id,
              data,
            })
          : await createLocalBreastfeedingEntry({
              userId,
              childId,
              data,
            });

        modalRef.current?.dismiss();

        try {
          await onSaveBreastfeeding?.({
            ...localEntry,
            mode: isEditMode ? "edit" : "create",
            persistedLocally: true,
          });
        } catch (displayError) {
          console.error(
            "Breastfeeding saved locally but unable to refresh the display:",
            displayError,
          );
        }

        if (
          user?.id === userId &&
          accessToken &&
          typeof refreshSession === "function"
        ) {
          processSyncQueue({
            userId,
            accessToken,
            refreshSession,
          }).catch((syncError) => {
            console.warn(
              "Breastfeeding saved locally but synchronization failed:",
              syncError,
            );
          });
        }

        return;
      }

      if (selectedType === "solids") {
        if (
          !Array.isArray(solidsEntry.foods) ||
          solidsEntry.foods.length === 0
        ) {
          return;
        }

        const localEntry = isEditMode
          ? await updateLocalSolidFeedingEntry({
              userId,
              childId,
              entryId: editingEntry?.id,
              data: solidsEntry,
            })
          : await createLocalSolidFeedingEntry({
              userId,
              childId,
              data: solidsEntry,
            });
        modalRef.current?.dismiss();

        try {
          await onSaveSolids?.({
            ...localEntry,
            mode: isEditMode ? "edit" : "create",
            persistedLocally: true,
          });
        } catch (displayError) {
          console.error(
            "Meal saved locally but unable to refresh the display:",
            displayError,
          );
        }

        if (
          user?.id === userId &&
          accessToken &&
          typeof refreshSession === "function"
        ) {
          processSyncQueue({
            userId,
            accessToken,
            refreshSession,
          }).catch((syncError) => {
            console.warn(
              "Meal saved locally but synchronization failed:",
              syncError,
            );
          });
        }

        return;
      }

      if (selectedType === "pumping") {
        if (pumpingAmountMl <= 0) {
          return;
        }

        const data = {
          pumpingDate: pumpingEntry.pumpingDate,
          leftAmountMl: pumpingEntry.leftAmountMl ?? 0,
          rightAmountMl: pumpingEntry.rightAmountMl ?? 0,
          note: pumpingEntry.note,
        };

        const localEntry = isEditMode
          ? await updateLocalPumpingEntry({
              userId,
              childId,
              entryId: editingEntry?.id,
              data,
            })
          : await createLocalPumpingEntry({
              userId,
              childId,
              data,
            });
        modalRef.current?.dismiss();

        try {
          await onSavePumping?.({
            ...localEntry,
            mode: isEditMode ? "edit" : "create",
            persistedLocally: true,
          });
        } catch (displayError) {
          console.error(
            "Pumping saved locally but unable to refresh the display:",
            displayError,
          );
        }

        if (
          user?.id === userId &&
          accessToken &&
          typeof refreshSession === "function"
        ) {
          processSyncQueue({
            userId,
            accessToken,
            refreshSession,
          }).catch((syncError) => {
            console.warn(
              "Pumping saved locally but synchronization failed:",
              syncError,
            );
          });
        }

        return;
      }
    } catch (error) {
      console.error("Unable to save feeding:", error);

      setFeedingSaveError(
        error.code === "MEAL_PHOTOS_SYNC_PENDING"
          ? t("Wait for this meal's photos to sync before editing it.")
          : t("Unable to save this feeding. Please try again."),
      );
    } finally {
      savingFeedingRef.current = false;
      setIsSavingFeeding(false);
    }
  };

  const renderForm = () => {
    switch (selectedType) {
      case "bottle":
        return (
          <BottleFeedForm
            value={bottleEntry}
            onChange={setBottleEntry}
            viewMode={bottleViewMode}
            onChangeViewMode={(mode) => {
              setBottleViewMode(mode);
              bottlePrefsRef.current = {
                ...bottlePrefsRef.current,
                viewMode: mode,
              };
              persistBottlePreference("amountView", mode);
            }}
            onPressCapacity={({ currentCapacityMl }) => {
              bottleCapacitySheetRef.current?.present(currentCapacityMl);
            }}
            onPressMilkType={({ currentMilkType }) => {
              milkTypeSheetRef.current?.present(currentMilkType);
            }}
            onPressNote={() => {
              openNoteSheet("bottle", bottleEntry.note);
            }}
            onBottleGestureChange={handleBottleGestureChange}
            onPressExactAmount={() => {
              exactAmountSheetRef.current?.present(bottleAmountMl);
            }}
          />
        );

      case "breastfeeding":
        return (
          <BreastfeedingForm
            value={breastfeedingEntry}
            onChange={setBreastfeedingEntry}
            onPressNote={() => {
              openNoteSheet("breastfeeding", breastfeedingEntry.note);
            }}
            onPressAddManually={() => {
              manualBreastfeedingSheetRef.current?.present(breastfeedingEntry);
            }}
          />
        );

      case "solids":
        return (
          <SolidsFeedForm
            value={solidsEntry}
            onChange={setSolidsEntry}
            childName={childName}
            onPressAddFoods={() => {
              addFoodSheetRef.current?.present();
            }}
            onPressEditFood={() => {
              /*
               * L’édition d’un aliment précis
               * pourra être ajoutée ensuite.
               */
            }}
            onPressNote={() => {
              openNoteSheet("solids", solidsEntry.note);
            }}
            onPressPhoto={() => {
              /*
               * Connexion à expo-image-picker
               * ensuite.
               */
            }}
          />
        );

      case "pumping":
        return (
          <PumpingForm
            value={pumpingEntry}
            onChange={setPumpingEntry}
            onPressNote={() => {
              openNoteSheet("pumping", pumpingEntry.note);
            }}
          />
        );

      default:
        return null;
    }
  };

  const handleOpenHistory = () => {
    modalRef.current?.dismiss();

    setTimeout(() => {
      onPressHistory?.(selectedType);
    }, 220);
  };

  const editTitle = EDIT_TITLE_BY_TYPE[selectedType] ?? "Edit feeding";

  return (
    <BottomSheetModal
      ref={modalRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      waitFor={bottleGesture ?? undefined}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>
              {isEditMode ? t(editTitle) : t("Add a feeding")}
            </Text>

            <Text style={styles.subtitle}>
              {isEditMode
                ? t("Update child's feeding", {
                    childName,
                  })
                : t("Keep track of child meals", {
                    childName,
                  })}
            </Text>
          </View>

          <TrackingHistoryButton
            accessibilityLabel={t("View feeding history")}
            onPress={handleOpenHistory}
          />
        </View>

        {!isEditMode ? (
          <FeedingTypeTabs
            value={selectedType}
            visibleMethods={availableFeedingMethods}
            onChange={(feedingType) => {
              setSelectedType(feedingType);
              resetEntryForType(feedingType);
            }}
          />
        ) : null}

        <View style={[styles.formArea, isEditMode && styles.formAreaEditing]}>
          {selectedType === "bottle" ? (
            renderForm()
          ) : (
            <BottomSheetScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {renderForm()}
            </BottomSheetScrollView>
          )}
        </View>

        <View style={styles.footerContainer}>
          {feedingSaveError ? (
            <Text
              accessibilityRole="alert"
              style={{
                color: colors.error,
                fontSize: 12,
                marginBottom: 10,
              }}
            >
              {feedingSaveError}
            </Text>
          ) : null}

          {isEditMode ? (
            <View style={styles.editFooterRow}>
              <View style={styles.footerButton}>
                <PrimaryButton
                  title={t("Delete")}
                  variant="destructive"
                  onPress={handleRequestDelete}
                  disabled={isSavingFeeding}
                />
              </View>

              <View style={styles.footerButton}>
                <PrimaryButton
                  title={t("Save changes")}
                  onPress={handleSaveFeeding}
                  loading={isSavingFeeding}
                  disabled={!canSaveFeeding || isSavingFeeding}
                />
              </View>
            </View>
          ) : (
            <PrimaryButton
              title={t("Save feeding")}
              onPress={handleSaveFeeding}
              loading={isSavingFeeding}
              disabled={!canSaveFeeding || isSavingFeeding}
            />
          )}
        </View>
      </View>

      <BottleCapacitySheet
        ref={bottleCapacitySheetRef}
        userId={userId}
        childId={childId}
        onSelect={(capacityMl) => {
          if (!Number.isFinite(capacityMl) || capacityMl <= 0) {
            return;
          }

          bottlePrefsRef.current = {
            ...bottlePrefsRef.current,
            capacityMl,
          };

          persistBottlePreference("bottleCapacityMl", capacityMl);

          setBottleEntry((current) => ({
            ...current,
            bottleCapacityMl: capacityMl,
          }));
        }}
      />

      <MilkTypeSheet
        ref={milkTypeSheetRef}
        onSelect={(milkType) => {
          bottlePrefsRef.current = { ...bottlePrefsRef.current, milkType };
          persistBottlePreference("milkType", milkType);

          setBottleEntry((current) => ({ ...current, milkType }));
        }}
      />

      <NoteSheet
        ref={noteSheetRef}
        onSave={(note) => {
          if (noteTarget === "bottle") {
            setBottleEntry((current) => ({
              ...current,
              note,
            }));

            return;
          }

          if (noteTarget === "breastfeeding") {
            setBreastfeedingEntry((current) => ({
              ...current,
              note,
            }));

            return;
          }

          if (noteTarget === "solids") {
            setSolidsEntry((current) => ({
              ...current,
              note,
            }));

            return;
          }

          if (noteTarget === "pumping") {
            setPumpingEntry((current) => ({
              ...current,
              note,
            }));
          }
        }}
      />

      <ManualBreastfeedingSheet
        ref={manualBreastfeedingSheetRef}
        onSave={(manualEntry) => {
          setBreastfeedingEntry((current) => ({
            ...current,
            ...manualEntry,
          }));
        }}
      />

      <ExactAmountSheet
        ref={exactAmountSheetRef}
        onSave={(exactAmount) => {
          setBottleEntry((current) => ({
            ...current,

            isExactAmountMode: true,
            portionId: null,
            exactAmount,
          }));
        }}
      />

      <AddFoodSheet
        ref={addFoodSheetRef}
        customFoods={customFoods}
        onSaveCustomFood={handleSaveCustomFood}
        onDeleteCustomFood={handleDeleteCustomFood}
        onAddFood={handleAddFood}
      />
    </BottomSheetModal>
  );
});

export default FeedingEntrySheet;

function createStyles(colors) {
  return StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,
      borderRadius: 32,
    },

    handle: {
      width: 38,
      height: 4,

      borderRadius: 999,

      backgroundColor: colors.border,
    },

    content: {
      flex: 1,
    },

    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",

      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 18,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 21,

      color: colors.textPrimary,
    },

    subtitle: {
      marginTop: 5,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,

      color: colors.textSecondary,
    },

    formArea: {
      flex: 1,
      minHeight: 0,
    },

    formAreaEditing: {
      paddingTop: 8,
    },

    formScroll: {
      flex: 1,
    },

    formScrollContent: {
      flexGrow: 1,

      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 20,
    },

    footerContainer: {
      flexShrink: 0,

      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 14,

      borderTopWidth: 1,
      borderTopColor: colors.border,

      backgroundColor: colors.white,
    },

    editFooterRow: {
      width: "100%",

      flexDirection: "row",
      alignItems: "center",

      gap: 10,
    },

    footerButton: {
      flex: 1,
      minWidth: 0,
    },

    headerContent: {
      flex: 1,
      paddingRight: 12,
    },
  });
}
