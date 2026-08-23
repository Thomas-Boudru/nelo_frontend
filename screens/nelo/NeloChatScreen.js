import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import BackButton from "../../components/ui/BackButton.js";
import NeloCloudMascot from "../../components/nelo/NeloCloudMascot.js";

import { useThemeColors } from "../../theme/useThemeColors.js";

const QUICK_PROMPTS = [
  "Is this normal?",
  "What can I try tonight?",
  "When should I worry?",
];

const INITIAL_MESSAGES = [
  {
    id: "user-1",
    role: "user",
    content: "Why does Emma still wake during the night?",
  },
  {
    id: "assistant-1",
    role: "assistant",

    content:
      "Night wakings are still common at 4 months. Emma may be moving between sleep cycles, looking for reassurance, or waking because she is hungry or uncomfortable.",

    suggestions: [
      "Pause briefly before intervening",
      "Keep lights low and voices soft",
      "Follow the usual bedtime routine",
    ],

    sources: [
      {
        id: "nhs-baby-sleep",
        label: "Helping your baby to sleep",
        publisher: "NHS",
        url: "https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/",
      },
    ],
  },
];

const MOCK_RESPONSE = {
  content:
    "A few changes from one day to the next can be normal. I can help you look at Emma’s recent routine, but contact a healthcare professional if you notice something urgent or unusual.",

  suggestions: [
    "Compare with the last few days",
    "Keep the usual routine",
    "Note any unusual symptoms",
  ],

  sources: [],
};

function ContextBanner({ context, colors, styles }) {
  if (!context?.title) {
    return null;
  }

  return (
    <View style={styles.contextBanner}>
      <View style={styles.contextIcon}>
        <Ionicons name="heart" size={22} color={colors.primary} />
      </View>

      <View style={styles.contextContent}>
        <Text style={styles.contextEyebrow}>ABOUT TODAY’S NOTE</Text>

        <Text numberOfLines={2} style={styles.contextTitle}>
          {context.title}
        </Text>
      </View>
    </View>
  );
}

function UserMessage({ message, styles }) {
  return (
    <View style={styles.userMessageRow}>
      <View style={styles.userBubble}>
        <Text style={styles.userMessageText}>{message.content}</Text>
      </View>
    </View>
  );
}

