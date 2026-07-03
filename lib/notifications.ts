import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  const perms = await Notifications.getPermissionsAsync() as any;
  let ok: boolean = perms.granted ?? perms.status === "granted";
  if (!ok) {
    const result = await Notifications.requestPermissionsAsync() as any;
    ok = result.granted ?? result.status === "granted";
  }
  if (!ok) return null;

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: "ink-tattoo-app", // remplacer par ton EAS projectId si tu as EAS configuré
  })).data;

  // Sauvegarder le token en base
  await supabase.from("profiles").update({ push_token: token } as any).eq("id", userId);

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return token;
}

export function usePushNotificationListener(onNotification: (n: Notifications.Notification) => void) {
  return Notifications.addNotificationReceivedListener(onNotification);
}

export function usePushNotificationResponseListener(onResponse: (r: Notifications.NotificationResponse) => void) {
  return Notifications.addNotificationResponseReceivedListener(onResponse);
}
