import { View, Text } from "react-native";

interface Props {
  label: string;
  gold?: boolean;
}

export function Tag({ label, gold }: Props) {
  return (
    <View style={{
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      backgroundColor: gold ? "rgba(201,162,75,0.18)" : "rgba(244,241,234,0.1)",
      borderWidth: 1,
      borderColor: gold ? "rgba(201,162,75,0.5)" : "rgba(244,241,234,0.15)",
    }}>
      <Text style={{
        color: gold ? "#B8903E" : "#FFFFFF",
        fontSize: 11,
        fontWeight: "600",
        letterSpacing: 0.3,
      }}>{label}</Text>
    </View>
  );
}
