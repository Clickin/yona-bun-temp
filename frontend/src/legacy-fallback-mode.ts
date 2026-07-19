const legacyFallbackLinkPattern =
  /\s*<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["'](?:\.\/|\/)?legacy-assets\/stylesheets\/legacy-fallback\.css["'])[^>]*\/?>/u;

export function legacyFallbackEnabled(value: string | undefined): boolean {
  return value !== "1";
}

export function transformLegacyFallbackLink(html: string, enabled: boolean): string {
  return enabled ? html : html.replace(legacyFallbackLinkPattern, "");
}
