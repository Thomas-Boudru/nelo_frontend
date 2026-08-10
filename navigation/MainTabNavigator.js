import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import {
  BottomTabBar,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import HomeScreen from "../screens/HomeScreen.js";
import TrackingScreen from "../screens/tracking/TrackingScreen.js";
import MomentsScreen from "../screens/moments/MomentsScreen.js";
import ChildProfileScreen from "../screens/child/ChildProfileScreen.js";
import FeedingEntrySheet from "../screens/addTracking/Feeding/FeedingEntrySheet.js";
import SleepEntrySheet from "../screens/addTracking/Sleep/SleepEntrySheet.js";
import DiaperEntrySheet from "../screens/addTracking/Diaper/DiaperEntrySheet.js";
import MoodEntrySheet from "../screens/addTracking/Mood/MoodEntrySheet.js";
import MedicationEntrySheet from "../screens/medication/MedicationEntrySheet.js";

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

const Tab = createBottomTabNavigator();

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

  const toastTimeoutRef = useRef(null);

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
        feedingSheetRef.current?.present("bottle");
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
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

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
          component={TrackingScreen}
          options={{
            tabBarLabel: t("Tracking"),

            tabBarIcon: ({ focused }) => (
              <Image
                source={focused ? trackingActive : trackingInactive}
                style={styles.tabIcon}
              />
            ),
          }}
        />

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

            tabBarIcon: ({ focused }) => (
              <Image
                source={focused ? babyActive : babyInactive}
                style={styles.tabIcon}
              />
            ),
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

      <FeedingEntrySheet ref={feedingSheetRef} childName={childName} />

      <SleepEntrySheet
        ref={sleepSheetRef}
        childName={childName}
        lastSleep={{
          type: "night",
          startedAt: "2026-08-08T20:42:00",
          endedAt: "2026-08-09T06:51:00",
        }}
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
        onSaveDiaper={async (diaper) => {
          console.log("Couche enregistrée :", diaper);

          /*
           * Plus tard :
           * await saveDiaper(diaper);
           */

          showToast({
            type: "success",
            title: t("Diaper saved"),
            message: t("Child's diaper change was saved successfully", {
              childName,
            }),
          });
        }}
        onSavePotty={async (potty) => {
          console.log("Passage au pot enregistré :", potty);

          /*
           * Plus tard :
           * await savePotty(potty);
           */

          showToast({
            type: "success",
            title: t("Potty time saved"),
            message: t("Child's potty time was saved successfully", {
              childName,
            }),
          });
        }}
      />

      <MoodEntrySheet
        ref={moodSheetRef}
        childName={childName}
        onSave={async (mood) => {
          console.log("Humeur enregistrée :", mood);

          /*
           * Plus tard :
           * await saveMood(mood);
           */

          showToast({
            type: "success",
            title: t("Mood saved"),
            message: t("Child's mood was saved successfully", {
              childName,
            }),
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
        onSaveMedication={async (medication) => {
          console.log("Médicament enregistré :", medication);

          /*
           * Plus tard :
           * await saveMedication(medication);
           */

          showToast({
            type: "success",
            title: t("Medication saved"),
            message: t("Child's medication was saved successfully", {
              childName,
            }),
          });
        }}
        onSaveVaccine={async (vaccine) => {
          console.log("Vaccin enregistré :", vaccine);

          /*
           * Plus tard :
           * await saveVaccine(vaccine);
           */

          showToast({
            type: "success",
            title: t("Vaccine saved"),
            message: t("Child's vaccine was saved successfully", {
              childName,
            }),
          });
        }}
        onPressVaccinePhoto={() => {
          console.log("Ouvrir le sélecteur de photo");
        }}
      />
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
