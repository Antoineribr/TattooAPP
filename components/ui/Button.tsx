import { TouchableOpacity, Text, ActivityIndicator } from "react-native";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost";
  loading?: boolean;
  disabled?: boolean;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
}: ButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={[
        "h-12 rounded-xl items-center justify-center px-6",
        isPrimary ? "bg-gold" : "border border-muted",
        disabled || loading ? "opacity-50" : "",
      ].join(" ")}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? "#F5F3EE" : "#B8903E"} />
      ) : (
        <Text
          className={[
            "text-base font-semibold",
            isPrimary ? "text-ink" : "text-bone",
          ].join(" ")}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
