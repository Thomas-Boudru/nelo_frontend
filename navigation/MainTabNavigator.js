import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import {
  BottomTabBar,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import HomeScreen from "../screens/home/HomeScreen.js";
import TrackingScreen from "../screens/tracking/TrackingScreen.js";
import MomentsScreen from "../screens/moments/MomentsScreen.js";
import ChildProfileScreen from "../screens/child/ChildProfileScreen.js";
import FeedingEntrySheet from "../screens/addTracking/Feeding/FeedingEntrySheet.js";
import SleepEntrySheet from "../screens/addTracking/Sleep/SleepEntrySheet.js";
import DiaperEntrySheet from "../screens/addTracking/Diaper/DiaperEntrySheet.js";
import MoodEntrySheet from "../screens/addTracking/Mood/MoodEntrySheet.js";
import MedicationEntrySheet from "../screens/addTracking/Medication/MedicationEntrySheet.js";
import TemperatureEntrySheet from "../screens/addTracking/Temperature/TemperatureEntrySheet.js";
import SymptomsEntrySheet from "../screens/addTracking/Symptoms/SymptomsEntrySheet.js";
import TeethingEntrySheet from "../screens/addTracking/Teething/TeethingEntrySheet.js";
import GrowthEntrySheet from "../screens/addTracking/Measurement/GrowthEntrySheet.js";
import NoteEntrySheet from "../screens/addTracking/Note/NoteEntrySheet.js";
import ConfirmActionSheet from "../screens/ConfirmActionSheet.js";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TrackingTypeHistoryScreen from "../screens/tracking/TrackingTypeHistoryScreen.js";
import TrackingStatsHistoryScreen from "../screens/tracking/TrackingStatsHistoryScreen.js";
import SleepHistoryScreen from "../screens/tracking/SleepHistoryScreen.js";
import GrowthHistoryScreen from "../screens/tracking/GrowthHistoryScreen.js";

import ToastMessage from "../components/ui/toast/ToastMessage.js";

import AddTrackingSheet from "../screens/addTracking/AddTrackingSheet.js";

import { useThemeColors } from "../theme/useThemeColors.js";

const homeActive = require("../assets/icons/tabBar/homeActive.png");
const homeInactive = require("../assets/icons/tabBar/homeInactive.png");

const trackingActive = require("../assets/icons/tabBar/trackingActive.png");
const trackingInactive = require("../assets/icons/tabBar/trackingInactive.png");

const momentsActive = require("../assets/icons/tabBar/momentsActive.png");
const momentsInactive = require("../assets/icons/tabBar/momentsInactive.png");

const babyActive = require("../assets/icons/tabBar/babyActive.png");
const babyInactive = require("../assets/icons/tabBar/babyInactive.png");

import BabyActiveIcon from "../assets/icons/tabBar/babySvgActive.svg";
import BabyInactiveIcon from "../assets/icons/tabBar/babySvgInactive.svg";

const Tab = createBottomTabNavigator();
const TrackingStack = createNativeStackNavigator();

function AddButton({ onPress, accessibilityState, colors, styles }) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("Add an activity")}
      accessibilityState={accessibilityState}
      onPress={onPress}
      style={({ pressed }) => [
        styles.addButtonWrapper,
        pressed && styles.addButtonPressed,
      ]}
    >
      <View style={styles.addButton}>
        <Ionicons name="add" size={36} color={colors.white} />
      </View>
    </Pressable>
  );
}

function FloatingTabBar({ styles, ...props }) {
  return (
    <View pointerEvents="box-none" style={styles.tabBarOuterContainer}>
      <View style={styles.tabBarInnerContainer}>
        <BottomTabBar {...props} />
      </View>
    </View>
  );
}

function EmptyScreen({ styles }) {
  return <View style={styles.emptyScreen} />;
}

