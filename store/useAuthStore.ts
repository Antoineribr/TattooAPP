import { create } from "zustand";
import { Session } from "@supabase/supabase-js";
import { Profile } from "@/types/database";

export type PendingAction =
  | { type: "save"; postId: string }
  | { type: "follow"; artistId: string }
  | { type: "project"; artistId: string; artistName: string; postId?: string; postImage?: string }
  | { type: "navigate"; href: string };

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  pendingAction: PendingAction | null;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setPendingAction: (action: PendingAction | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  pendingAction: null,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setPendingAction: (pendingAction) => set({ pendingAction }),
  clear: () => set({ session: null, profile: null, pendingAction: null }),
}));
