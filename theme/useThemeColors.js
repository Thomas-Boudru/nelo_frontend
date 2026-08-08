import { useSelector } from "react-redux";

import { colorThemes, commonColors } from "./colors.js";

export function useThemeColors() {
  const themeMode = useSelector((state) => state.theme.mode);

  const selectedTheme = colorThemes[themeMode] ?? colorThemes.blue;

  return {
    ...commonColors,
    ...selectedTheme,
  };
}
