import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// La clé anon est publique par design (protégée par RLS)
const supabaseUrl = "https://noeexgwelfrpixnmqmrp.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vZWV4Z3dlbGZycGl4bm1xbXJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMzgyNzYsImV4cCI6MjA5NzcxNDI3Nn0.-L0QsNaoBjEmg8HXz3GqeleHs3mThy2TAKEODa1FOA8";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
