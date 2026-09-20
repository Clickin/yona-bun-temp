import * as React from "react";
import legacyMessagesEn from "./i18n/messages/en-US.json";
import legacyMessagesJa from "./i18n/messages/ja-JP.json";
import legacyMessagesKo from "./i18n/messages/ko-KR.json";
import legacyMessagesRu from "./i18n/messages/ru-RU.json";
import legacyMessagesUz from "./i18n/messages/uz-UZ.json";

export const LEGACY_DEFAULT_LANGUAGE = "en-US";

export const LEGACY_LANGUAGE_CODES = ["en-US", "ko-KR", "ja-JP", "ru-RU", "uz-UZ"] as const;

export type LegacyLanguageCode = (typeof LEGACY_LANGUAGE_CODES)[number];

type LegacyMessageDictionary = Record<string, string>;

export interface TranslateOptions {
  args?: Array<number | string>;
  fallback?: string;
}

export interface LegacyI18nContextValue {
  language: LegacyLanguageCode;
  setLanguage: (nextLanguage: string) => void;
  supportedLanguages: LegacyLanguageCode[];
  t: (key: string, options?: TranslateOptions) => string;
}

function rebrandDictionary(dictionary: LegacyMessageDictionary): LegacyMessageDictionary {
  const rebranded: LegacyMessageDictionary = {};
  for (const [key, value] of Object.entries(dictionary)) {
    rebranded[key] = rebrandLegacyMessageValue(key, value);
  }
  return rebranded;
}

function rebrandLegacyMessageValue(key: string, value: string): string {
  // ponytail: feedback label stays 100% legacy ("Feedback") — rebranding of the
  // GNB identity is deferred to its dedicated phase.
  return value.replace(/\b(?:naver|yobi|yona)\b/giu, "Yoram");
}

const LEGACY_MESSAGES: Record<LegacyLanguageCode, LegacyMessageDictionary> = {
  "en-US": rebrandDictionary(legacyMessagesEn),
  "ja-JP": rebrandDictionary(legacyMessagesJa),
  "ko-KR": rebrandDictionary(legacyMessagesKo),
  "ru-RU": rebrandDictionary(legacyMessagesRu),
  "uz-UZ": rebrandDictionary(legacyMessagesUz),
};

export function normalizeLegacyLanguageCode(input: string): LegacyLanguageCode | null {
  const trimmed = input.trim();
  if (trimmed === "") {
    return null;
  }

  const normalized = trimmed.replace(/_/g, "-").toLowerCase();
  const exactMatch = LEGACY_LANGUAGE_CODES.find((code) => code.toLowerCase() === normalized);
  if (exactMatch) {
    return exactMatch;
  }

  const languageOnlyMatch = LEGACY_LANGUAGE_CODES.find(
    (code) => code.slice(0, 2).toLowerCase() === normalized,
  );
  return languageOnlyMatch ?? null;
}

export function normalizeSupportedLanguages(input: string[] | string | null | undefined): string[] {
  const values = Array.isArray(input) ? input : (input ?? "").split(",");
  const normalized = values.flatMap((value) => {
    const language = normalizeLegacyLanguageCode(value);
    return language ? [language] : [];
  });
  const deduped = Array.from(new Set(normalized));
  return deduped.length > 0 ? deduped : [...LEGACY_LANGUAGE_CODES];
}

export function resolveInitialLanguage(
  supportedLanguages: readonly string[] | null | undefined,
  preferredLanguages: readonly string[] | null | undefined = readBrowserPreferredLanguages(),
): LegacyLanguageCode {
  const supported = normalizeSupportedLanguages([...(supportedLanguages ?? [])]);
  const supportedSet = new Set(supported);
  for (const preferredLanguage of preferredLanguages ?? []) {
    const normalized = normalizeLegacyLanguageCode(preferredLanguage);
    if (normalized && supportedSet.has(normalized)) {
      return normalized;
    }
  }
  return (supported[0] as LegacyLanguageCode | undefined) ?? LEGACY_DEFAULT_LANGUAGE;
}

export function switchLegacyLanguage(
  currentLanguage: LegacyLanguageCode,
  nextLanguage: string,
  supportedLanguages: readonly string[] | null | undefined,
): LegacyLanguageCode {
  const supported = normalizeSupportedLanguages([...(supportedLanguages ?? [])]);
  const normalized = normalizeLegacyLanguageCode(nextLanguage);
  return normalized && supported.includes(normalized) ? normalized : currentLanguage;
}

export function lookupLegacyMessage(
  language: LegacyLanguageCode,
  key: string,
  options: TranslateOptions = {},
): string {
  const fallbackKey = options.fallback;
  const raw =
    LEGACY_MESSAGES[language][key] ??
    LEGACY_MESSAGES[LEGACY_DEFAULT_LANGUAGE][key] ??
    (fallbackKey
      ? (LEGACY_MESSAGES[language][fallbackKey] ??
        LEGACY_MESSAGES[LEGACY_DEFAULT_LANGUAGE][fallbackKey])
      : undefined) ??
    fallbackKey ??
    key;
  return formatLegacyMessage(raw, options.args);
}

export function createLegacyI18nRuntime(
  supportedLanguages: readonly string[] | null | undefined,
  preferredLanguages: readonly string[] | null | undefined = [],
): LegacyI18nContextValue {
  const normalizedSupportedLanguages = normalizeSupportedLanguages([
    ...(supportedLanguages ?? []),
  ]) as LegacyLanguageCode[];
  let currentLanguage = resolveInitialLanguage(normalizedSupportedLanguages, preferredLanguages);
  return {
    get language() {
      return currentLanguage;
    },
    setLanguage(nextLanguage: string) {
      currentLanguage = switchLegacyLanguage(
        currentLanguage,
        nextLanguage,
        normalizedSupportedLanguages,
      );
    },
    supportedLanguages: normalizedSupportedLanguages,
    t(key, options) {
      return lookupLegacyMessage(currentLanguage, key, options);
    },
  };
}

export function formatLegacyTimestamp(value: string, t: LegacyI18nContextValue["t"]) {
  const date = new Date(value);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) {
    return { label: value, title: value };
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const fullDate = `${year}-${month}-${day}`;
  const title = `${fullDate} ${hours % 12 || 12}:${minutes}:${seconds} ${t(hours < 12 ? "common.time.am" : "common.time.pm")}`;
  const now = Date.now();
  const elapsedSeconds = Math.floor(Math.max(0, now - timestamp) / 1_000);
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  const elapsedDays = Math.floor(elapsedHours / 24);
  let label: string;
  if (elapsedDays >= 8) {
    label = year === new Date(now).getFullYear() ? `${month}-${day}` : fullDate;
  } else if (elapsedSeconds === 0) {
    label = t("common.time.just");
  } else {
    const [unit, count] =
      elapsedDays > 0
        ? ["day", elapsedDays]
        : elapsedHours > 0
          ? ["hour", elapsedHours]
          : elapsedMinutes > 0
            ? ["minute", elapsedMinutes]
            : ["second", elapsedSeconds];
    label = t(`common.time.${unit}${count === 1 ? "" : "s"}`, { args: [count] });
  }
  return { label, title };
}

export function formatLegacyMessage(
  template: string,
  args: readonly (number | string)[] | undefined,
): string {
  const message = normalizeLegacyMessageApostrophes(template);
  if (!args || args.length === 0) {
    return message;
  }

  return message.replace(/\{(\d+)}/g, (placeholder, index) => {
    const value = args[Number(index)];
    return value === undefined ? placeholder : String(value);
  });
}

function normalizeLegacyMessageApostrophes(template: string): string {
  let message = "";
  for (let index = 0; index < template.length; index += 1) {
    const char = template[index];
    if (char !== "'") {
      message += char;
      continue;
    }
    if (template[index + 1] === "'") {
      message += "'";
      index += 1;
    }
  }
  return message;
}

const fallbackI18n: LegacyI18nContextValue = {
  language: LEGACY_DEFAULT_LANGUAGE,
  setLanguage: () => {},
  supportedLanguages: [...LEGACY_LANGUAGE_CODES],
  t: (key, options) => lookupLegacyMessage(LEGACY_DEFAULT_LANGUAGE, key, options),
};

const LegacyI18nContext = React.createContext<LegacyI18nContextValue>(fallbackI18n);

export function LegacyI18nProvider({
  children,
  supportedLanguages,
}: React.PropsWithChildren<{ supportedLanguages?: readonly string[] | null }>) {
  const normalizedSupportedLanguages = React.useMemo(
    () => normalizeSupportedLanguages([...(supportedLanguages ?? [])]) as LegacyLanguageCode[],
    [supportedLanguages],
  );
  const [language, setLanguageState] = React.useState<LegacyLanguageCode>(() =>
    resolveInitialLanguage(normalizedSupportedLanguages),
  );

  React.useEffect(() => {
    setLanguageState((current) =>
      normalizedSupportedLanguages.includes(current) ? current : normalizedSupportedLanguages[0],
    );
  }, [normalizedSupportedLanguages]);

  const setLanguage = React.useCallback(
    (nextLanguage: string) => {
      setLanguageState((current) =>
        switchLegacyLanguage(current, nextLanguage, normalizedSupportedLanguages),
      );
    },
    [normalizedSupportedLanguages],
  );

  const value = React.useMemo<LegacyI18nContextValue>(
    () => ({
      language,
      setLanguage,
      supportedLanguages: normalizedSupportedLanguages,
      t: (key, options) => lookupLegacyMessage(language, key, options),
    }),
    [language, normalizedSupportedLanguages, setLanguage],
  );

  return <LegacyI18nContext.Provider value={value}>{children}</LegacyI18nContext.Provider>;
}

export function useLegacyMessages(): LegacyI18nContextValue {
  return React.use(LegacyI18nContext);
}

function readBrowserPreferredLanguages(): string[] {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return [];
  }
  const languages = Array.isArray(navigator.languages) ? navigator.languages : [];
  return languages.length > 0 ? [...languages] : navigator.language ? [navigator.language] : [];
}

export function renderLegacyHighlightedMessage(message: string): React.ReactNode {
  const match = /^(.*)<span class="highlight">([\s\S]*)<\/span>(.*)$/.exec(message);
  if (!match) {
    return message;
  }

  return (
    <>
      {match[1]}
      <span className="highlight">{match[2]}</span>
      {match[3]}
    </>
  );
}
