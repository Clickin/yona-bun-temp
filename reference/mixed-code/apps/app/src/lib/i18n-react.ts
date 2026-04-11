import * as React from "react";
import {
  normalizeLocale,
  translateMessage,
  type Locale,
  type MessageArgument,
  type MessageKey,
} from "@yona/i18n";

type Translate = (key: MessageKey, ...args: MessageArgument[]) => string;

interface I18nContextValue {
  locale: Locale;
  t: Translate;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

export function I18nProvider({ children, locale }: { children: React.ReactNode; locale?: string | null }) {
  const normalizedLocale = React.useMemo(() => normalizeLocale(locale), [locale]);
  const t = React.useCallback<Translate>(
    (key, ...args) => translateMessage(normalizedLocale, key, ...args),
    [normalizedLocale],
  );
  const value = React.useMemo(() => ({ locale: normalizedLocale, t }), [normalizedLocale, t]);

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useI18n() {
  const value = React.useContext(I18nContext);

  if (!value) {
    throw new Error("useI18n must be used within an I18nProvider.");
  }

  return value;
}

export function useTranslate() {
  return useI18n().t;
}
