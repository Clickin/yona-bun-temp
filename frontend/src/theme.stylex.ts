import * as stylex from "@stylexjs/stylex";

export const globalBreakpoints = stylex.defineConsts({
  mobile: "@media (max-width: 720px)",
});

export const anonymousHomeIntroBackgroundVars = stylex.defineVars({
  image:
    "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.3)), var(--siteintro-background-image)",
});

export const anonymousHomeIntroBackgroundTheme = stylex.createTheme(
  anonymousHomeIntroBackgroundVars,
  {
    image:
      "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.3)), var(--siteintro-background-image)",
  },
);
