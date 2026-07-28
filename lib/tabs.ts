export type TabDef = {
  route: string;
  label: string;
  icon: string;
  iconActive: string;
  isPlus?: boolean;
};

export const CLIENT_TABS: TabDef[] = [
  { route: "/", label: "Feed", icon: "play-circle-outline", iconActive: "play-circle" },
  { route: "/search", label: "Recherche", icon: "search-outline", iconActive: "search" },
  { route: "/board", label: "Boards", icon: "bookmark-outline", iconActive: "bookmark" },
  { route: "/messages", label: "Messages", icon: "chatbubble-outline", iconActive: "chatbubble" },
  { route: "/profile", label: "Profil", icon: "person-outline", iconActive: "person" },
];

export const ARTIST_TABS: TabDef[] = [
  { route: "/", label: "Feed", icon: "play-circle-outline", iconActive: "play-circle" },
  { route: "/publish", label: "Publier", icon: "add-circle-outline", iconActive: "add-circle", isPlus: true },
  { route: "/messages", label: "Messages", icon: "chatbubble-outline", iconActive: "chatbubble" },
  { route: "/search", label: "Statistiques", icon: "bar-chart-outline", iconActive: "bar-chart" },
  { route: "/profile", label: "Profil", icon: "person-outline", iconActive: "person" },
];
