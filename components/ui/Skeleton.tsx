import { useEffect, useRef } from "react";
import { Animated, View, ViewStyle } from "react-native";

interface Props {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = "100%", height = 16, radius = 8, style }: Props) {
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[{ width: width as any, height, borderRadius: radius, backgroundColor: "rgba(0,0,0,0.07)", opacity: anim }, style]} />
  );
}

export function SkeletonCard() {
  return (
    <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, gap: 10, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.06)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Skeleton width={44} height={44} radius={22} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={11} />
        </View>
      </View>
      <Skeleton height={12} />
      <Skeleton width="80%" height={12} />
    </View>
  );
}

export function SkeletonPost() {
  return (
    <View style={{ gap: 4 }}>
      <Skeleton height={220} radius={12} />
      <Skeleton width="70%" height={12} radius={6} style={{ marginTop: 4 }} />
      <Skeleton width="50%" height={10} radius={6} />
    </View>
  );
}
