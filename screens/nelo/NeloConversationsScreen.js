import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import BackButton from "../../components/ui/BackButton.js";
import PrimaryButton from "../../components/ui/PrimaryButton.js";

import { useThemeColors } from "../../theme/useThemeColors.js";

const MOCK_CONVERSATIONS = [
  {
    id: "night-wakings",
    title: "Emma’s night wakings",
    preview: "Night wakings are still common at 4 months.",
    dateLabel: "Today",
  },
  {
    id: "tummy-time",
    title: "Making tummy time easier",
    preview: "Short, calm sessions can be enough to begin with.",
    dateLabel: "Yesterday",
  },
  {
    id: "bottle-quantity",
    title: "Bottle quantity",
    preview: "Look at Emma’s cues as well as the quantity.",
    dateLabel: "20 August",
  },
];

function ConversationRow({
  conversation,
  onPress,
  onDelete,
  colors,
  styles,
  t,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={conversation.title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.conversationRow,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.conversationIcon}>
        <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationTitleRow}>
          <Text numberOfLines={1} style={styles.conversationTitle}>
            {conversation.title}
          </Text>

          <Text style={styles.conversationDate}>
            {t(conversation.dateLabel)}
          </Text>
        </View>

        <Text numberOfLines={1} style={styles.conversationPreview}>
          {conversation.preview}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Delete conversation")}
        hitSlop={10}
        onPress={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        style={({ pressed }) => [
          styles.deleteButton,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="trash-outline" size={19} color={colors.textSecondary} />
      </Pressable>
    </Pressable>
  );
}

export default function NeloConversationsScreen({ navigation }) {
  const { t } = useTranslation();

  const colors = useThemeColors();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);

  const handleNewConversation = () => {
    navigation.replace("NeloChat");
  };

  const handleOpenConversation = (conversation) => {
    navigation.replace("NeloChat", {
      conversationId: conversation.id,
    });
  };

  const handleDeleteConversation = (conversation) => {
    Alert.alert(
      t("Delete this conversation?"),
      t("This conversation will be permanently deleted."),
      [
        {
          text: t("Cancel"),
          style: "cancel",
        },
        {
          text: t("Delete"),
          style: "destructive",
          onPress: () => {
            setConversations((currentConversations) =>
              currentConversations.filter(
                (item) => item.id !== conversation.id,
              ),
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />

        <Text style={styles.headerTitle}>{t("Conversations")}</Text>

        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.newConversationContainer}>
        <PrimaryButton
          title={t("New conversation")}
          icon={
            <Ionicons name="create-outline" size={20} color={colors.white} />
          }
          onPress={handleNewConversation}
        />
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          conversations.length === 0 && styles.emptyListContent,
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            colors={colors}
            styles={styles}
            t={t}
            onPress={() => handleOpenConversation(item)}
            onDelete={() => handleDeleteConversation(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="chatbubbles-outline"
                size={30}
                color={colors.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>{t("No conversations yet")}</Text>

            <Text style={styles.emptyDescription}>
              {t("Your conversations with Nelo will appear here.")}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.lightBackground ?? colors.background,
    },

    header: {
      height: 64,

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 20,
    },

    headerTitle: {
      flex: 1,

      marginHorizontal: 12,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 19,
      lineHeight: 25,
      textAlign: "center",

      color: colors.textPrimary,
    },

    headerPlaceholder: {
      width: 42,
    },

    newConversationContainer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 20,
    },

    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },

    emptyListContent: {
      flexGrow: 1,
    },

    conversationRow: {
      minHeight: 82,

      flexDirection: "row",
      alignItems: "center",
      gap: 12,

      paddingVertical: 14,
    },

    conversationIcon: {
      width: 42,
      height: 42,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 21,
      backgroundColor: colors.selectedBackground,
    },

    conversationContent: {
      flex: 1,
    },

    conversationTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    conversationTitle: {
      flex: 1,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 20,

      color: colors.textPrimary,
    },

    conversationDate: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 15,

      color: colors.textSecondary,
    },

    conversationPreview: {
      marginTop: 5,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 17,

      color: colors.textSecondary,
    },

    deleteButton: {
      width: 36,
      height: 36,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 18,
    },

    separator: {
      height: 1,
      marginLeft: 54,

      backgroundColor: colors.border,
    },

    emptyContainer: {
      flex: 1,

      alignItems: "center",
      justifyContent: "center",

      paddingHorizontal: 32,
      paddingBottom: 80,
    },

    emptyIcon: {
      width: 66,
      height: 66,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 33,
      backgroundColor: colors.selectedBackground,
    },

    emptyTitle: {
      marginTop: 18,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 19,
      lineHeight: 25,

      color: colors.textPrimary,
    },

    emptyDescription: {
      marginTop: 8,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",

      color: colors.textSecondary,
    },

    pressed: {
      opacity: 0.6,
    },
  });
