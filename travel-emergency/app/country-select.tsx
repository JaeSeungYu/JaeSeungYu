import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { getAllCountries, setSetting, getSetting } from "../src/db/database";
import { countryCodeToFlag } from "../src/utils/countryFlag";
import { syncProfileToServer } from "../src/services/cloudSync";

interface Country {
  country_code: string;
  country_name_ko: string;
  country_name_en: string;
}

export default function CountrySelectScreen() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [filtered, setFiltered] = useState<Country[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const data = await getAllCountries();
      setCountries(data);
      setFiltered(data);
      const current = await getSetting("selected_country");
      if (current) setSelectedCode(current);
    })();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(countries);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      countries.filter(
        (c) =>
          c.country_name_ko.includes(q) ||
          c.country_name_en.toLowerCase().includes(q) ||
          c.country_code.toLowerCase().includes(q)
      )
    );
  }, [search, countries]);

  const handleSelect = async (code: string) => {
    await setSetting("selected_country", code);
    setSelectedCode(code);
    // 자동 서버 동기화
    syncProfileToServer().catch(() => {});
    router.back();
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="국가명 검색 (한글/영어)"
        value={search}
        onChangeText={setSearch}
        autoFocus
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.country_code}
        renderItem={({ item }) => {
          const isSelected = item.country_code === selectedCode;
          return (
            <TouchableOpacity
              style={[styles.item, isSelected && styles.itemSelected]}
              onPress={() => handleSelect(item.country_code)}
            >
              <View>
                <Text style={[styles.itemName, isSelected && styles.itemNameSelected]}>
                  {countryCodeToFlag(item.country_code)} {item.country_name_ko}
                </Text>
                <Text style={styles.itemEnName}>{item.country_name_en}</Text>
              </View>
              {isSelected && <Text style={styles.checkMark}>✓</Text>}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>검색 결과가 없습니다.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  searchInput: {
    backgroundColor: "#fff",
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  item: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 6,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemSelected: {
    borderColor: "#EA580C",
    backgroundColor: "#FFF7ED",
  },
  itemName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1F2937",
  },
  itemNameSelected: {
    color: "#EA580C",
  },
  itemEnName: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  checkMark: {
    fontSize: 20,
    color: "#EA580C",
    fontWeight: "700",
  },
  empty: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 15,
  },
});
