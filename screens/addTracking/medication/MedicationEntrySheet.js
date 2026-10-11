import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, AppState, StyleSheet, Text, View } from "react-native";
import * as Network from "expo-network";
import { useSelector } from "react-redux";

import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import NoteSheet from "../Feeding/NoteSheet.js";
import MedicationPickerSheet from "./MedicationPickerSheet.js";
import VaccinePickerSheet from "./VaccinePickerSheet.js";

import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import MedicationTypeTabs from "../../../components/addTracking/medication/MedicationTypeTabs.js";
import MedicationForm from "../../../components/addTracking/medication/MedicationForm.js";
import VaccineForm from "../../../components/addTracking/medication/VaccineForm.js";
import TrackingHistoryButton from "../../../components/addTracking/TrackingHistoryButton.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";
import VaccineDetailsSheet from "./VaccineDetailsSheet.js";

import { useAuth } from "../../../auth/AuthProvider.js";
import { processSyncQueue } from "../../../sync/processSyncQueue.js";

import { MEDICATIONS } from "../../../data/medications.js";
import { VACCINES } from "../../../data/vaccines.js";

import {
  getCustomMedications,
  getCustomVaccines,
  getVaccinationReminders,
} from "../../../api/tracking/medication/medicationApi.js";

import {
  getLocalCustomProducts,
  createLocalCustomProduct,
  updateLocalCustomProduct,
  archiveLocalCustomProduct,
  saveServerCustomProductsLocally,
} from "../../../database/tracking/medication/customProductsRepository.js";

import {
  createLocalMedicationEntry,
  updateLocalMedicationEntry,
  createLocalVaccineEntry,
  updateLocalVaccineEntry,
  getLocalMedicationEntries,
} from "../../../database/tracking/medication/medicationRepository.js";

import {
  getLocalVaccinationReminders,
  saveServerVaccinationRemindersLocally,
  nextDoseDateToLocalDate,
} from "../../../database/tracking/medication/vaccinationReminderRepository.js";

const createMedicationEntry = () => ({
  medicationId: null,
  medicationName: "",
  medicationTranslationKey: null,
  medicationCategory: null,
  isCustomMedication: false,
  amount: "",
  unit: "ml",
  note: "",
  medicationDate: new Date(),
  isDateEdited: false,
});

const createVaccineEntry = () => ({
  vaccineId: null,
  vaccineName: "",
  vaccineTranslationKey: null,
  vaccineCategory: null,
  isCustomVaccine: false,

  dose: null,
  vaccineDate: new Date(),
  isDateEdited: false,

  hasNextDose: false,
  nextDoseDate: null,

  note: "",
  photos: [],
});

function getTrackingEntryData(entry) {
  return entry?.data ?? entry ?? {};
}

function getTrackingEntryDate(entry, preferredDateKey) {
  const entryData = getTrackingEntryData(entry);

  const dateValue =
    entryData?.[preferredDateKey] ??
    entry?.[preferredDateKey] ??
    entry?.occurredAt ??
    entry?.startedAt ??
    entry?.date;

  const parsedDate = dateValue ? new Date(dateValue) : null;

  const hasRecordedDate =
    parsedDate !== null && !Number.isNaN(parsedDate.getTime());

  return {
    date: hasRecordedDate ? parsedDate : new Date(),
    hasRecordedDate,
  };
}

function createMedicationEntryFromTrackingEntry(entry) {
  const entryData = getTrackingEntryData(entry);

  const { date, hasRecordedDate } = getTrackingEntryDate(
    entry,
    "medicationDate",
  );

  return {
    medicationId: entryData.medicationId ?? null,
    medicationName: entryData.medicationName ?? "",
    medicationTranslationKey: entryData.medicationTranslationKey ?? null,
    medicationCategory: entryData.medicationCategory ?? null,
    isCustomMedication: entryData.isCustomMedication ?? false,

    amount: String(entryData.amount ?? entryData.dose ?? ""),
    unit: entryData.unit ?? entryData.doseUnit ?? "ml",

    note: entryData.note ?? "",

    medicationDate: date,
    isDateEdited: hasRecordedDate,
  };
}