function AssistantMessage({ message, colors, styles, t }) {
  const handleOpenSources = async () => {
    const firstSource = message.sources?.[0];

    if (!firstSource?.url) {
      return;
    }

    await Linking.openURL(firstSource.url);
  };

  return (
    <View style={styles.assistantMessageRow}>
      <View style={styles.mascotContainer}>
        <NeloCloudMascot size={40} />
      </View>

      <View style={styles.assistantContent}>
        <Text style={styles.assistantMessageText}>{message.content}</Text>

        {message.suggestions?.length ? (
          <View style={styles.suggestionList}>
            {message.suggestions.map((suggestion) => (
              <View key={suggestion} style={styles.suggestionListItem}>
                <View style={styles.bullet} />

                <Text style={styles.suggestionListText}>{suggestion}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {message.sources?.length ? (
          <Pressable
            accessibilityRole="link"
            onPress={handleOpenSources}
            style={({ pressed }) => [
              styles.sourcesButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="book-outline" size={18} color={colors.primary} />

            <Text style={styles.sourcesText}>
              {t("Sources ({{count}})", {
                count: message.sources.length,
              })}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function ChatMessage({ message, colors, styles, t }) {
  if (message.role === "user") {
    return <UserMessage message={message} styles={styles} />;
  }

  return (
    <AssistantMessage message={message} colors={colors} styles={styles} t={t} />
  );
}

export default function NeloChatScreen({ navigation, route }) {
  const { t } = useTranslation();

  const colors = useThemeColors();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const messagesListRef = useRef(null);
  const inputRef = useRef(null);

  const {
    conversationId,
    initialQuestion = "",
    context = null,
  } = route.params ?? {};

  const [messages, setMessages] = useState(
    conversationId === "night-wakings" ? INITIAL_MESSAGES : [],
  );

  const [draft, setDraft] = useState(initialQuestion);
  const [isSending, setIsSending] = useState(false);

  const canSend = draft.trim().length > 0 && !isSending;

  const handleNewConversation = () => {
    setMessages([]);
    setDraft("");

    navigation.setParams({
      conversationId: undefined,
      initialQuestion: undefined,
      context: undefined,
    });
  };

  const handleSend = (providedText) => {
    const textToSend = typeof providedText === "string" ? providedText : draft;

    const trimmedText = textToSend.trim();

    if (!trimmedText || isSending) {
      return;
    }
    inputRef.current?.blur();
    Keyboard.dismiss();

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmedText,
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);

    setDraft("");
    setIsSending(true);

    /*
      Réponse mockée pour l’instant.

      Plus tard, ce bloc sera remplacé par l’appel
      vers ton backend Nelo.
    */
    setTimeout(() => {
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        ...MOCK_RESPONSE,
      };

      setMessages((currentMessages) => [...currentMessages, assistantMessage]);

      setIsSending(false);
    }, 700);
  };

  const renderMessage = ({ item }) => (
    <ChatMessage message={item} colors={colors} styles={styles} t={t} />
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Nelo</Text>

            <Text style={styles.headerSubtitle}>
              {t("Your parenting copilot")}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Open conversation history")}
              onPress={() => navigation.navigate("NeloConversations")}
              style={({ pressed }) => [
                styles.headerButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="time-outline"
                size={22}
                color={colors.textPrimary}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Start a new conversation")}
              onPress={handleNewConversation}
              style={({ pressed }) => [
                styles.headerButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="create-outline"
                size={22}
                color={colors.textPrimary}
              />
            </Pressable>
          </View>
        </View>

        <FlatList
          ref={messagesListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 && styles.emptyMessagesContent,
          ]}
          ItemSeparatorComponent={() => (
            <View style={styles.messageSeparator} />
          )}
          onContentSizeChange={() => {
            messagesListRef.current?.scrollToEnd({
              animated: true,
            });
          }}
          ListHeaderComponent={
            context ? (
              <View style={styles.contextWrapper}>
                <ContextBanner
                  context={context}
                  colors={colors}
                  styles={styles}
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.welcomeContainer}>
              <NeloCloudMascot size={80} />

              <Text style={styles.welcomeTitle}>{t("How can Nelo help?")}</Text>

              <Text style={styles.welcomeDescription}>
                {t(
                  "Ask about your child’s sleep, feeding, development or daily routine.",
                )}
              </Text>
            </View>
          }
          ListFooterComponent={
            isSending ? (
              <View style={styles.loadingContainer}>
                <NeloCloudMascot size={32} />

                <ActivityIndicator size="small" color={colors.primary} />

                <Text style={styles.loadingText}>{t("Nelo is thinking…")}</Text>
              </View>
            ) : null
          }
        />

        <View style={styles.footer}>
          <FlatList
            horizontal
            data={QUICK_PROMPTS}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.quickPrompts}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSend(t(item))}
                style={({ pressed }) => [
                  styles.quickPromptButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.quickPromptText}>{t(item)}</Text>
              </Pressable>
            )}
          />

          <View style={styles.composer}>
            <TextInput
              ref={inputRef}
              accessibilityLabel={t("Ask Nelo anything")}
              multiline
              value={draft}
              onChangeText={setDraft}
              placeholder={t("Ask Nelo anything…")}
              placeholderTextColor={colors.textSecondary}
              selectionColor={colors.primary}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={() => handleSend()}
              style={styles.input}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Send message")}
              accessibilityState={{
                disabled: !canSend,
              }}
              disabled={!canSend}
              onPress={() => handleSend()}
              style={({ pressed }) => [
                styles.sendButton,
                !canSend && styles.sendButtonDisabled,
                pressed && canSend && styles.sendButtonPressed,
              ]}
            >
              <Ionicons name="arrow-up" size={22} color={colors.white} />
            </Pressable>
          </View>

          <Text style={styles.disclaimer}>
            {t(
              "Nelo can make mistakes. For urgent concerns, contact a healthcare professional.",
            )}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.lightBackground ?? colors.background,
    },

    keyboardView: {
      flex: 1,
    },

    header: {
      height: 68,

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 20,
    },

    headerTitleContainer: {
      flex: 1,
      alignItems: "center",

      marginHorizontal: 8,
    },

    headerTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 22,
      lineHeight: 27,

      color: colors.textPrimary,
    },

    headerSubtitle: {
      marginTop: 1,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 15,

      color: colors.textSecondary,
    },

    headerActions: {
      flexDirection: "row",
      gap: 8,
    },

    headerButton: {
      width: 40,
      height: 40,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 20,
      backgroundColor: colors.white,

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.05,
      shadowRadius: 10,

      elevation: 2,
    },

    messagesContent: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 24,
    },

    emptyMessagesContent: {
      flexGrow: 1,
    },

    contextWrapper: {
      marginBottom: 28,
    },

    contextBanner: {
      minHeight: 82,

      flexDirection: "row",
      alignItems: "center",
      gap: 12,

      paddingHorizontal: 14,
      paddingVertical: 10,

      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 26,

      backgroundColor: colors.white,
    },

    contextIcon: {
      width: 52,
      height: 52,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 26,
      backgroundColor: colors.selectedBackground,
    },

    contextContent: {
      flex: 1,
    },

    contextEyebrow: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 10,
      lineHeight: 14,
      letterSpacing: 0.8,

      color: colors.textSecondary,
    },

    contextTitle: {
      marginTop: 4,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 15,
      lineHeight: 21,

      color: colors.textPrimary,
    },

    messageSeparator: {
      height: 28,
    },

    userMessageRow: {
      alignItems: "flex-end",
      paddingLeft: 58,
    },

    userBubble: {
      maxWidth: "88%",

      paddingHorizontal: 18,
      paddingVertical: 13,

      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 6,

      backgroundColor: colors.primary,
    },

    userMessageText: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 15,
      lineHeight: 22,

      color: colors.white,
    },

    assistantMessageRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },

    mascotContainer: {
      width: 42,
      paddingTop: 3,
    },

    assistantContent: {
      flex: 1,
    },

    assistantMessageText: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 15,
      lineHeight: 24,

      color: colors.textPrimary,
    },

    suggestionList: {
      gap: 12,
      marginTop: 16,
    },

    suggestionListItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },

    bullet: {
      width: 6,
      height: 6,

      marginTop: 9,

      borderRadius: 3,
      backgroundColor: colors.primary,
    },

    suggestionListText: {
      flex: 1,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      lineHeight: 22,

      color: colors.textPrimary,
    },

    sourcesButton: {
      alignSelf: "flex-start",

      flexDirection: "row",
      alignItems: "center",
      gap: 7,

      marginTop: 18,
      paddingVertical: 5,
    },

    sourcesText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,

      color: colors.primary,
    },

    welcomeContainer: {
      flex: 1,

      alignItems: "center",
      justifyContent: "center",

      paddingHorizontal: 30,
    },

    welcomeTitle: {
      marginTop: 0,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 24,
      lineHeight: 30,

      color: colors.textPrimary,
    },

    welcomeDescription: {
      marginTop: 10,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      lineHeight: 21,
      textAlign: "center",

      color: colors.textSecondary,
    },

    loadingContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,

      marginTop: 24,
      marginLeft: 54,
    },

    loadingText: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,

      color: colors.textSecondary,
    },

    footer: {
      paddingTop: 8,
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === "ios" ? 10 : 14,
    },

    quickPrompts: {
      gap: 8,
      paddingHorizontal: 4,
      paddingBottom: 10,
    },

    quickPromptButton: {
      paddingHorizontal: 14,
      paddingVertical: 9,

      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,

      backgroundColor: colors.white,
    },

    quickPromptText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,

      color: colors.primary,
    },

    composer: {
      minHeight: 58,
      maxHeight: 132,

      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,

      paddingLeft: 17,
      paddingRight: 7,
      paddingVertical: 7,

      borderRadius: 29,
      backgroundColor: colors.white,

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.08,
      shadowRadius: 16,

      elevation: 4,
    },

    input: {
      flex: 1,

      minHeight: 44,
      maxHeight: 112,

      paddingTop: 11,
      paddingBottom: 10,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 15,
      lineHeight: 21,

      color: colors.textPrimary,
    },

    sendButton: {
      width: 44,
      height: 44,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 22,
      backgroundColor: colors.primary,
    },

    sendButtonDisabled: {
      backgroundColor: colors.primaryDisabled,
    },

    sendButtonPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.96 }],
    },

    disclaimer: {
      marginTop: 8,
      paddingHorizontal: 20,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 14,
      textAlign: "center",

      color: colors.textSecondary,
    },

    pressed: {
      opacity: 0.6,
    },
  });
