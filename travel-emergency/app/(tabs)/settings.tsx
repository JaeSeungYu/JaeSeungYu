import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
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
import {
  syncProfileToServer,
  syncContactsToServer,
  syncLocationToServer,
} from "../../src/services/cloudSync";

export default function SettingsScreen() {
  const [countryCode, setCountryCode] = useState<string>("");
  const [countryName, setCountryName] = useState<string>("");
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  // GPS 위치 상태
  const [gpsLatitude, setGpsLatitude] = useState<string | null>(null);
  const [gpsLongitude, setGpsLongitude] = useState<string | null>(null);
  const [gpsUpdatedAt, setGpsUpdatedAt] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  // 서버 동기화 상태
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

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

    // GPS 정보 로드
    const lat = await getSetting("gps_latitude");
    const lng = await getSetting("gps_longitude");
    const gpsTime = await getSetting("gps_updated_at");
    setGpsLatitude(lat);
    setGpsLongitude(lng);
    setGpsUpdatedAt(gpsTime);

    // 마지막 동기화 시간 로드
    const syncTime = await getSetting("last_synced_at");
    setLastSyncedAt(syncTime);
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
            await syncContactsToServer();
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

  /** GPS 위치 가져오기 */
  const handleGetLocation = async () => {
    setGpsLoading(true);
    try {
      // expo-location 동적 import (설치되지 않은 경우 대비)
      let Location: any;
      try {
        Location = require("expo-location");
      } catch {
        Alert.alert(
          "위치 서비스",
          "위치 서비스를 사용하려면 expo-location 패키지가 필요합니다."
        );
        setGpsLoading(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("권한 필요", "위치 정보 접근 권한을 허용해주세요.");
        setGpsLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const lat = location.coords.latitude.toString();
      const lng = location.coords.longitude.toString();
      const now = new Date().toISOString();

      // 로컬 저장
      await setSetting("gps_latitude", lat);
      await setSetting("gps_longitude", lng);
      await setSetting("gps_updated_at", now);

      setGpsLatitude(lat);
      setGpsLongitude(lng);
      setGpsUpdatedAt(now);

      // 서버에 위치 동기화
      await syncLocationToServer(parseFloat(lat), parseFloat(lng));

      Alert.alert("위치 저장 완료", "현재 GPS 위치가 저장되었습니다.");
    } catch (error) {
      Alert.alert("위치 오류", "위치 정보를 가져오는데 실패했습니다.");
    } finally {
      setGpsLoading(false);
    }
  };

  /** 전체 프로필 서버 동기화 */
  const handleSyncToServer = async () => {
    if (!userName.trim() || !userPhone.trim()) {
      Alert.alert("입력 필요", "이름과 휴대폰번호를 먼저 입력해주세요.");
      return;
    }

    setSyncing(true);
    try {
      const result = await syncProfileToServer();
      if (result.success) {
        setLastSyncedAt(result.synced_at || new Date().toISOString());
        Alert.alert("동기화 완료", "서버에 정보가 저장되었습니다.");
      } else {
        Alert.alert("동기화 실패", result.message);
      }
    } catch {
      Alert.alert("동기화 실패", "네트워크 연결을 확인해주세요.");
    } finally {
      setSyncing(false);
    }
  };

  /** 동기화 시간 포맷 */
  const formatSyncTime = (isoString: string | null): string => {
    if (!isoString) return "동기화 기록 없음";
    try {
      const date = new Date(isoString);
      return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    } catch {
      return "동기화 기록 없음";
    }
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
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

          {/* GPS 위치 정보 */}
          <Text style={styles.sectionTitle}>GPS 위치 정보</Text>
          <View style={styles.card}>
            <Text style={styles.gpsDescription}>
              긴급 상황 시 정확한 위치 파악을 위해{"\n"}현재 위치를 저장해주세요.
            </Text>
            {gpsLatitude && gpsLongitude ? (
              <View style={styles.gpsInfo}>
                <Text style={styles.gpsCoord}>
                  위도: {parseFloat(gpsLatitude).toFixed(6)}
                </Text>
                <Text style={styles.gpsCoord}>
                  경도: {parseFloat(gpsLongitude).toFixed(6)}
                </Text>
                {gpsUpdatedAt && (
                  <Text style={styles.gpsTime}>
                    갱신: {formatSyncTime(gpsUpdatedAt)}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={styles.gpsEmpty}>저장된 위치 정보 없음</Text>
            )}
            <TouchableOpacity
              style={styles.gpsButton}
              onPress={handleGetLocation}
              disabled={gpsLoading}
            >
              {gpsLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.gpsButtonText}>
                  {gpsLatitude ? "위치 다시 가져오기" : "현재 위치 가져오기"}
                </Text>
              )}
            </TouchableOpacity>
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
      ListFooterComponent={
        <>
          {/* 서버 동기화 */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            서버 동기화
          </Text>
          <View style={styles.card}>
            <Text style={styles.syncDescription}>
              이름, 휴대폰번호, 여행국가, 비상연락처, GPS 위치 정보를{"\n"}
              당사 서버에 저장합니다.
            </Text>
            <Text style={styles.syncSubDescription}>
              긴급 상황 시 전화발신 번호로 이용자를 확인하고{"\n"}
              비상연락처에 알림톡을 발송하는 데 사용됩니다.
            </Text>
            <View style={styles.syncStatusRow}>
              <Text style={styles.syncStatusLabel}>마지막 동기화:</Text>
              <Text style={styles.syncStatusValue}>
                {formatSyncTime(lastSyncedAt)}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.syncButton,
                syncing && styles.syncButtonDisabled,
              ]}
              onPress={handleSyncToServer}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.syncButtonText}>서버에 정보 동기화</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
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
    paddingBottom: 40,
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
  // GPS 위치 스타일
  gpsDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  gpsInfo: {
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  gpsCoord: {
    fontSize: 14,
    color: "#166534",
    fontWeight: "600",
    marginBottom: 2,
  },
  gpsTime: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  gpsEmpty: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    paddingVertical: 12,
  },
  gpsButton: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  gpsButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  // 서버 동기화 스타일
  syncDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 4,
  },
  syncSubDescription: {
    fontSize: 12,
    color: "#9CA3AF",
    lineHeight: 18,
    marginBottom: 12,
  },
  syncStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    marginBottom: 12,
  },
  syncStatusLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  syncStatusValue: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
  },
  syncButton: {
    backgroundColor: "#059669",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  syncButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  syncButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
