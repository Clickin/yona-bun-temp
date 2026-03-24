import { defaultLocale, messageCatalogs, type Locale, type MessageKey } from "./catalogs";

export type MessageArgument = boolean | Date | number | string | null | undefined;

function normalizeCandidate(locale: string) {
  return locale.trim().toLowerCase().replace(/_/g, "-");
}

function parseAcceptLanguageCandidates(header: string) {
  return header
    .split(",")
    .map((segment, index) => {
      const [rawLocale, ...rawParams] = segment.split(";");
      const locale = rawLocale?.trim();

      if (!locale || locale === "*") {
        return null;
      }

      let quality = 1;

      for (const rawParam of rawParams) {
        const [name, value] = rawParam.split("=");
        if (name?.trim().toLowerCase() !== "q") {
          continue;
        }

        const parsed = Number.parseFloat(value?.trim() ?? "");
        if (!Number.isNaN(parsed)) {
          quality = parsed;
        }
      }

      return {
        index,
        locale,
        quality,
      };
    })
    .filter((entry): entry is { index: number; locale: string; quality: number } => entry !== null)
    .sort((left, right) => right.quality - left.quality || left.index - right.index)
    .map((entry) => entry.locale);
}

export function resolveLocaleCandidate(locale?: string | null): Locale | undefined {
  if (!locale) {
    return undefined;
  }

  const normalized = normalizeCandidate(locale);

  if (normalized === "ko" || normalized.startsWith("ko-")) {
    return "ko-KR";
  }

  if (normalized === "en" || normalized.startsWith("en-")) {
    return "en";
  }

  return undefined;
}

export function normalizeLocale(locale?: string | null): Locale {
  return resolveLocaleCandidate(locale) ?? defaultLocale;
}

export function resolveLocale(candidates: Iterable<string | null | undefined>): Locale {
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    for (const parsedCandidate of parseAcceptLanguageCandidates(candidate)) {
      const resolved = resolveLocaleCandidate(parsedCandidate);
      if (resolved) {
        return resolved;
      }
    }
  }

  return defaultLocale;
}

export function formatMessage(template: string, args: MessageArgument[] = []) {
  return template.replace(/\{(\d+)\}/g, (_, index) => {
    const value = args[Number(index)];

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (value === null || value === undefined) {
      return "";
    }

    return String(value);
  });
}

export function translateMessage(locale: string | null | undefined, key: MessageKey, ...args: MessageArgument[]) {
  const normalizedLocale = normalizeLocale(locale);
  return formatMessage(messageCatalogs[normalizedLocale][key], args);
}
