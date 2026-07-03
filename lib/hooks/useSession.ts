import { useEffect } from "react";
import { supabase } from "../supabase";
import { useAuthStore } from "@/store/useAuthStore";

export function useSession() {
  const { session, profile, setSession, setProfile, clear } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return { session, profile };
}
