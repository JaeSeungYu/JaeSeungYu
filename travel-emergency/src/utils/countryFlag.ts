/**
 * ISO 3166-1 alpha-2 국가 코드를 국기 이모지로 변환
 * 예: "JP" → "🇯🇵", "US" → "🇺🇸"
 */
export function countryCodeToFlag(code: string): string {
  return code
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - 65))
    .join("");
}
