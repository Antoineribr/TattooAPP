import { View, Text } from "react-native";
import { Image } from "expo-image";

interface Props {
  uri?: string | null;
  name: string;
  size?: number;
}

export function Avatar({ uri, name, size = 40 }: Props) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: size, height: size, borderRadius: size / 2,
          borderWidth: 1.5, borderColor: "rgba(184,144,62,0.3)",
        }}
        contentFit="cover"
      />
    );
  }

  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: "rgba(0,0,0,0.06)",
      borderWidth: 1.5, borderColor: "rgba(184,144,62,0.3)",
      alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ color: "#B8903E", fontWeight: "700", fontSize: size * 0.35 }}>{initials}</Text>
    </View>
  );
}
