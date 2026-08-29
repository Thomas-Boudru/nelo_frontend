import { useEffect, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import BackButton from "../../components/ui/BackButton.js";
import PrimaryButton from "../../components/ui/PrimaryButton.js";
import FormField from "../../components/onboarding/FormField.js";
import OnboardingProgressBar from "../../components/onboarding/OnboardingProgressBar.js";
import { useDispatch } from "react-redux";
import { setParentFirstName } from "../../store/slices/onboardingSlice.js";

import { onboardingColors, spacing } from "../../theme/index.js";
const colors = onboardingColors;
const STAR_IMAGE = require("../../assets/illustrations/onboarding/starYellow.png");
const HEART_IMAGE = require("../../assets/illustrations/onboarding/heart.png");
const LANDSCAPE_IMAGE = require("../../assets/illustrations/onboarding/landscape.png");

export default function ParentNameScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const [displayName, setDisplayName] = useState("");
  const trimmedDisplayName = displayName.trim();
  const [nameError, setNameError] = useState("");
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const canSubmit = trimmedDisplayName.length > 0;

  useEffect(() => {
    const keyboardShowEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";

    const keyboardHideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(keyboardShowEvent, () => {
      setIsKeyboardVisible(true);
    });

    const hideSubscription = Keyboard.addListener(keyboardHideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  function handleNameChange(value) {
    setDisplayName(value);

    if (nameError) {
      setNameError("");
    }
  }
  function validateName() {
    if (!trimmedDisplayName) {
      setNameError(t("Please enter the name you would like us to use."));
      return false;
    }

    if (trimmedDisplayName.length < 2) {
      setNameError(
        t("Your preferred name must contain at least 2 characters."),
      );

      return false;
    }

    setNameError("");
    return true;
  }

  function handleContinue() {
    if (!validateName()) {
      return;
    }

    Keyboard.dismiss();
    dispatch(setParentFirstName(trimmedDisplayName));
    navigation.navigate("Relationship");
  }
  function handleGoBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.screen}>
          {!isKeyboardVisible ? (
            <Image
              source={LANDSCAPE_IMAGE}
              resizeMode="stretch"
              pointerEvents="none"
              style={styles.landscapeBackground}
            />
          ) : null}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              isKeyboardVisible && styles.scrollContentWithKeyboard,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            bounces={false}
          >
            <View style={styles.topSection}>
              <BackButton onPress={handleGoBack} />

              <OnboardingProgressBar
                currentStep={4}
                totalSteps={6}
                style={styles.progressBar}
              />
            </View>

            <View style={styles.header}>
              <Image
                source={STAR_IMAGE}
                resizeMode="contain"
                pointerEvents="none"
                style={styles.star}
              />

              <Text style={styles.title}>
                {t("What should Nelo call you?")}
              </Text>

              <Text style={styles.description}>
                {t("Your first name will help us personalize your experience.")}
              </Text>
            </View>

            <View style={styles.form}>
              <FormField
                label={t("Preferred name")}
                value={displayName}
                onChangeText={handleNameChange}
                placeholder={t("For example: Thomas")}
                helperText={t("You can change this later in your settings.")}
                helperIconName="heart-outline"
                error={nameError}
                iconName="person-outline"
                autoFocus
                autoCapitalize="words"
                autoCorrect={false}
                autoComplete="name"
                textContentType="name"
                returnKeyType="done"
                maxLength={40}
                onSubmitEditing={handleContinue}
                required
              />
            </View>
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                paddingBottom: isKeyboardVisible
                  ? spacing.xs
                  : Math.max(insets.bottom, spacing.sm) + 105,
              },
            ]}
          >
            <PrimaryButton
              title={t("Continue")}
              onPress={handleContinue}
              disabled={!canSubmit}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  keyboardView: {
    flex: 1,
  },

  screen: {
    flex: 1,
    position: "relative",
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },

  scrollContentWithKeyboard: {
    paddingBottom: spacing.md,
  },

  topSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  progressBar: {
    flex: 1,
    marginTop: spacing.sm,
  },

  header: {
    position: "relative",
    alignItems: "center",
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },

  star: {
    position: "absolute",
    top: -7,
    left: 5,
    width: 22,
    height: 22,
    transform: [{ rotate: "-8deg" }],
  },

  heart: {
    position: "absolute",
    top: 2,
    right: 16,
    width: 21,
    height: 21,
    transform: [{ rotate: "8deg" }],
  },

  title: {
    width: "100%",
    maxWidth: 355,
    color: colors.textPrimary,
    fontFamily: "Lora_700Bold",
    fontSize: 29,
    lineHeight: 40,
    textAlign: "center",
    letterSpacing: -0.5,
  },

  description: {
    width: "100%",
    maxWidth: 350,
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },

  form: {
    marginTop: spacing.xxl,
  },

  landscapeContainer: {
    flex: 1,
    minHeight: 170,
    justifyContent: "flex-end",
    marginHorizontal: -spacing.lg,
    marginTop: spacing.xxl,
  },

  landscape: {
    width: "100%",
    height: 130,
    marginBottom: -12,
    opacity: 0.9,
  },

  footer: {
    zIndex: 2,
    backgroundColor: "transparent",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },

  landscapeBackground: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    width: "100%",
    height: 165,
    opacity: 0.9,
    zIndex: 0,
  },
});
