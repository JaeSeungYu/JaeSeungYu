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
} from "react-native";
import { useFocusEffect } from "expo-router";
import * as Linking from "expo-linking";
import { EmergencyButton } from "../../src/components/EmergencyButton";
import { getConsulatesByCountry, getSetting, getEmergencyContacts } from "../../src/db/database";
import { CONSULAR_CALL_CENTER } from "../../src/constants/consulates";
import { TRAVEL_ADVISORIES } from "../../src/constants/travelAdvisories";
import { Consulate, EmergencyContact } from "../../src/types";
import { countryCodeToFlag } from "../../src/utils/countryFlag";
import { executeEmergencySOS, requestAlimtalkNotification } from "../../src/services/emergencySos";
import { updateGpsInBackground } from "../../src/services/cloudSync";

export default function EmergencyScreen() {
  const [consulate, setConsulate] = useState<Consulate | null>(null);
  const [countryCode, setCountryCode] = useState<string>("");
  const [countryName, setCountryName] = useState<string>("");
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [advisoryVisible, setAdvisoryVisible] = useState(false);
  const [sosInfoVisible, setSosInfoVisible] = useState(false);

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

  /**
   * 긴급구조신호보내기 핸들러
   *
   * 플로우:
   * 1. 전화발신 (필수) - 인터넷 없어도 동작
   * 2. 당사 서버에 SOS 신호 전송 (필수 시도, 실패 허용)
   *    → 서버 수신 후: 발신번호 캡처 → DB 매칭 → 이용자 확인
   *    → 비상연락망 알림톡 발송 → 경찰신고 등 운영정책 실행
   */
  const handleEmergencySOS = () => {
    Alert.alert(
      "긴급구조신호 발신",
      "1588-0404로 전화를 발신하고\n당사 서버에 구조신호를 전송합니다.\n\n인터넷이 없어도 전화발신은 가능합니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "긴급 발신",
          style: "destructive",
          onPress: async () => {
            // 백그라운드 GPS 업데이트 (데이터 연결 시에만)
            updateGpsInBackground();
            const result = await executeEmergencySOS("1588-0404");

            if (result.serverNotified) {
              // 서버 전송 성공: 전화 + API 모두 완료
              Alert.alert(
                "구조신호 전송 완료",
                "전화발신 및 구조신호가 서버에 접수되었습니다.\n\n당사에서 다음 조치를 진행합니다:\n- 이용자 확인\n- 비상연락처 알림톡 발송\n- 필요 시 경찰신고"
              );
            } else if (result.callInitiated) {
              // 전화만 성공: 서버 전송 실패
              Alert.alert(
                "전화 발신 완료",
                "전화가 발신되었습니다.\n\n서버 전송: " +
                  result.serverMessage +
                  "\n\n전화 발신번호로 이용자 확인이 가능합니다."
              );
            } else {
              // 모두 실패
              Alert.alert(
                "발신 실패",
                "전화 발신에 실패했습니다.\n직접 1588-0404로 전화해주세요."
              );
            }
          },
        },
      ]
    );
  };

  /** 긴급 알림톡 발송 핸들러 */
  const handleAlimtalk = async () => {
    if (contacts.length === 0) {
      Alert.alert("알림", "설정에서 비상연락처를 먼저 등록해주세요.");
      return;
    }
    Alert.alert(
      "긴급 알림 발송",
      `등록된 ${contacts.length}명의 비상연락처에\n긴급 알림을 보내시겠습니까?\n\n알림 내용: 이름, 여행국가, 현재위치, 긴급발생시각`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "발송",
          style: "destructive",
          onPress: async () => {
            // 백그라운드 GPS 업데이트 (데이터 연결 시에만)
            updateGpsInBackground();
            const result = await requestAlimtalkNotification();
            if (result.success) {
              Alert.alert("발송 완료", result.message);
            } else {
              Alert.alert("발송 실패", result.message);
            }
          },
        },
      ]
    );
  };

  /** 영사관 긴급 전화 핸들러 (GPS 업데이트 포함) */
  const handleConsulateCall = () => {
    updateGpsInBackground();
    const phone = consulate?.emergency_phone || consulate?.phone || "";
    const cleanPhone = phone.replace(/[^+\d]/g, "");
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert("오류", "전화 앱을 열 수 없습니다.");
    });
  };

  /** 영사콜센터 전화 핸들러 (GPS 업데이트 포함) */
  const handleConsularCallCenter = () => {
    updateGpsInBackground();
    const cleanPhone = CONSULAR_CALL_CENTER.replace(/[^+\d]/g, "");
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert("오류", "전화 앱을 열 수 없습니다.");
    });
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

      {/* 긴급구조신호 추가정보 모달 */}
      <Modal
        visible={sosInfoVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setSosInfoVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>긴급구조신호 안내</Text>
            <View style={styles.sosInfoList}>
              <View style={styles.sosInfoItem}>
                <Text style={styles.sosInfoBullet}>•</Text>
                <Text style={styles.sosInfoText}>
                  긴급구조신호는 전화걸기만으로 구조신호가 접수됩니다.
                </Text>
              </View>
              <View style={styles.sosInfoItem}>
                <Text style={styles.sosInfoBullet}>•</Text>
                <Text style={styles.sosInfoText}>
                  음성통화, 문자등의 행동이 불가한 경우에만 사용하세요.
                </Text>
              </View>
              <View style={styles.sosInfoItem}>
                <Text style={styles.sosInfoBullet}>•</Text>
                <Text style={styles.sosInfoText}>
                  구조신호 접수 후 당사 콜센타에서 경찰등 유관기관에 연락을 취합니다.
                </Text>
              </View>
              <View style={styles.sosInfoItem}>
                <Text style={styles.sosInfoBullet}>•</Text>
                <Text style={styles.sosInfoText}>
                  데이터연결이 되어 있는 경우, 비상연락망의 연락처로 추가 알림이 전송됩니다.{"\n"}
                  (데이터연결이 안되어 있을경우에는 미전송)
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setSosInfoVisible(false)}
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
          onPress={handleConsulateCall}
        />

        {/* 긴급구조신호: 전화발신(필수) + 서버전송(필수시도, 실패허용) */}
        <TouchableOpacity
          style={[styles.sosButton, { marginTop: 16 }]}
          onPress={handleEmergencySOS}
          activeOpacity={0.8}
        >
          <View style={styles.sosLabelRow}>
            <Text style={styles.sosLabel}>긴급구조신호보내기</Text>
            <TouchableOpacity
              style={styles.sosInfoButton}
              onPress={(e) => {
                e.stopPropagation();
                setSosInfoVisible(true);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.sosInfoButtonText}>i</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sosSubLabel}>
            전화발신(필수) + 구조신호 서버전송
          </Text>
          <Text style={styles.sosPhone}>1588-0404</Text>
          <View style={styles.sosBadgeRow}>
            <View style={styles.sosBadge}>
              <Text style={styles.sosBadgeText}>전화 (오프라인 OK)</Text>
            </View>
            <View style={[styles.sosBadge, styles.sosBadgeApi]}>
              <Text style={styles.sosBadgeText}>API 전송 (온라인)</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>외교부 영사콜센터</Text>
        <EmergencyButton
          label="영사콜센터 (24시간)"
          subLabel="외교부 해외 긴급 상담"
          phone={CONSULAR_CALL_CENTER}
          color="#7C3AED"
          style={{ marginTop: 8 }}
          onPress={handleConsularCallCenter}
        />
      </View>

      <View style={styles.alimtalkSection}>
        <EmergencyButton
          label="긴급 알림 발송"
          subLabel={`비상연락처 ${contacts.length}명에게 알림`}
          phone=""
          color={contacts.length > 0 ? "#EA580C" : "#9CA3AF"}
          style={{ marginTop: 0 }}
          onPress={handleAlimtalk}
        />
      </View>

      {/* 긴급구조 프로세스 안내 */}
      <View style={styles.processCard}>
        <Text style={styles.processTitle}>긴급구조 프로세스 안내</Text>
        <View style={styles.processStep}>
          <Text style={styles.processStepNum}>1</Text>
          <Text style={styles.processStepText}>
            긴급구조신호 발신 (전화 + 서버전송)
          </Text>
        </View>
        <View style={styles.processStep}>
          <Text style={styles.processStepNum}>2</Text>
          <Text style={styles.processStepText}>
            당사 발신번호 캡처 및 DB 이용자 확인
          </Text>
        </View>
        <View style={styles.processStep}>
          <Text style={styles.processStepNum}>3</Text>
          <Text style={styles.processStepText}>
            비상연락처 알림톡 자동 발송
          </Text>
        </View>
        <View style={styles.processStep}>
          <Text style={styles.processStepNum}>4</Text>
          <Text style={styles.processStepText}>
            경찰신고 등 당사 운영정책 실행
          </Text>
        </View>
        <Text style={styles.processNote}>
          * 인터넷이 없어도 전화발신만으로 구조 요청 가능
        </Text>
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
  // SOS 버튼 (강화된 디자인)
  sosButton: {
    backgroundColor: "#1D4ED8",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#1D4ED8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sosLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sosLabel: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
  sosInfoButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  sosInfoButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    fontStyle: "italic",
  },
  sosSubLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginTop: 4,
  },
  sosPhone: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  sosBadgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  sosBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sosBadgeApi: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  sosBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
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
  // 긴급구조 프로세스 안내
  processCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 16,
  },
  processTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E40AF",
    marginBottom: 12,
  },
  processStep: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  processStepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#1D4ED8",
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 22,
    marginRight: 10,
  },
  processStepText: {
    flex: 1,
    fontSize: 14,
    color: "#1E3A5F",
    lineHeight: 20,
  },
  processNote: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    fontStyle: "italic",
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
  sosInfoList: {
    marginBottom: 16,
  },
  sosInfoItem: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-start",
  },
  sosInfoBullet: {
    fontSize: 16,
    color: "#1D4ED8",
    fontWeight: "700",
    marginRight: 8,
    lineHeight: 22,
  },
  sosInfoText: {
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
