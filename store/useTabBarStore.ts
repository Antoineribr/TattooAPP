import { create } from "zustand";
import { Platform } from "react-native";

interface TabBarStore {
  visible: boolean;
  setVisible: (v: boolean) => void;
  muted: boolean;
  setMuted: (v: boolean) => void;
}

export const useTabBarStore = create<TabBarStore>((set) => ({
  visible: true,
  setVisible: (visible) => set({ visible }),
  // Sur web, les navigateurs bloquent l'autoplay avec son : on démarre muet
  muted: Platform.OS === "web",
  setMuted: (muted) => set({ muted }),
}));