function createVaccineEntryFromTrackingEntry(entry) {
  const entryData = getTrackingEntryData(entry);

  const { date, hasRecordedDate } = getTrackingEntryDate(entry, "vaccineDate");

  const nextDoseValue = entryData.nextDoseDate ?? entryData.nextDoseAt ?? null;

  let parsedNextDoseDate = null;

  if (nextDoseValue != null) {
    try {
      parsedNextDoseDate = nextDoseDateToLocalDate(nextDoseValue);
    } catch {
      parsedNextDoseDate = null;
    }
  }

  const hasValidNextDoseDate =
    parsedNextDoseDate instanceof Date &&
    Number.isFinite(parsedNextDoseDate.getTime());

  return {
    vaccineId: entryData.vaccineId ?? null,
    vaccineName: entryData.vaccineName ?? "",
    vaccineTranslationKey: entryData.vaccineTranslationKey ?? null,
    vaccineCategory: entryData.vaccineCategory ?? null,
    isCustomVaccine: entryData.isCustomVaccine ?? false,

    dose: entryData.dose ?? entryData.doseNumber ?? null,

    vaccineDate: date,
    isDateEdited: hasRecordedDate,

    hasNextDose: hasValidNextDoseDate,
    nextDoseDate: hasValidNextDoseDate ? parsedNextDoseDate : null,

    note: entryData.note ?? "",
    photos: Array.isArray(entryData.photos) ? entryData.photos : [],
  };
}

