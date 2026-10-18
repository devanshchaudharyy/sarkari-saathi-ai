export const LANGUAGE_KEY = "sarkarisaathi.language.v1";
export const supportedLanguage = (value) => (value === "hi" ? "hi" : "en");
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function createTranslator(hindi = {}) {
  const patterns = Object.entries(hindi)
    .filter(([key]) => /\{\d+\}/.test(key))
    .map(([key, value]) => ({
      match: new RegExp(
        `^${key
          .split(/\{\d+\}/)
          .map(escape)
          .join("(.+?)")}$`,
      ),
      value,
    }));
  // Translation affects display strings only. Values, URLs, IDs and API payloads
  // stay canonical. Unknown editorial content safely falls back to English.
  function translate(value, language = "en", variables) {
    if (typeof value !== "string" || language !== "hi") {
      if (typeof value === "string" && variables)
        return value.replace(
          /\{(\d+)\}/g,
          (_, index) => variables[index] ?? "",
        );
      return value;
    }
    const trimmed = value.trim();
    let result = Object.hasOwn(hindi, trimmed) ? hindi[trimmed] : undefined;
    let args = variables;
    if (!result) {
      for (const pattern of patterns) {
        const match = trimmed.match(pattern.match);
        if (match) {
          result = pattern.value;
          args = match.slice(1);
          break;
        }
      }
    }
    if (!result) return value;
    if (args)
      result = result.replace(/\{(\d+)\}/g, (_, index) =>
        translate(String(args[index] ?? ""), language),
      );
    return (
      value.slice(0, value.length - value.trimStart().length) +
      result +
      value.slice(value.trimEnd().length)
    );
  }
  return translate;
}

export function canonicalSearch(value) {
  const aliases = {
    किसान: "PM-KISAN",
    "पीएम किसान": "PM-KISAN",
    "प्रधानमंत्री किसान सम्मान निधि": "PM-KISAN",
    सुरक्षा: "PMSBY",
    "सुरक्षा बीमा": "PMSBY",
    "प्रधानमंत्री सुरक्षा बीमा योजना": "PMSBY",
    जीवन: "PMJJBY",
    "जीवन ज्योति": "PMJJBY",
    "प्रधानमंत्री जीवन ज्योति बीमा योजना": "PMJJBY",
    अटल: "APY",
    पेंशन: "APY",
    "अटल पेंशन योजना": "APY",
    "जन धन": "PMJDY",
    "जन-धन": "PMJDY",
    जनधन: "PMJDY",
    "प्रधानमंत्री जन धन योजना": "PMJDY",
    "प्रधानमंत्री जन-धन योजना": "PMJDY",
    कन्या: "Kanya Sumangala",
    "कन्या सुमंगला": "Kanya Sumangala",
    "मुख्यमंत्री कन्या सुमंगला योजना": "Kanya Sumangala",
  };
  return Object.hasOwn(aliases, value.trim()) ? aliases[value.trim()] : value;
}
