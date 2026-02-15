import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import * as Linking from "expo-linking";
import { EmergencyButton } from "../../src/components/EmergencyButton";
import { getConsulatesByCountry, getSetting, getEmergencyContacts } from "../../src/db/database";
import { CONSULAR_CALL_CENTER } from "../../src/constants/consulates";
import { Consulate, EmergencyContact } from "../../src/types";

export default function EmergencyScreen() {
  const [consulate, setConsulate] = useState<Consulate | null>(null);
  const [countryName, setCountryName] = useState<string>("");
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const code = await getSetting("selected_country");
      if (code) {
        const results = await getConsulatesByCountry(code);
        if (results.length > 0) {
          setConsulate(results[0]);
          setCountryName(results[0].country_name_ko);
        }
      } else {
        setConsulate(null);
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
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadData} />
      }
    >
      <View style={styles.countryBanner}>
        <Text style={styles.countryLabel}>현재 여행 국가</Text>
        <Text style={styles.countryName}>{countryName}</Text>
      </View>

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
    paddingBottom: 40,
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
  countryName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#DC2626",
    marginTop: 4,
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
});
