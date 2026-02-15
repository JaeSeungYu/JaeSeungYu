import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import {
  getSetting,
  getConsulatesByCountry,
  getEmergencyContacts,
  deleteEmergencyContact,
  setSetting,
} from "../../src/db/database";
import { EmergencyContact } from "../../src/types";
import { countryCodeToFlag } from "../../src/utils/countryFlag";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const safeBottom =
    Platform.OS === "android" ? Math.max(insets.bottom, 48) : insets.bottom;

  const [countryCode, setCountryCode] = useState<string>("");
  const [countryName, setCountryName] = useState<string>("");
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");

  const loadData = useCallback(async () => {
    const code = await getSetting("selected_country");
    if (code) {
      setCountryCode(code);
      const results = await getConsulatesByCountry(code);
      if (results.length > 0) {
        setCountryName(results[0].country_name_ko);
      }
    } else {
      setCountryCode("");
      setCountryName("");
    }

    const savedContacts = await getEmergencyContacts();
    setContacts(savedContacts);

    const savedName = await getSetting("user_name");
    if (savedName) setUserName(savedName);

    const savedPhone = await getSetting("user_phone");
    if (savedPhone) setUserPhone(savedPhone);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDeleteContact = (contact: EmergencyContact) => {
    Alert.alert(
      "삭제 확인",
      `${contact.name}님을 비상연락처에서 삭제하시겠습니까?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            await deleteEmergencyContact(contact.id);
            loadData();
          },
        },
      ]
    );
  };

  const handleSaveUserName = async () => {
    if (userName.trim()) {
      await setSetting("user_name", userName.trim());
      Alert.alert("저장 완료", "이름이 저장되었습니다.");
    }
  };

  const handleSaveUserPhone = async () => {
    if (userPhone.trim()) {
      await setSetting("user_phone", userPhone.trim());
      Alert.alert("저장 완료", "휴대폰번호가 저장되었습니다.");
    }
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: 40 + safeBottom }]}
      data={contacts}
      keyExtractor={(item) => item.id.toString()}
      ListHeaderComponent={
        <>
          {/* 사용자 이름 */}
          <Text style={styles.sectionTitle}>내 정보</Text>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>이름</Text>
            <View style={styles.nameRow}>
              <TextInput
                style={styles.nameInput}
                placeholder="이름을 입력하세요"
                value={userName}
                onChangeText={setUserName}
                onBlur={handleSaveUserName}
              />
            </View>
            <View style={styles.fieldDivider} />
            <Text style={styles.cardLabel}>휴대폰번호</Text>
            <View style={styles.nameRow}>
              <TextInput
                style={styles.nameInput}
                placeholder="010-0000-0000"
                value={userPhone}
                onChangeText={setUserPhone}
                onBlur={handleSaveUserPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* 여행 국가 */}
          <Text style={styles.sectionTitle}>여행 국가</Text>
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/country-select")}
          >
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.cardLabel}>현재 여행 국가</Text>
                <Text style={styles.cardValue}>
                  {countryCode ? countryCodeToFlag(countryCode) + " " : ""}
                  {countryName || "선택하세요"}
                </Text>
              </View>
              <Text style={styles.cardArrow}>›</Text>
            </View>
          </TouchableOpacity>

          {/* 비상연락처 */}
          <View style={styles.contactHeader}>
            <Text style={styles.sectionTitle}>비상연락처</Text>
            <Text style={styles.contactCount}>{contacts.length}/5명</Text>
          </View>

          {contacts.length < 5 && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push("/add-contact")}
            >
              <Text style={styles.addButtonText}>+ 비상연락처 추가</Text>
            </TouchableOpacity>
          )}
        </>
      }
      renderItem={({ item }) => (
        <View style={styles.contactCard}>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>{item.name}</Text>
            <Text style={styles.contactRelation}>{item.relationship}</Text>
            <Text style={styles.contactPhone}>{item.phone}</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteContact(item)}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteText}>삭제</Text>
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyContact}>
          <Text style={styles.emptyContactText}>
            등록된 비상연락처가 없습니다.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
    marginTop: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  cardArrow: {
    fontSize: 28,
    color: "#9CA3AF",
    fontWeight: "300",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  nameInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: "#1F2937",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 4,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  contactHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contactCount: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 16,
  },
  addButton: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderStyle: "dashed",
    marginBottom: 8,
  },
  addButtonText: {
    color: "#2563EB",
    fontSize: 15,
    fontWeight: "600",
  },
  contactCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  contactRelation: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: "#4B5563",
    marginTop: 4,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
  },
  deleteText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyContact: {
    padding: 20,
    alignItems: "center",
  },
  emptyContactText: {
    color: "#9CA3AF",
    fontSize: 14,
  },
});
