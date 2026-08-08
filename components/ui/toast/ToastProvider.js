import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import ToastMessage from "./ToastMessage";

export const ToastContext = createContext(null);

const DEFAULT_DURATION = 3500;

export default function ToastProvider({ children }) {
  const timeoutRef = useRef(null);

  const [toast, setToast] = useState({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  const clearToastTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    clearToastTimeout();

    setToast((currentToast) => ({
      ...currentToast,
      visible: false,
    }));
  }, [clearToastTimeout]);

  const showToast = useCallback(
    ({
      type = "info",
      title = "",
      message = "",
      duration = DEFAULT_DURATION,
    }) => {
      clearToastTimeout();

      setToast({
        visible: true,
        type,
        title,
        message,
      });

      timeoutRef.current = setTimeout(() => {
        setToast((currentToast) => ({
          ...currentToast,
          visible: false,
        }));

        timeoutRef.current = null;
      }, duration);
    },
    [clearToastTimeout],
  );

  useEffect(() => {
    return () => {
      clearToastTimeout();
    };
  }, [clearToastTimeout]);

  const contextValue = useMemo(
    () => ({
      showToast,
      hideToast,
    }),
    [showToast, hideToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      <ToastMessage
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={hideToast}
      />
    </ToastContext.Provider>
  );
}
