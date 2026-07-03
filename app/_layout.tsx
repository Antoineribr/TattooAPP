import "../global.css";
import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { toggleLike, toggleSave, toggleFollow } from "@/lib/api";
import { registerForPushNotifications, usePushNotificationResponseListener } from "@/lib/notifications";
import { useRef, useEffect as useEff } from "react";
import * as Notifications from "expo-notifications";

const PROTECTED_SEGMENTS = ["(onboarding)", "edit", "chat", "project", "board"];

export default function RootLayout() {
  const { session, setSession, setProfile, clear } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { clear(); return; }
    supabase.from("profiles").select("*").eq("id", session.user.id).single()
      .then(({ data }) => { if (data) setProfile(data as any); });
  }, [session]);

  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === "(auth)";
    const inProtected = PROTECTED_SEGMENTS.some((r) => (segments as string[]).includes(r));
    if (session && inAuthGroup) {
      // Exécuter la pending action si elle existe
      const { pendingAction, setPendingAction } = useAuthStore.getState();
      if (pendingAction) {
        setPendingAction(null);
        setTimeout(async () => {
          if (pendingAction.type === "save") {
            await toggleSave(pendingAction.postId, session.user.id, false);
          } else if (pendingAction.type === "follow") {
            await toggleFollow(pendingAction.artistId, session.user.id, false);
          } else if (pendingAction.type === "project") {
            router.replace("/(tabs)");
            setTimeout(() => {
              router.push({ pathname: "/project/request", params: {
                artistId: pendingAction.artistId,
                artistName: pendingAction.artistName,
                postId: pendingAction.postId ?? "",
                postImage: pendingAction.postImage ?? "",
              }});
            }, 300);
            return;
          } else if (pendingAction.type === "navigate") {
            router.replace("/(tabs)");
            setTimeout(() => router.push(pendingAction.href as any), 300);
            return;
          }
          router.replace("/(tabs)");
        }, 100);
        return;
      }
      router.replace("/(tabs)");
      return;
    }
    if (!session && inProtected) { router.replace("/(auth)/sign-in"); }
  }, [ready, session, segments]);

  // Push notifications — demander permission quand connecté
  useEff(() => {
    if (!session) return;
    registerForPushNotifications(session.user.id).catch(() => {});
  }, [session?.user.id]);

  // Gérer le tap sur une notification (app ouverte en background)
  const responseListener = useRef<any>(null);
  useEff(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (data?.type === "message" || data?.type === "project_request") {
        router.push("/(tabs)/messages");
      } else if (data?.postId) {
        router.push(`/post/${data.postId}`);
      } else if (data?.type === "follow") {
        router.push("/notifications");
      }
    });
    return () => responseListener.current?.remove?.();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)/sign-in" />
        <Stack.Screen name="(auth)/sign-up" />
        <Stack.Screen name="(onboarding)/role" />
        <Stack.Screen name="(onboarding)/styles" />
        <Stack.Screen name="(onboarding)/artist-setup" />
        <Stack.Screen name="profile/[id]" />
        <Stack.Screen name="post/[id]" />
        <Stack.Screen name="chat/[conversationId]" />
        <Stack.Screen name="edit/profile" />
        <Stack.Screen name="project/request" options={{ presentation: "modal" }} />
        <Stack.Screen name="board/[id]" />
        <Stack.Screen name="stats" />
        <Stack.Screen name="admin/index" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="pro/locations" />
        <Stack.Screen name="pro/availability" />
        <Stack.Screen name="pro/post-actions/[postId]" />
      </Stack>
    </>
  );
}
