import { useEffect, useRef, useState } from "react";
import { Alert, Keyboard } from "react-native";
import { useTranslation } from "react-i18next";

export default function useCustomProductActions({
  onSave,
  onArchive,
  onSaved,
  onArchived,
  deleteTitle,
  deleteDescription,
}) {
  const { t } = useTranslation();

  const [isSaving, setIsSaving] = useState(false);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runOperation = async (operation, onSuccess, errorTitle) => {
    if (busyRef.current || !mountedRef.current) {
      return;
    }

    busyRef.current = true;
    setIsSaving(true);

    let savedProduct;

    try {
      savedProduct = await operation();

      if (!savedProduct?.id || savedProduct.persistedLocally !== true) {
        throw new Error("Missing locally persisted custom product.");
      }
    } catch (error) {
      console.warn("Unable to persist custom product:", error);

      if (mountedRef.current) {
        Alert.alert(
          t(errorTitle),
          error?.code === "CUSTOM_PRODUCT_NAME_CONFLICT"
            ? t("A product with this name already exists.")
            : t("The change could not be saved. Please try again."),
        );
      }

      busyRef.current = false;

      if (mountedRef.current) {
        setIsSaving(false);
      }

      return;
    }

    // L'écriture SQLite est terminée. Une erreur d'affichage
    // ne doit pas être présentée comme un échec de sauvegarde.
    try {
      if (mountedRef.current) {
        await onSuccess?.(savedProduct);
      }
    } catch (error) {
      console.warn("Custom product saved, but UI update failed:", error);
    } finally {
      busyRef.current = false;

      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  const saveProduct = async (product) => {
    const name = product?.name?.trim().replace(/\s+/g, " ");

    if (!name || name.length > 150) {
      Alert.alert(
        t("Unable to save"),
        t("The product name must contain between 1 and 150 characters."),
      );
      return;
    }

    await runOperation(
      () => {
        if (typeof onSave !== "function") {
          throw new Error("Missing custom product save handler.");
        }

        return onSave({
          ...product,
          name,
        });
      },
      onSaved,
      "Unable to save",
    );
  };

  const confirmArchive = (product) => {
    if (!product?.id || busyRef.current || !mountedRef.current) {
      return;
    }

    Keyboard.dismiss();

    Alert.alert(t(deleteTitle), t(deleteDescription), [
      {
        text: t("Cancel"),
        style: "cancel",
      },
      {
        text: t("Delete"),
        style: "destructive",
        onPress: () => {
          void runOperation(
            () => {
              if (typeof onArchive !== "function") {
                throw new Error("Missing custom product archive handler.");
              }

              return onArchive(product);
            },
            onArchived,
            "Unable to delete",
          );
        },
      },
    ]);
  };

  return {
    isSaving,
    busyRef,
    saveProduct,
    confirmArchive,
  };
}
