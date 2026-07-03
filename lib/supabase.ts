import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const supabaseUrl =
  (Constants.expoConfig?.extra?.supabaseUrl as string) ?? "https://placeholder.supabase.co";
const supabaseAnonKey =
  (Constants.expoConfig?.extra?.supabaseAnonKey as string) ?? "placeholder-key";

if (supabaseUrl === "https://placeholder.supabase.co") {
  console.warn("[supabase] No .env.local — running in placeholder mode (étape 2)");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
