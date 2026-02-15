import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  Alert,
} from "react-native";
import * as Linking from "expo-linking";

interface Props {
  label: string;
  subLabel?: string;
  phone: string;
  color: string;
  style?: ViewStyle;
}

export function EmergencyButton({ label, subLabel, phone, color, style }: Props) {
  const handlePress = () => {
    const cleanPhone = phone.replace(/[^+\d]/g, "");
    const url = `tel:${cleanPhone}`;

    Alert.alert(
      "전화 연결",
      `${label}\n${phone}\n\n전화를 연결하시겠습니까?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "전화 걸기",
          style: "default",
          onPress: () => {
            Linking.openURL(url);
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: color }, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={styles.label}>{label}</Text>
      {subLabel && <Text style={styles.subLabel}>{subLabel}</Text>}
      <Text style={styles.phone}>{phone}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 140,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  label: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  subLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 8,
  },
  phone: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
