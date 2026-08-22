import { View, Text, StyleSheet, Image } from "react-native";
import { colors } from "../../constants/colors";
import { BrandGradient } from "./BrandGradient";

interface AvatarProps {
  name: string;
  uri?: string;
  size?: number;
}

/**
 * Avatar — shows ONLY the name-derived initial in a signature gradient circle.
 * Never a photo-upload teaser (identity redesign §5): if there's no editable
 * photo yet, there is no "change photo / coming soon" affordance at all.
 */
export function Avatar({ name, uri, size = 40 }: AvatarProps) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <BrandGradient style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]} rounded={size / 2}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </BrandGradient>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.border },
  circle: {
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { color: "#FFFFFF", fontWeight: "800" },
});