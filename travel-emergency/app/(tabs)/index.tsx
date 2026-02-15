import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import * as Linking from "expo-linking";
import { EmergencyButton } from "../../src/components/EmergencyButton";
import { getConsulatesByCountry, getSetting, getEmergencyContacts } from "../../src/db/database";
import { CONSULAR_CALL_CENTER } from "../../src/constants/consulates";
import { TRAVEL_ADVISORIES } from "../../src/constants/travelAdvisories";
import { Consulate, EmergencyContact } from "../../src/types";
import { countryCodeToFlag } from "../../src/utils/countryFlag";

export default function EmergencyScreen() {
  const insets = useSafeAreaInsets();
  const safeBottom =
    Platform.OS === "android" ? Math.max(insets.bottom, 48) : insets.bottom;

  const [consulate, setConsulate] = useState<Consulate | null>(null);
  const [countryCode, setCountryCode] = useState<string>("");
  const [countryName, setCountryName] = useState<string>("");
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [advisoryVisible, setAdvisoryVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const code = await getSetting("selected_country");
      if (code) {
        const results = await getConsulatesByCountry(code);
        if (results.length > 0) {
          setConsulate(results[0]);
          setCountryCode(code);
          setCountryName(results[0].country_name_ko);
        }
      } else {
        setConsulate(null);
        setCountryCode("");
        setCountryName("");
      }
      const savedContacts = await getEmergencyContacts();
      setContacts(savedContacts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAlimtalk = async () => {
    if (contacts.length === 0) {
      Alert.alert("알림", "설정에서 비상연락처를 먼저 등록해주세요.");
      return;
    }
    Alert.alert(
      "긴급 알림 발송",
      `등록된 ${contacts.length}명의 비상연락처에\n긴급 알림을 보내시겠습니까?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "발송",
          style: "destructive",
          onPress: () => {
            Alert.alert("발송 완료", "긴급 알림이 발송되었습니다.\n(서버 연동 후 실제 발송됩니다)");
          },
        },
      ]
    );
  };

  if (!consulate) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🌏</Text>
        <Text style={styles.emptyTitle}>여행 국가를 설정해주세요</Text>
        <Text style={styles.emptyDesc}>
          설정 탭에서 현재 여행 중인 국가를{"\n"}선택하면 긴급 연락 버튼이 활성화됩니다.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: 40 + safeBottom }]}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadData} />
      }
    >
      <View style={styles.countryBanner}>
        <Text style={styles.countryLabel}>현재 여행 국가</Text>
        <View style={styles.countryNameRow}>
          <Text style={styles.countryName}>
            {countryCode ? countryCodeToFlag(countryCode) + " " : ""}
            {countryName}
          </Text>
          {countryCode && TRAVEL_ADVISORIES[countryCode] && (
            <TouchableOpacity
              style={styles.advisoryButton}
              onPress={() => setAdvisoryVisible(true)}
            >
              <Text style={styles.advisoryButtonText}>?</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 주의사항 모달 */}
      <Modal
        visible={advisoryVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAdvisoryVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {countryCode ? countryCodeToFlag(countryCode) + " " : ""}
              {TRAVEL_ADVISORIES[countryCode]?.title ?? "주의사항"}
            </Text>
            <FlatList
              data={TRAVEL_ADVISORIES[countryCode]?.items ?? []}
              keyExtractor={(_, i) => i.toString()}
              renderItem={({ item, index }) => (
                <View style={styles.advisoryItem}>
                  <Text style={styles.advisoryBullet}>{index + 1}</Text>
                  <Text style={styles.advisoryText}>{item}</Text>
                </View>
              )}
              style={styles.advisoryList}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setAdvisoryVisible(false)}
            >
              <Text style={styles.modalCloseText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.buttonsContainer}>
        <EmergencyButton
          label="영사관 긴급 전화"
          subLabel={consulate.name}
          phone={consulate.emergency_phone || consulate.phone}
          color="#DC2626"
        />

        <EmergencyButton
          label="당사 콜센터 연결"
          subLabel="긴급 접수 및 지원"
          phone="1588-0404"
          color="#1D4ED8"
          style={{ marginTop: 16 }}
        />
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>외교부 영사콜센터</Text>
        <EmergencyButton
          label="영사콜센터 (24시간)"
          subLabel="외교부 해외 긴급 상담"
          phone={CONSULAR_CALL_CENTER}
          color="#7C3AED"
          style={{ marginTop: 8 }}
        />
      </View>

      <View style={styles.alimtalkSection}>
        <EmergencyButton
          label="긴급 알림 발송"
          subLabel={`비상연락처 ${contacts.length}명에게 알림`}
          phone=""
          color={contacts.length > 0 ? "#EA580C" : "#9CA3AF"}
          style={{ marginTop: 0 }}
        />
      </View>

      <View style={styles.consulateInfo}>
        <Text style={styles.consulateInfoTitle}>영사관 정보</Text>
        <Text style={styles.consulateInfoText}>{consulate.name}</Text>
        <Text style={styles.consulateInfoText}>📞 {consulate.phone}</Text>
        <Text style={styles.consulateInfoText}>📍 {consulate.address}</Text>
      </View>
    </ScrollView>
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
  emptyContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  countryBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  countryLabel: {
    fontSize: 13,
    color: "#991B1B",
    fontWeight: "500",
  },
  countryNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    gap: 8,
  },
  countryName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#DC2626",
  },
  advisoryButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  advisoryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  buttonsContainer: {
    marginBottom: 20,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },
  alimtalkSection: {
    marginBottom: 20,
  },
  consulateInfo: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  consulateInfoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  consulateInfoText: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 4,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 16,
    textAlign: "center",
  },
  advisoryList: {
    marginBottom: 16,
  },
  advisoryItem: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-start",
  },
  advisoryBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 24,
    marginRight: 10,
  },
  advisoryText: {
    flex: 1,
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
  },
  modalCloseButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
  },
});