const MedicationEntrySheet = forwardRef(function MedicationEntrySheet(
  {
    childName,
    childId,
    userId,
    onSaveMedication,
    onSaveVaccine,
    onRequestDelete,
    onPressHistory,
  },
  ref,
) {
  const { t } = useTranslation();

  const { user, accessToken, refreshSession } = useAuth();

  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  // Permet d'ignorer la fin d'une sauvegarde si l'enfant
  // ou le compte affiché a changé entre-temps.
  const scope = JSON.stringify([userId ?? null, childId ?? null]);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  const [recentEntries, setRecentEntries] = useState({
    scope: null,
    medications: [],
    vaccines: [],
  });

  const recentReadRef = useRef(0);

  const loadRecentEntries = useCallback(async () => {
    const requestedScope = scope;
    const readId = ++recentReadRef.current;

    if (!userId || !childId || user?.id !== userId) {
      setRecentEntries({
        scope: requestedScope,
        medications: [],
        vaccines: [],
      });
      return;
    }

    const medications = await getLocalMedicationEntries({
      userId,
      childId,
      type: "medication",
      limit: 100,
    });

    const vaccines = await getLocalMedicationEntries({
      userId,
      childId,
      type: "vaccine",
      limit: 100,
    });

    if (
      scopeRef.current !== requestedScope ||
      recentReadRef.current !== readId
    ) {
      return;
    }

    setRecentEntries({
      scope: requestedScope,
      medications,
      vaccines,
    });
  }, [userId, childId, user?.id, scope]);

  useEffect(() => {
    void loadRecentEntries().catch((error) => {
      console.warn("Unable to load recent medication entries:", error);
    });

    return () => {
      recentReadRef.current += 1;
    };
  }, [loadRecentEntries]);

  const synchronizeMedication = useCallback(() => {
    if (
      !userId ||
      user?.id !== userId ||
      !accessToken ||
      typeof refreshSession !== "function"
    ) {
      return;
    }

    void processSyncQueue({
      userId,
      accessToken,
      refreshSession,
    }).catch((error) => {
      console.warn("Unable to synchronize medication:", error);
    });
  }, [userId, user?.id, accessToken, refreshSession]);

  const modalRef = useRef(null);
  const medicationPickerRef = useRef(null);
  const isPresentedRef = useRef(false);

  useEffect(() => {
    setMedicationEntry(createMedicationEntry());
    setVaccineEntry(createVaccineEntry());
    setEditingEntry(null);
    setSheetMode("create");

    if (isPresentedRef.current) {
      modalRef.current?.dismiss();
    }
  }, [scope]);

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const snapPoints = useMemo(() => ["92%"], []);

  const [selectedType, setSelectedType] = useState("medication");
  const [sheetMode, setSheetMode] = useState("create");
  const [editingEntry, setEditingEntry] = useState(null);

  const isEditMode = sheetMode === "edit";
  const [medicationEntry, setMedicationEntry] = useState(createMedicationEntry);
  const [vaccineEntry, setVaccineEntry] = useState(createVaccineEntry);
  const vaccineDetailsSheetRef = useRef(null);
  const vaccinePickerRef = useRef(null);
  const noteSheetRef = useRef(null);

  const volumeUnit = useSelector(
    (state) => state.measurementUnits.volume ?? "ml",
  );

  const [remindersState, setRemindersState] = useState({
    scope: null,
    items: [],
  });

  const remindersReadRef = useRef(0);
  const remindersRefreshRef = useRef(null);

  const vaccinationReminders =
    remindersState.scope === scope && user?.id === userId
      ? remindersState.items
      : [];

  const loadLocalReminders = useCallback(async () => {
    const requestedScope = scope;
    const readId = ++remindersReadRef.current;

    if (!userId || !childId || user?.id !== userId) {
      setRemindersState({
        scope: requestedScope,
        items: [],
      });
      return;
    }

    const reminders = await getLocalVaccinationReminders({
      userId,
      childId,
    });

    if (
      scopeRef.current !== requestedScope ||
      remindersReadRef.current !== readId
    ) {
      return;
    }

    setRemindersState({
      scope: requestedScope,
      items: reminders,
    });
  }, [userId, childId, user?.id, scope]);

  const refreshVaccinationReminders = useCallback(async () => {
    if (
      !userId ||
      !childId ||
      user?.id !== userId ||
      !accessToken ||
      typeof refreshSession !== "function"
    ) {
      return;
    }

    const requestedScope = scope;

    // Évite plusieurs lectures serveur simultanées pour le même enfant.
    if (remindersRefreshRef.current?.scope === requestedScope) {
      return;
    }

    const request = { scope: requestedScope };
    remindersRefreshRef.current = request;

    try {
      const network = await Network.getNetworkStateAsync();

      if (
        !network.isConnected ||
        network.isInternetReachable === false ||
        scopeRef.current !== requestedScope
      ) {
        return;
      }

      const response = await getVaccinationReminders({
        childId,
        accessToken,
        refreshSession,
      });

      if (scopeRef.current !== requestedScope) {
        return;
      }

      await saveServerVaccinationRemindersLocally({
        userId,
        childId,
        reminders: response.reminders,
      });

      if (scopeRef.current === requestedScope) {
        await loadLocalReminders();
      }
    } catch (error) {
      // Les rappels disponibles hors ligne restent affichés.
      console.warn("Unable to refresh vaccination reminders:", error);
    } finally {
      if (remindersRefreshRef.current === request) {
        remindersRefreshRef.current = null;
      }
    }
  }, [
    userId,
    childId,
    user?.id,
    accessToken,
    refreshSession,
    scope,
    loadLocalReminders,
  ]);

  useEffect(() => {
    void loadLocalReminders().catch((error) => {
      console.warn("Unable to load local vaccination reminders:", error);
    });

    return () => {
      remindersReadRef.current += 1;
    };
  }, [loadLocalReminders]);

  useImperativeHandle(ref, () => ({
    present(options = {}) {
      if (savingRef.current) {
        return;
      }

      void loadLocalReminders().catch((error) => {
        console.warn("Unable to load local vaccination reminders:", error);
      });

      void refreshVaccinationReminders();

      void loadRecentEntries().catch((error) => {
        console.warn("Unable to refresh recent medication entries:", error);
      });

      void loadLocalCustomProducts().catch((error) => {
        console.warn("Unable to refresh local custom products:", error);
      });

      if (typeof options === "string") {
        const type = options === "vaccine" ? "vaccine" : "medication";

        setSheetMode("create");
        setEditingEntry(null);
        setSelectedType(type);

        if (type === "vaccine") {
          setVaccineEntry(createVaccineEntry());
        } else {
          setMedicationEntry(createMedicationEntry());
        }

        if (modalRef.current) {
          isPresentedRef.current = true;
          modalRef.current.present();
        }
        return;
      }

      const {
        mode = "create",
        medicationType = "medication",
        entry = null,
      } = options;

      const type = medicationType === "vaccine" ? "vaccine" : "medication";

      setSheetMode(mode);
      setSelectedType(type);

      if (mode === "edit" && entry) {
        setEditingEntry(entry);

        if (type === "vaccine") {
          setVaccineEntry(createVaccineEntryFromTrackingEntry(entry));
        } else {
          setMedicationEntry(createMedicationEntryFromTrackingEntry(entry));
        }
      } else {
        setEditingEntry(null);

        if (type === "vaccine") {
          setVaccineEntry(createVaccineEntry());
        } else {
          setMedicationEntry(createMedicationEntry());
        }
      }

      if (modalRef.current) {
        isPresentedRef.current = true;
        modalRef.current.present();
      }
    },

    dismiss() {
      if (savingRef.current || !isPresentedRef.current) {
        return;
      }

      modalRef.current?.dismiss();
    },
  }));

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={isSaving ? "none" : "close"}
        opacity={0.42}
      />
    ),
    [isSaving],
  );

  const medicationAmount = Number(
    String(medicationEntry.amount).replace(",", "."),
  );

  const canSaveMedication =
    Boolean(medicationEntry.medicationId) &&
    medicationEntry.medicationName.trim().length > 0 &&
    Number.isFinite(medicationAmount) &&
    medicationAmount > 0;

  const hasValidNextDoseDate =
    vaccineEntry.nextDoseDate instanceof Date &&
    Number.isFinite(vaccineEntry.nextDoseDate.getTime());

  const canSaveVaccine =
    Boolean(vaccineEntry.vaccineId) &&
    vaccineEntry.vaccineName.trim().length > 0 &&
    (!vaccineEntry.hasNextDose || hasValidNextDoseDate);

  const canSave =
    Boolean(userId && childId) &&
    user?.id === userId &&
    !isSaving &&
    (selectedType === "medication" ? canSaveMedication : canSaveVaccine);

  const handleRequestDelete = () => {
    if (!isEditMode || !editingEntry) {
      return;
    }

    onRequestDelete?.(editingEntry);
  };

  const handleOpenHistory = () => {
    if (savingRef.current) {
      return;
    }

    modalRef.current?.dismiss();

    setTimeout(() => {
      onPressHistory?.(selectedType);
    }, 220);
  };

  const handleSave = async () => {
    if (savingRef.current || !canSave) {
      return;
    }

    if (!userId || !childId || user?.id !== userId) {
      Alert.alert(t("Unable to save"), t("Missing user ID or child ID."));
      return;
    }

    const originalEntry = getTrackingEntryData(editingEntry);
    const entryId = editingEntry?.id ?? originalEntry.id;

    if (isEditMode && !entryId) {
      Alert.alert(
        t("Unable to save"),
        t("The entry could not be identified. Reopen it and try again."),
      );
      return;
    }

    const saveScope = scope;
    const savedType = selectedType;
    const savedMode = isEditMode ? "edit" : "create";

    savingRef.current = true;
    setIsSaving(true);

    let savedEntry;

    try {
      if (savedType === "medication") {
        const data = {
          ...medicationEntry,
          amount: medicationAmount,
          unit: medicationEntry.unit,
          isCustomMedication: medicationEntry.isCustomMedication === true,
          medicationDate:
            isEditMode || medicationEntry.isDateEdited
              ? medicationEntry.medicationDate
              : new Date(),
        };

        savedEntry =
          savedMode === "edit"
            ? await updateLocalMedicationEntry({
                userId,
                childId,
                entryId,
                data,
              })
            : await createLocalMedicationEntry({
                userId,
                childId,
                data,
              });
      } else {
        const data = {
          ...vaccineEntry,
          isCustomVaccine: vaccineEntry.isCustomVaccine === true,
          vaccineDate:
            isEditMode || vaccineEntry.isDateEdited
              ? vaccineEntry.vaccineDate
              : new Date(),
          nextDoseDate: vaccineEntry.hasNextDose
            ? vaccineEntry.nextDoseDate
            : null,
        };

        savedEntry =
          savedMode === "edit"
            ? await updateLocalVaccineEntry({
                userId,
                childId,
                entryId,
                data,
              })
            : await createLocalVaccineEntry({
                userId,
                childId,
                data,
              });
      }
    } catch (error) {
      console.error("Unable to save medication locally:", error);

      if (scopeRef.current === saveScope) {
        const message = [
          "MEDICATION_SYNC_PENDING",
          "VACCINE_SYNC_PENDING",
        ].includes(error?.code)
          ? "Wait for this entry to finish syncing before editing it."
          : error?.code === "VACCINATION_REMINDER_COMPLETED"
            ? "A completed reminder cannot be changed from this entry."
            : error?.code === "TRACKING_VERSION_CONFLICT"
              ? "This entry changed. Reopen it before saving."
              : "The entry could not be saved on this device. Check the information and try again.";

        Alert.alert(t("Unable to save"), t(message));
      }

      savingRef.current = false;
      setIsSaving(false);
      return;
    }

    try {
      if (scopeRef.current !== saveScope) {
        return;
      }

      synchronizeMedication();

      if (savedType === "vaccine") {
        void loadLocalReminders().catch((error) => {
          console.warn("Unable to reload local vaccination reminders:", error);
        });
      }

      void loadRecentEntries().catch((error) => {
        console.warn("Unable to refresh recent medication entries:", error);
      });

      if (savedType === "medication") {
        setMedicationEntry(createMedicationEntry());
      } else {
        setVaccineEntry(createVaccineEntry());
      }

      modalRef.current?.dismiss();

      const onSaved =
        savedType === "medication" ? onSaveMedication : onSaveVaccine;

      await onSaved?.({
        ...savedEntry,
        mode: savedMode,
        persistedLocally: true,
      });
    } catch (error) {
      console.warn("The entry was saved, but its confirmation failed:", error);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const [customMedications, setCustomMedications] = useState([]);
  const [customVaccines, setCustomVaccines] = useState([]);

  const recentMedications = useMemo(() => {
    if (recentEntries.scope !== scope || user?.id !== userId) {
      return [];
    }

    const seen = new Set();
    const products = [];

    for (const entry of recentEntries.medications) {
      const isCustom = entry.isCustomMedication === true;
      const productId = entry.medicationId;
      const key = `${isCustom ? "custom" : "catalog"}:${productId}`;

      if (!productId || seen.has(key)) {
        continue;
      }

      seen.add(key);

      const product = isCustom
        ? customMedications.find(
            (item) =>
              item.id === productId &&
              !item.archivedAt &&
              !item.deletedAt &&
              item.isDeleted !== true,
          )
        : MEDICATIONS.find((item) => item.id === productId);

      // Un produit archivé ou retiré du catalogue n'est plus proposé.
      if (!product) {
        continue;
      }

      const name =
        !isCustom && product.translationKey
          ? t(product.translationKey)
          : product.name;

      products.push({
        ...product,
        id: productId,
        medicationId: productId,
        name,
        medicationName: name,
        translationKey: isCustom ? null : (product.translationKey ?? null),
        category: isCustom ? null : (product.category ?? null),
        isCustom,
        isCustomMedication: isCustom,
      });

      if (products.length === 6) {
        break;
      }
    }

    return products;
  }, [recentEntries, scope, user?.id, userId, customMedications, t]);

  const recentVaccines = useMemo(() => {
    if (recentEntries.scope !== scope || user?.id !== userId) {
      return [];
    }

    const seen = new Set();
    const products = [];

    for (const entry of recentEntries.vaccines) {
      const isCustom = entry.isCustomVaccine === true;
      const productId = entry.vaccineId;
      const key = `${isCustom ? "custom" : "catalog"}:${productId}`;

      if (!productId || seen.has(key)) {
        continue;
      }

      seen.add(key);

      const product = isCustom
        ? customVaccines.find(
            (item) =>
              item.id === productId &&
              !item.archivedAt &&
              !item.deletedAt &&
              item.isDeleted !== true,
          )
        : VACCINES.find((item) => item.id === productId);

      if (!product) {
        continue;
      }

      const name =
        !isCustom && product.translationKey
          ? t(product.translationKey)
          : product.name;

      products.push({
        ...product,
        id: productId,
        vaccineId: productId,
        name,
        vaccineName: name,
        translationKey: isCustom ? null : (product.translationKey ?? null),
        category: isCustom ? null : (product.category ?? null),
        isCustom,
        isCustomVaccine: isCustom,
      });

      if (products.length === 6) {
        break;
      }
    }

    return products;
  }, [recentEntries, scope, user?.id, userId, customVaccines, t]);

  const productsReadRef = useRef(0);

  const loadLocalCustomProducts = useCallback(async () => {
    const readId = ++productsReadRef.current;
    const requestedScope = scope;

    if (!userId || !childId || user?.id !== userId) {
      setCustomMedications([]);
      setCustomVaccines([]);
      return;
    }

    const medications = await getLocalCustomProducts({
      userId,
      childId,
      type: "medication",
    });

    const vaccines = await getLocalCustomProducts({
      userId,
      childId,
      type: "vaccine",
    });

    if (
      scopeRef.current !== requestedScope ||
      productsReadRef.current !== readId
    ) {
      return;
    }

    setCustomMedications(medications);
    setCustomVaccines(vaccines);
  }, [userId, childId, user?.id, scope]);

  useEffect(() => {
    setCustomMedications([]);
    setCustomVaccines([]);

    void loadLocalCustomProducts().catch((error) => {
      console.warn("Unable to load local custom products:", error);
    });

    return () => {
      productsReadRef.current += 1;
    };
  }, [loadLocalCustomProducts]);

  // Les lectures serveur complètent le cache local.
  // Un échec réseau ne supprime pas les produits déjà disponibles.
  useEffect(() => {
    if (
      !userId ||
      !childId ||
      user?.id !== userId ||
      !accessToken ||
      typeof refreshSession !== "function"
    ) {
      return undefined;
    }

    let cancelled = false;

    const refreshProducts = async () => {
      const sources = [
        {
          type: "medication",
          fetchProducts: getCustomMedications,
        },
        {
          type: "vaccine",
          fetchProducts: getCustomVaccines,
        },
      ];

      for (const { type, fetchProducts } of sources) {
        if (cancelled) {
          return;
        }

        try {
          const response = await fetchProducts({
            childId,
            accessToken,
            refreshSession,
          });

          if (cancelled) {
            return;
          }

          await saveServerCustomProductsLocally({
            userId,
            childId,
            type,
            products: response.products,
          });

          if (!cancelled) {
            await loadLocalCustomProducts();
          }
        } catch (error) {
          console.warn(`Unable to refresh custom ${type} products:`, error);
        }
      }
    };

    void refreshProducts();

    return () => {
      cancelled = true;
    };
  }, [
    userId,
    childId,
    user?.id,
    accessToken,
    refreshSession,
    loadLocalCustomProducts,
  ]);

  const saveCustomProduct = async (type, product) => {
    if (!userId || !childId || user?.id !== userId) {
      throw new Error("Missing user ID or child ID.");
    }

    const operationScope = scope;

    const data = {
      name: product.name,
      ...(type === "medication"
        ? { defaultDoseUnit: product.defaultDoseUnit ?? null }
        : {}),
    };

    const savedProduct = product.id
      ? await updateLocalCustomProduct({
          userId,
          childId,
          type,
          productId: product.id,
          data,
        })
      : await createLocalCustomProduct({
          userId,
          childId,
          type,
          data,
        });

    if (scopeRef.current === operationScope) {
      // Une lecture commencée avant cette sauvegarde ne doit
      // pas écraser la nouvelle version affichée.
      productsReadRef.current += 1;

      const setProducts =
        type === "medication" ? setCustomMedications : setCustomVaccines;

      setProducts((current) => [
        savedProduct,
        ...current.filter((item) => item.id !== savedProduct.id),
      ]);

      synchronizeMedication();
    }

    return savedProduct;
  };

  const archiveCustomProduct = async (type, product) => {
    if (!userId || !childId || user?.id !== userId) {
      throw new Error("Missing user ID or child ID.");
    }

    const operationScope = scope;

    const archivedProduct = await archiveLocalCustomProduct({
      userId,
      childId,
      type,
      productId: product.id,
    });

    if (scopeRef.current === operationScope) {
      productsReadRef.current += 1;

      const setProducts =
        type === "medication" ? setCustomMedications : setCustomVaccines;

      setProducts((current) =>
        current.filter((item) => item.id !== archivedProduct.id),
      );

      // Retirer la sélection du formulaire courant.
      // Les anciennes prises enregistrées restent intactes.
      if (type === "medication") {
        setMedicationEntry((current) =>
          current.isCustomMedication &&
          current.medicationId === archivedProduct.id
            ? {
                ...current,
                medicationId: null,
                medicationName: "",
                medicationTranslationKey: null,
                medicationCategory: null,
                isCustomMedication: false,
              }
            : current,
        );
      } else {
        setVaccineEntry((current) =>
          current.isCustomVaccine && current.vaccineId === archivedProduct.id
            ? {
                ...current,
                vaccineId: null,
                vaccineName: "",
                vaccineTranslationKey: null,
                vaccineCategory: null,
                isCustomVaccine: false,
              }
            : current,
        );
      }

      synchronizeMedication();
    }

    return archivedProduct;
  };

  const handleSaveCustomMedication = (medication) =>
    saveCustomProduct("medication", medication);

  const handleSaveCustomVaccine = (vaccine) =>
    saveCustomProduct("vaccine", vaccine);

  const handleDeleteCustomMedication = (medication) =>
    archiveCustomProduct("medication", medication);

  const handleDeleteCustomVaccine = (vaccine) =>
    archiveCustomProduct("vaccine", vaccine);

  return (
    <>
      <BottomSheetModal
        ref={modalRef}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose={!isSaving}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>
                {isEditMode
                  ? selectedType === "medication"
                    ? t("Edit medication")
                    : t("Edit vaccine")
                  : selectedType === "medication"
                    ? t("Add medication")
                    : t("Add a vaccine")}
              </Text>
              <Text style={styles.subtitle}>
                {isEditMode
                  ? selectedType === "medication"
                    ? t("Update child's medication", {
                        childName,
                      })
                    : t("Update child's vaccine", {
                        childName,
                      })
                  : selectedType === "medication"
                    ? t("Record medication given to child", {
                        childName,
                      })
                    : t("Keep child vaccination history up to date", {
                        childName,
                      })}
              </Text>
            </View>

            <TrackingHistoryButton
              accessibilityLabel={
                selectedType === "medication"
                  ? t("View medication history")
                  : t("View vaccine history")
              }
              onPress={handleOpenHistory}
            />
          </View>

          {!isEditMode ? (
            <MedicationTypeTabs
              value={selectedType}
              onChange={(type) => {
                if (savingRef.current) {
                  return;
                }

                setSelectedType(type);

                if (type === "vaccine") {
                  setVaccineEntry(createVaccineEntry());
                } else {
                  setMedicationEntry(createMedicationEntry());
                }
              }}
            />
          ) : null}

          <View
            style={styles.formArea}
            pointerEvents={isSaving ? "none" : "auto"}
          >
            <BottomSheetScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              nestedScrollEnabled
            >
              {selectedType === "medication" ? (
                <MedicationForm
                  volumeUnit={volumeUnit}
                  value={medicationEntry}
                  onChange={setMedicationEntry}
                  recentMedications={recentMedications}
                  onPressMedication={() => {
                    medicationPickerRef.current?.present();
                  }}
                  onPressNote={() => {
                    noteSheetRef.current?.present(medicationEntry.note);
                  }}
                />
              ) : (
                <VaccineForm
                  value={vaccineEntry}
                  onChange={setVaccineEntry}
                  vaccinationReminders={vaccinationReminders}
                  onPressVaccine={() => {
                    vaccinePickerRef.current?.present();
                  }}
                  onPressDetails={() => {
                    vaccineDetailsSheetRef.current?.present({
                      note: vaccineEntry.note,
                      photos: vaccineEntry.photos,
                    });
                  }}
                />
              )}
            </BottomSheetScrollView>
          </View>

          <View style={styles.footerContainer}>
            {isEditMode ? (
              <View style={styles.editFooterRow}>
                <View style={styles.footerButton}>
                  <PrimaryButton
                    title={t("Delete")}
                    variant="destructive"
                    onPress={handleRequestDelete}
                  />
                </View>

                <View style={styles.footerButton}>
                  <PrimaryButton
                    title={t("Save changes")}
                    onPress={handleSave}
                    disabled={!canSave || isSaving}
                    loading={isSaving}
                  />
                </View>
              </View>
            ) : (
              <PrimaryButton
                title={
                  selectedType === "medication"
                    ? t("Save medication")
                    : t("Save vaccine")
                }
                onPress={handleSave}
                disabled={!canSave}
              />
            )}
          </View>
        </View>
      </BottomSheetModal>
      <NoteSheet
        ref={noteSheetRef}
        title="Medication note"
        description="Add an optional detail about this medication"
        placeholder="For example, how it was taken or any reaction observed"
        onSave={(note) => {
          setMedicationEntry((current) => ({
            ...current,
            note,
          }));
        }}
      />

      <VaccineDetailsSheet
        ref={vaccineDetailsSheetRef}
        onSave={({ note, photos }) => {
          setVaccineEntry((current) => ({
            ...current,
            note,
            photos,
          }));
        }}
      />

      <MedicationPickerSheet
        key={`medication-picker:${scope}`}
        ref={medicationPickerRef}
        recentMedications={recentMedications}
        customMedications={customMedications}
        onSaveCustomMedication={handleSaveCustomMedication}
        onDeleteCustomMedication={handleDeleteCustomMedication}
        onSelectMedication={(medication) => {
          setMedicationEntry((current) => ({
            ...current,
            medicationId: medication.id,
            medicationName: medication.name,
            medicationTranslationKey: medication.translationKey,
            medicationCategory: medication.category,
            isCustomMedication: medication.isCustom,
          }));
        }}
      />

      <VaccinePickerSheet
        key={`vaccine-picker:${scope}`}
        ref={vaccinePickerRef}
        recentVaccines={recentVaccines}
        customVaccines={customVaccines}
        onSaveCustomVaccine={handleSaveCustomVaccine}
        onDeleteCustomVaccine={handleDeleteCustomVaccine}
        onSelectVaccine={(vaccine) => {
          setVaccineEntry((current) => ({
            ...current,
            vaccineId: vaccine.id,
            vaccineName: vaccine.name,
            vaccineTranslationKey: vaccine.translationKey,
            vaccineCategory: vaccine.category,
            isCustomVaccine: vaccine.isCustom,
          }));
        }}
      />
    </>
  );
});

export default MedicationEntrySheet;

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
      minHeight: 0,
    },

    header: {
      flexShrink: 0,
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 18,
    },

    headerContent: {
      flex: 1,
      paddingRight: 12,
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
      overflow: "hidden",
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
  });
}
