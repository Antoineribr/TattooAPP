import { View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
}

export function GlassCard({ children, style, intensity = 60 }: Props) {
  return (
    <BlurView
      intensity={intensity}
      tint="light"
      style={[{
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 0.5,
        borderColor: "rgba(0,0,0,0.08)",
      }, style]}
    >
      <View style={{ backgroundColor: "rgba(255,255,255,0.55)", flex: 1 }}>
        {children}
      </View>
    </BlurView>
  );
}
