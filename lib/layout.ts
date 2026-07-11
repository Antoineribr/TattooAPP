import { Platform, useWindowDimensions } from "react-native";

export const PHONE_MAX_WIDTH = 430;
export const PHONE_MAX_HEIGHT = 764;
const PHONE_ASPECT_RATIO = 9 / 16;
const DESKTOP_BREAKPOINT = 700;

type WindowSize = {
  width: number;
  height: number;
};

export function getAppViewport({ width, height }: WindowSize) {
  const isDesktopWeb = Platform.OS === "web" && width >= DESKTOP_BREAKPOINT;

  if (!isDesktopWeb) {
    return { width, height, isDesktopWeb };
  }

  const appHeight = Math.min(height, PHONE_MAX_HEIGHT);
  const appWidth = Math.min(PHONE_MAX_WIDTH, appHeight * PHONE_ASPECT_RATIO);

  return { width: appWidth, height: appHeight, isDesktopWeb };
}

export function useAppViewport() {
  return getAppViewport(useWindowDimensions());
}
