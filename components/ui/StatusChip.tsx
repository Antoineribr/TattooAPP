import { View, Text } from "react-native";
import { ProjectStatus, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from "@/types/database";

interface Props {
  status: ProjectStatus;
  small?: boolean;
}

export function StatusChip({ status, small }: Props) {
  const color = PROJECT_STATUS_COLORS[status] ?? "#6B6B7A";
  const label = PROJECT_STATUS_LABELS[status] ?? status;
  const pad = small ? { paddingHorizontal: 8, paddingVertical: 3 } : { paddingHorizontal: 10, paddingVertical: 5 };
  const fs = small ? 10 : 12;

  return (
    <View style={{
      ...pad, borderRadius: 20, borderWidth: 1,
      backgroundColor: `${color}18`,
      borderColor: `${color}50`,
      alignSelf: "flex-start",
    }}>
      <Text style={{ color, fontSize: fs, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}
