import { useMemo, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import HomeHeader from "../../components/home/HomeHeader.js";
import NeloQuestionBar from "../../components/home/NeloQuestionBar.js";
import DailySummaryCard from "../../components/home/DailySummaryCard.js";
import NextNapCard from "../../components/home/NextNapCard.js";
import DailyMessageCard from "../../components/home/DailyMessageCard.js";
import MemoryCard from "../../components/home/MemoryCard.js";
import ChildSelectorSheet from "../child/ChildSelectorSheet.js";
import { useTranslation } from "react-i18next";
import DailyMessageDetailScreen from "./DailyMessageDetailsScreen.js";

import { mockHomeData } from "../../data/mockHomeData.js";
import { useThemeColors } from "../../theme/useThemeColors.js";

const MOCK_CHILDREN = [
  {
    id: "emma",
    firstName: "Emma",
    ageLabel: "4 months old",
    themeMode: "blue",
    profilePicture: null,
  },
  {
    id: "leo",
    firstName: "Léo",
    ageLabel: "2 years old",
    themeMode: "green",
    profilePicture: null,
  },
];

const MOCK_UNREAD_NOTIFICATION_COUNT = 2;

export default function HomeScreen({ navigation }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [children] = useState(MOCK_CHILDREN);
  const [selectedChildId, setSelectedChildId] = useState("emma");
  const childSelectorSheetRef = useRef(null);

  const homeData = mockHomeData;

  const hasUnreadNotifications = MOCK_UNREAD_NOTIFICATION_COUNT > 0;

  const handleOpenChildSelector = () => {
    childSelectorSheetRef.current?.present();
  };

  const handleSelectChild = (child) => {
    setSelectedChildId(child.id);

    // Plus tard, tu pourras également :
    // - récupérer les données de cet enfant ;
    // - mettre à jour ton contexte global ;
    // - rafraîchir le résumé de la page d'accueil.
  };

  const handleAddChild = () => {
    navigation.navigate("AddChild");
  };

  const handleOpenNotifications = () => {
    navigation.navigate("Notifications");
  };

  const handleOpenNelo = () => {
    navigation.navigate("NeloChat");
  };

  const handleOpenVoice = () => {
    navigation.navigate("NeloChat");
  };

  const handleRefreshSummary = () => {
    Alert.alert("Résumé actualisé");
  };

  const handleOpenSummaryItem = (itemId) => {
    Alert.alert("Suivi", `Ouverture de la catégorie : ${itemId}`);
  };

  const handleOpenNextNap = () => {
    Alert.alert("Prochaine sieste", "Détails de la prochaine sieste.");
  };

  const handleOpenDailyMessage = () => {
    navigation.navigate("DailyMessageDetail", {
      message: homeData.dailyMessage,
    });
  };

  const handleOpenMemory = () => {
    navigation.navigate("Moments");
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <HomeHeader
          parentFirstName={homeData.parent.firstName}
          child={homeData.child}
          onPressChild={handleOpenChildSelector}
          onPressNotifications={handleOpenNotifications}
          hasUnreadNotifications={hasUnreadNotifications}
        />

        <NeloQuestionBar
          onPress={handleOpenNelo}
          onPressVoice={handleOpenVoice}
        />

        <View style={styles.sections}>
          <DailySummaryCard
            summary={homeData.dailySummary}
            onRefresh={handleRefreshSummary}
            onPressItem={handleOpenSummaryItem}
          />

          <NextNapCard nextNap={homeData.nextNap} onPress={handleOpenNextNap} />

          <DailyMessageCard
            message={homeData.dailyMessage}
            onPress={handleOpenDailyMessage}
          />

          <MemoryCard memory={homeData.memory} onPress={handleOpenMemory} />
        </View>
      </ScrollView>

      <ChildSelectorSheet
        ref={childSelectorSheetRef}
        children={children}
        selectedChildId={selectedChildId}
        onSelectChild={handleSelectChild}
        onAddChild={handleAddChild}
      />
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
      paddingTop: 10,

      // Indispensable, car la tab bar est flottante.
      paddingBottom: 120,
    },

    sections: {
      gap: 16,
      marginTop: 18,
    },
  });
