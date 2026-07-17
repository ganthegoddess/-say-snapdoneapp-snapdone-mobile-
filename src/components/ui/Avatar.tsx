import { View, Text, StyleSheet, Image } from "react-native";
import { colors } from "../../constants/colors";

interface AvatarProps {
  name: string;
  uri?: string;
  size?: number;
}

export function Avatar({ name, uri, size = 40 }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.border },
  placeholder: {
    backgroundColor: colors.brand.light,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { color: colors.brand.dark, fontWeight: "700" },
});