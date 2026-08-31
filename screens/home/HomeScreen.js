import { useMemo, useRef } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import HomeHeader from "../../components/home/HomeHeader.js";
import NeloQuestionBar from "../../components/home/NeloQuestionBar.js";
import DailySummaryCard from "../../components/home/DailySummaryCard.js";
import NextNapCard from "../../components/home/NextNapCard.js";
import DailyMessageCard from "../../components/home/DailyMessageCard.js";
import MemoryCard from "../../components/home/MemoryCard.js";
import ChildSelectorSheet from "../child/ChildSelectorSheet.js";
import { useTranslation } from "react-i18next";
import DailyMessageDetailScreen from "./DailyMessageDetailsScreen.js";

import { navigateToTrackingHistory } from "../../navigation/trackingHistoryDestinations.js";
import { mockHomeData } from "../../data/mockHomeData.js";
import { useThemeColors } from "../../theme/useThemeColors.js";
import { selectChild } from "../../store/slices/childrenSlice.js";

const MOCK_UNREAD_NOTIFICATION_COUNT = 2;

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const children = useSelector((state) => state.children.children);
  const selectedChildId = useSelector(
    (state) => state.children.selectedChildId,
  );
  const childSelectorSheetRef = useRef(null);

  const childPickerChildren = useMemo(
    () =>
      children.map((child) => {
        let ageInMonths = 0;

        if (child.birthDate) {
          const [birthYear, birthMonth, birthDay] = child.birthDate
            .slice(0, 10)
            .split("-")
            .map(Number);
          const today = new Date();

          ageInMonths =
            (today.getFullYear() - birthYear) * 12 +
            today.getMonth() -
            (birthMonth - 1);

          if (today.getDate() < birthDay) {
            ageInMonths -= 1;
          }

          ageInMonths = Math.max(0, ageInMonths);
        }

        return {
          ...child,
          firstName: child.displayName || t("Baby"),
          ageInMonths,
          ageLabel:
            child.birthStatus === "expected"
              ? t("Expected date of birth")
              : t("Child age in months", { count: ageInMonths }),
          profilePicture: child.avatar?.url
            ? {
                uri: child.avatar.url,
                cacheKey: `child-avatar:${child.id}:${child.avatar.attachmentId}`,
              }
            : null,
        };
      }),
    [children, t],
  );

  const selectedChild = useMemo(
    () =>
      childPickerChildren.find((child) => child.id === selectedChildId) || null,
    [childPickerChildren, selectedChildId],
  );

  const homeData = mockHomeData;

  const hasUnreadNotifications = MOCK_UNREAD_NOTIFICATION_COUNT > 0;

  const handleOpenChildSelector = () => {
    childSelectorSheetRef.current?.present();
  };

  const handleSelectChild = (child) => {
    dispatch(selectChild(child.id));
  };

  const handleAddChild = () => {
    navigation.navigate("ChildProfileForm", {
      mode: "create",
    });
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

  /*
   * Les identifiants du résumé (« meals », « diapers »…) sont déjà connus
   * de la table des destinations, qui gère les alias.
   */
  const handleOpenSummaryItem = ({ id }) => {
    navigateToTrackingHistory(navigation, id);
  };

  const handleOpenNextNap = () => {
    navigation.navigate("NextSleepDetails", {
      nextSleep: homeData.nextNap,
    });
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
          child={selectedChild}
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
        children={childPickerChildren}
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
