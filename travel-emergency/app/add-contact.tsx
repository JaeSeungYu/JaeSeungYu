import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { addEmergencyContact, getEmergencyContacts } from "../src/db/database";

const RELATIONSHIPS = ["배우자", "부모", "자녀", "형제/자매", "친구", "기타"];

export default function AddContactScreen() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("입력 오류", "이름을 입력해주세요.");
      return;
    }
    if (!phone.trim()) {
      Alert.alert("입력 오류", "전화번호를 입력해주세요.");
      return;
    }
    if (!relationship) {
      Alert.alert("입력 오류", "관계를 선택해주세요.");
      return;
    }

    const existing = await getEmergencyContacts();
    if (existing.length >= 5) {
      Alert.alert("등록 제한", "비상연락처는 최대 5명까지 등록 가능합니다.");
      return;
    }

    await addEmergencyContact(name.trim(), phone.trim(), relationship);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>이름</Text>
        <TextInput
          style={styles.input}
          placeholder="이름을 입력하세요"
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <Text style={styles.label}>전화번호</Text>
        <TextInput
          style={styles.input}
          placeholder="01012345678"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>관계</Text>
        <View style={styles.chipContainer}>
          {RELATIONSHIPS.map((rel) => (
            <TouchableOpacity
              key={rel}
              style={[
                styles.chip,
                relationship === rel && styles.chipSelected,
              ]}
              onPress={() => setRelationship(rel)}
            >
              <Text
                style={[
                  styles.chipText,
                  relationship === rel && styles.chipTextSelected,
                ]}
              >
                {rel}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>저장</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chipSelected: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },
  chipText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "#fff",
  },
  saveButton: {
    backgroundColor: "#DC2626",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 32,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