export default function MainTabNavigator() {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const addTrackingSheetRef = useRef(null);
  const feedingSheetRef = useRef(null);
  const sleepSheetRef = useRef(null);
  const diaperSheetRef = useRef(null);
  const moodSheetRef = useRef(null);
  const medicationSheetRef = useRef(null);
  const temperatureSheetRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const symptomsEntrySheetRef = useRef(null);
  const teethingSheetRef = useRef(null);
  const growthEntrySheetRef = useRef(null);
  const noteEntrySheetRef = useRef(null);
  const confirmationSheetRef = useRef(null);

  const [toast, setToast] = useState({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  // Plus tard, ces informations viendront du store Redux.
  const childName = "Emma";

  const EmptyScreenComponent = () => <EmptyScreen styles={styles} />;

  const handleOpenAddTracking = () => {
    addTrackingSheetRef.current?.present();
  };

  const handleCloseAddTracking = () => {
    addTrackingSheetRef.current?.dismiss();
  };

  const handlePressVoice = () => {
    console.log("Ouvrir la dictée Nelo");

    // Plus tard :
    // ouvrir l'écran ou le mode d'enregistrement vocal.
  };

  const hideToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }

    setToast((currentToast) => ({
      ...currentToast,
      visible: false,
    }));
  }, []);

  const showToast = useCallback(
    ({ type = "info", title, message, duration = 3500 }) => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }

      setToast({
        visible: true,
        type,
        title,
        message,
      });

      toastTimeoutRef.current = setTimeout(() => {
        setToast((currentToast) => ({
          ...currentToast,
          visible: false,
        }));

        toastTimeoutRef.current = null;
      }, duration);
    },
    [],
  );

  const handlePressTrackingItem = (itemId) => {
    console.log("Tracking sélectionné :", itemId);

    handleCloseAddTracking();

    if (itemId === "feeding") {
      setTimeout(() => {
        feedingSheetRef.current?.present({
          mode: "create",
          feedingType: "bottle",
        });
      }, 220);

      return;
    }

    if (itemId === "sleep") {
      setTimeout(() => {
        sleepSheetRef.current?.present();
      }, 220);

      return;
    }

    if (itemId === "diaper") {
      setTimeout(() => {
        diaperSheetRef.current?.present("diaper");
      }, 220);

      return;
    }

    if (itemId === "mood") {
      setTimeout(() => {
        moodSheetRef.current?.present();
      }, 220);

      return;
    }

    if (itemId === "medication") {
      setTimeout(() => {
        medicationSheetRef.current?.present("medication");
      }, 220);

      return;
    }

    if (itemId === "temperature") {
      setTimeout(() => {
        temperatureSheetRef.current?.present();
      }, 220);

      return;
    }

    if (itemId === "symptoms") {
      setTimeout(() => {
        symptomsEntrySheetRef.current?.present();
      }, 220);

      return;
    }

    if (itemId === "teething") {
      setTimeout(() => {
        teethingSheetRef.current?.present();
      }, 220);

      return;
    }
    if (itemId === "growth") {
      setTimeout(() => {
        growthEntrySheetRef.current?.present();
      }, 220);

      return;
    }

    if (itemId === "note") {
      setTimeout(() => {
        noteEntrySheetRef.current?.present();
      }, 220);

      return;
    }
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const handleEditTrackingEntry = useCallback((entry) => {
    if (!entry) {
      return;
    }

    const feedingTypes = ["bottle", "breastfeeding", "solids", "pumping"];

    if (feedingTypes.includes(entry.type)) {
      feedingSheetRef.current?.present({
        mode: "edit",
        feedingType: entry.type,
        entry,
      });

      return;
    }

    const diaperTypes = ["diaper", "potty"];

    if (diaperTypes.includes(entry.type)) {
      diaperSheetRef.current?.present({
        mode: "edit",
        diaperType: entry.type,
        entry,
      });

      return;
    }

    if (entry.type === "mood") {
      moodSheetRef.current?.present({
        mode: "edit",
        entry,
      });

      return;
    }

    if (
      entry.type === "sleep" ||
      entry.type === "nap" ||
      entry.type === "night"
    ) {
      sleepSheetRef.current?.presentManual({
        mode: "edit",
        entry,
      });

      return;
    }

    const medicationTypes = ["medication", "vaccine"];

    if (medicationTypes.includes(entry.type)) {
      medicationSheetRef.current?.present({
        mode: "edit",
        medicationType: entry.type,
        entry,
      });

      return;
    }

    if (entry.type === "temperature") {
      temperatureSheetRef.current?.present({
        mode: "edit",
        entry,
      });

      return;
    }

    if (entry.type === "symptoms") {
      symptomsEntrySheetRef.current?.present({
        mode: "edit",
        entry,
      });

      return;
    }

    if (entry.type === "teething") {
      teethingSheetRef.current?.present({
        mode: "edit",
        entry,
      });

      return;
    }

    if (entry.type === "growth") {
      growthEntrySheetRef.current?.present({
        mode: "edit",
        entry,
      });

      return;
    }

    if (entry.type === "note") {
      noteEntrySheetRef.current?.present({
        mode: "edit",
        entry,
      });

      return;
    }

    console.log(
      "L’édition de ce type n’est pas encore disponible :",
      entry.type,
    );
  }, []);

  const handleRequestDeleteTrackingEntry = useCallback(
    (entry) => {
      if (!entry?.id) {
        return;
      }

      confirmationSheetRef.current?.present({
        title: t("Delete this entry?"),

        description: t("This tracking entry will be permanently deleted."),

        confirmLabel: t("Delete entry"),
        cancelLabel: t("Cancel"),

        onConfirm: async () => {
          /*
           * Plus tard :
           * await deleteTrackingEntry(entry.id);
           */

          console.log("Entrée supprimée :", entry.id);

          const diaperTypes = ["diaper", "potty"];

          if (
            entry.type === "sleep" ||
            entry.type === "nap" ||
            entry.type === "night"
          ) {
            sleepSheetRef.current?.dismissManual();
          } else if (entry.type === "mood") {
            moodSheetRef.current?.dismiss();
          } else if (entry.type === "diaper" || entry.type === "potty") {
            diaperSheetRef.current?.dismiss();
          } else if (entry.type === "medication" || entry.type === "vaccine") {
            medicationSheetRef.current?.dismiss();
          } else if (entry.type === "temperature") {
            temperatureSheetRef.current?.dismiss();
          } else if (entry.type === "symptoms") {
            symptomsEntrySheetRef.current?.dismiss();
          } else if (entry.type === "teething") {
            teethingSheetRef.current?.dismiss();
          } else if (entry.type === "growth") {
            growthEntrySheetRef.current?.dismiss();
          } else if (entry.type === "note") {
            noteEntrySheetRef.current?.dismiss();
          } else {
            feedingSheetRef.current?.dismiss();
          }
          showToast({
            type: "success",
            title: t("Entry deleted"),
            message: t("The entry was deleted successfully."),
          });
        },
      });
    },
    [showToast, t],
  );

  return (
    <>
      <Tab.Navigator
        initialRouteName="Today"
        tabBar={(props) => <FloatingTabBar {...props} styles={styles} />}
        screenOptions={{
          headerShown: false,

          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,

          tabBarStyle: styles.tabBar,
          tabBarItemStyle: styles.tabBarItem,
          tabBarLabelStyle: styles.tabBarLabel,

          tabBarHideOnKeyboard: true,
        }}
      >
        <Tab.Screen
          name="Today"
          component={HomeScreen}
          options={{
            tabBarLabel: t("Today"),

            tabBarIcon: ({ focused }) => (
              <Image
                source={focused ? homeActive : homeInactive}
                style={styles.tabIcon}
              />
            ),
          }}
        />

        <Tab.Screen
          name="Tracking"
          options={{
            tabBarLabel: t("Tracking"),

            tabBarIcon: ({ focused }) => (
              <Image
                source={focused ? trackingActive : trackingInactive}
                style={styles.tabIcon}
              />
            ),
          }}
        >
          {() => (
            <TrackingStack.Navigator
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor: colors.background,
                },
              }}
            >
              <TrackingStack.Screen name="TrackingOverview">
                {(screenProps) => (
                  <TrackingScreen
                    {...screenProps}
                    onEditTrackingEntry={handleEditTrackingEntry}
                  />
                )}
              </TrackingStack.Screen>

              <TrackingStack.Screen name="TrackingTypeHistory">
                {(screenProps) => (
                  <TrackingTypeHistoryScreen
                    {...screenProps}
                    onEditTrackingEntry={handleEditTrackingEntry}
                  />
                )}
              </TrackingStack.Screen>

              <TrackingStack.Screen name="TrackingStatsHistory">
                {(screenProps) => (
                  <TrackingStatsHistoryScreen
                    {...screenProps}
                    onEditTrackingEntry={handleEditTrackingEntry}
                  />
                )}
              </TrackingStack.Screen>
              <TrackingStack.Screen name="SleepHistory">
                {(screenProps) => (
                  <SleepHistoryScreen
                    {...screenProps}
                    onEditTrackingEntry={handleEditTrackingEntry}
                  />
                )}
              </TrackingStack.Screen>

              <TrackingStack.Screen name="GrowthHistory">
                {(screenProps) => (
                  <GrowthHistoryScreen
                    {...screenProps}
                    onEditTrackingEntry={handleEditTrackingEntry}
                  />
                )}
              </TrackingStack.Screen>
            </TrackingStack.Navigator>
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Add"
          component={EmptyScreenComponent}
          options={{
            tabBarLabel: "",

            tabBarButton: (props) => (
              <AddButton {...props} colors={colors} styles={styles} />
            ),
          }}
          listeners={{
            tabPress: (event) => {
              event.preventDefault();
              handleOpenAddTracking();
            },
          }}
        />

        <Tab.Screen
          name="Moments"
          component={MomentsScreen}
          options={{
            tabBarLabel: t("Moments"),

            tabBarIcon: ({ focused }) => (
              <Image
                source={focused ? momentsActive : momentsInactive}
                style={styles.tabIcon}
              />
            ),
          }}
        />

        <Tab.Screen
          name="ChildProfile"
          component={ChildProfileScreen}
          options={{
            tabBarLabel: childName,

            tabBarAccessibilityLabel: t("Open child profile", {
              childName,
            }),

            tabBarIcon: ({ focused, color }) => {
              const BabyIcon = focused ? BabyActiveIcon : BabyInactiveIcon;

              return (
                <BabyIcon
                  width={styles.tabIcon.width}
                  height={styles.tabIcon.height}
                  color={color}
                />
              );
            },
          }}
        />
      </Tab.Navigator>

      <AddTrackingSheet
        ref={addTrackingSheetRef}
        childName={childName}
        isPremiumUser={false}
        onPressPremium={() => {
          console.log("Ouvrir la présentation Premium");
        }}
        onPressVoiceStart={() => {
          console.log("Début de la dictée");
        }}
        onPressVoiceEnd={() => {
          console.log("Fin de la dictée");
        }}
        onPressTrackingItem={handlePressTrackingItem}
      />

      <FeedingEntrySheet
        ref={feedingSheetRef}
        childName={childName}
        onRequestDelete={handleRequestDeleteTrackingEntry}
      />

      <SleepEntrySheet
        ref={sleepSheetRef}
        childName={childName}
        lastSleep={{
          type: "night",
          startedAt: "2026-08-08T20:42:00",
          endedAt: "2026-08-09T06:51:00",
        }}
        onRequestDelete={handleRequestDeleteTrackingEntry}
        onStartSleep={async (sleep) => {
          console.log("Sommeil commencé :", sleep);

          /*
           * Plus tard :
           * await saveActiveSleep(sleep);
           */

          showToast({
            type: "success",
            title: t("Sleep tracking started"),
            message: t("Child's sleep is now being tracked", {
              childName,
            }),
          });
        }}
        onWakeUp={async (completedSleep) => {
          console.log("Sommeil terminé :", completedSleep);

          /*
           * Plus tard :
           * await saveCompletedSleep(completedSleep);
           */

          showToast({
            type: "success",
            title: t("Sleep saved"),
            message: t("Child's sleep was saved successfully", {
              childName,
            }),
          });
        }}
        onPressAddManually={({ type }) => {
          console.log("Ouvrir l’ajout manuel :", type);
        }}
      />

      <DiaperEntrySheet
        ref={diaperSheetRef}
        childName={childName}
        onRequestDelete={handleRequestDeleteTrackingEntry}
        onSaveDiaper={async (diaper) => {
          console.log("Couche enregistrée :", diaper);

          showToast({
            type: "success",
            title:
              diaper.mode === "edit" ? t("Diaper updated") : t("Diaper saved"),
            message:
              diaper.mode === "edit"
                ? t("Child's diaper change was updated successfully", {
                    childName,
                  })
                : t("Child's diaper change was saved successfully", {
                    childName,
                  }),
          });
        }}
        onSavePotty={async (potty) => {
          console.log("Passage au pot enregistré :", potty);

          showToast({
            type: "success",
            title:
              potty.mode === "edit"
                ? t("Potty time updated")
                : t("Potty time saved"),
            message:
              potty.mode === "edit"
                ? t("Child's potty time was updated successfully", {
                    childName,
                  })
                : t("Child's potty time was saved successfully", { childName }),
          });
        }}
      />

      <MoodEntrySheet
        ref={moodSheetRef}
        childName={childName}
        onRequestDelete={handleRequestDeleteTrackingEntry}
        onSave={async (mood) => {
          console.log("Humeur enregistrée :", mood);

          showToast({
            type: "success",

            title: mood.mode === "edit" ? t("Mood updated") : t("Mood saved"),

            message:
              mood.mode === "edit"
                ? t("Child's mood was updated successfully", { childName })
                : t("Child's mood was saved successfully", { childName }),
          });
        }}
      />
      <MedicationEntrySheet
        ref={medicationSheetRef}
        childName={childName}
        recentMedications={[
          { id: "dafalgan", name: "Dafalgan" },
          { id: "nurofen", name: "Nurofen" },
        ]}
        onRequestDelete={handleRequestDeleteTrackingEntry}
        onSaveMedication={async (medication) => {
          console.log("Médicament enregistré :", medication);

          showToast({
            type: "success",
            title:
              medication.mode === "edit"
                ? t("Medication updated")
                : t("Medication saved"),
            message:
              medication.mode === "edit"
                ? t("Child's medication was updated successfully", {
                    childName,
                  })
                : t("Child's medication was saved successfully", {
                    childName,
                  }),
          });
        }}
        onSaveVaccine={async (vaccine) => {
          console.log("Vaccin enregistré :", vaccine);

          showToast({
            type: "success",
            title:
              vaccine.mode === "edit"
                ? t("Vaccine updated")
                : t("Vaccine saved"),
            message:
              vaccine.mode === "edit"
                ? t("Child's vaccine was updated successfully", {
                    childName,
                  })
                : t("Child's vaccine was saved successfully", {
                    childName,
                  }),
          });
        }}
      />

      <TemperatureEntrySheet
        ref={temperatureSheetRef}
        childName={childName}
        childAgeInMonths={2}
        initialLocation="forehead"
        onRequestDelete={handleRequestDeleteTrackingEntry}
        onSave={async (temperatureEntry) => {
          console.log("Température enregistrée :", temperatureEntry);

          showToast({
            type: "success",
            title:
              temperatureEntry.mode === "edit"
                ? t("Temperature updated")
                : t("Temperature saved"),
            message:
              temperatureEntry.mode === "edit"
                ? t("Child's temperature was updated successfully", {
                    childName,
                  })
                : t("Child's temperature was saved successfully", {
                    childName,
                  }),
          });
        }}
      />

      <SymptomsEntrySheet
        ref={symptomsEntrySheetRef}
        childName={childName}
        onRequestDelete={handleRequestDeleteTrackingEntry}
        onSave={async (symptomsData) => {
          console.log("Symptoms saved:", symptomsData);

          showToast({
            type: "success",

            title:
              symptomsData.mode === "edit"
                ? t("Symptoms updated")
                : t("Symptoms saved"),

            message:
              symptomsData.mode === "edit"
                ? t("Child's symptoms were updated successfully", {
                    childName,
                  })
                : t("Child's symptoms were saved successfully", {
                    childName,
                  }),
          });
        }}
      />

      <TeethingEntrySheet
        ref={teethingSheetRef}
        childName={childName}
        eruptedTeeth={
          [
            // Les dents déjà enregistrées dans les autres entrées.
          ]
        }
        onRequestDelete={handleRequestDeleteTrackingEntry}
        onSave={async (teethingEntry) => {
          console.log("Dentition enregistrée :", teethingEntry);

          showToast({
            type: "success",

            title:
              teethingEntry.mode === "edit"
                ? t("Teething updated")
                : t("Teething saved"),

            message:
              teethingEntry.mode === "edit"
                ? t("Child's teething was updated successfully", {
                    childName,
                  })
                : t("Child's teething was saved successfully", {
                    childName,
                  }),
          });
        }}
      />

      <GrowthEntrySheet
        ref={growthEntrySheetRef}
        childName={childName}
        previousMeasurements={{
          weight: 5.18,
          height: 57.2,
          headCircumference: 38.7,
        }}
        onRequestDelete={handleRequestDeleteTrackingEntry}
        onSave={async (growthEntry) => {
          console.log("Croissance enregistrée :", growthEntry);

          showToast({
            type: "success",

            title:
              growthEntry.mode === "edit"
                ? t("Growth updated")
                : t("Growth saved"),

            message:
              growthEntry.mode === "edit"
                ? t("Child's growth measurements were updated successfully", {
                    childName,
                  })
                : t("Child's growth was saved successfully", {
                    childName,
                  }),
          });
        }}
      />

      <NoteEntrySheet
        ref={noteEntrySheetRef}
        onRequestDelete={handleRequestDeleteTrackingEntry}
        onSave={async (noteEntry) => {
          console.log("Note enregistrée :", noteEntry);

          showToast({
            type: "success",

            title:
              noteEntry.mode === "edit" ? t("Note updated") : t("Note saved"),

            message:
              noteEntry.mode === "edit"
                ? t("The note was updated successfully.")
                : t("The note was saved successfully."),
          });
        }}
      />

      <ConfirmActionSheet ref={confirmationSheetRef} />
      <ToastMessage
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={hideToast}
      />
    </>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    tabBarOuterContainer: {
      position: "absolute",

      left: 0,
      right: 0,
      bottom: 20,

      alignItems: "center",

      overflow: "visible",
    },

    tabBarInnerContainer: {
      width: "95%",
      maxWidth: 520,

      borderRadius: 32,

      overflow: "visible",

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 7,
      },
      shadowOpacity: 0.1,
      shadowRadius: 20,

      elevation: 14,
    },

    tabBar: {
      position: "relative",

      width: "100%",
      height: 64,

      paddingTop: 5,
      paddingBottom: 5,
      paddingHorizontal: 6,

      backgroundColor: colors.white,

      borderTopWidth: 0,
      borderRadius: 32,

      overflow: "visible",
    },

    tabBarItem: {
      height: 54,

      alignItems: "center",
      justifyContent: "center",

      paddingTop: 0,
      paddingBottom: 0,

      overflow: "visible",
    },

    tabBarLabel: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,

      marginTop: 1,
      marginBottom: 1,
    },

    tabIcon: {
      width: 27,
      height: 27,

      resizeMode: "contain",
    },

    addButtonWrapper: {
      flex: 1,

      alignItems: "center",
      justifyContent: "center",

      overflow: "visible",
      backgroundColor: "transparent",
    },

    addButton: {
      width: 68,
      height: 68,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 34,

      backgroundColor: colors.primary,

      borderWidth: 3,
      borderColor: colors.white,

      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.22,
      shadowRadius: 9,

      elevation: 10,
    },

    addButtonPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.96 }],
    },

    emptyScreen: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });
