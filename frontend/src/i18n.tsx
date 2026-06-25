import * as React from "react";
import legacyMessagesEn from "../../yona-original/conf/messages?raw";
import legacyMessagesJa from "../../yona-original/conf/messages.ja-JP?raw";
import legacyMessagesKo from "../../yona-original/conf/messages.ko-KR?raw";
import legacyMessagesRu from "../../yona-original/conf/messages.ru-RU?raw";
import legacyMessagesUz from "../../yona-original/conf/messages.uz-UZ?raw";

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

function parseLegacyMessages(source: string): LegacyMessageDictionary {
  const messages: LegacyMessageDictionary = {};
  for (const line of source.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }
    const messageMatch = /^([^=]+)=(.*)$/u.exec(trimmed);
    if (!messageMatch) {
      continue;
    }
    messages[messageMatch[1].trim()] = messageMatch[2].trim();
  }
  return messages;
}

const LEGACY_MESSAGES: Record<LegacyLanguageCode, LegacyMessageDictionary> = {
  "en-US": parseLegacyMessages(legacyMessagesEn),
  "ja-JP": parseLegacyMessages(legacyMessagesJa),
  "ko-KR": parseLegacyMessages(legacyMessagesKo),
  "ru-RU": parseLegacyMessages(legacyMessagesRu),
  "uz-UZ": parseLegacyMessages(legacyMessagesUz),
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
  const raw =
    LEGACY_MESSAGES[language][key] ??
    LEGACY_MESSAGES[LEGACY_DEFAULT_LANGUAGE][key] ??
    options.fallback ??
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

export function formatLegacyMessage(
  template: string,
  args: readonly (number | string)[] | undefined,
): string {
  if (!args || args.length === 0) {
    return template;
  }

  return template.replace(/\{(\d+)}/g, (placeholder, index) => {
    const value = args[Number(index)];
    return value === undefined ? placeholder : String(value);
  });
}

const fallbackI18n: LegacyI18nContextValue = {
  language: LEGACY_DEFAULT_LANGUAGE,
  setLanguage: () => {},
  supportedLanguages: [...LEGACY_LANGUAGE_CODES],
  t: (key) => key,
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
