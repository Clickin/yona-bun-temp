import * as React from "react";

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

const LEGACY_MESSAGES: Record<LegacyLanguageCode, LegacyMessageDictionary> = {
  "en-US": {
    "app.description": "Web-based platform for collaborative software development",
    "app.warn.support.social.login.only": "Only allow sign-in via social login",
    "button.close": "Close",
    "button.confirm": "Confirm",
    "button.login": "Log in",
    "site.mail.fail": "Failed to send mail.",
    "site.mail.sended": "Mail has been sent.",
    "site.resetPasswordEmail.invalidRequest": "Invalid password reset request",
    "site.resetPasswordEmail.wrongUrl": "Wrong url to reset password.",
    "title.forgotpassword": "Password forgotten?",
    "title.login": "Log in",
    "title.loginFor": 'Log in to <span class="highlight">{0}</span>',
    "title.or": "or",
    "title.rememberMe": "Stay logged in",
    "title.resetPassword": "Reset password",
    "title.resetPasswordFor": 'Reset password for <span class="highlight">{0}</span>',
    "title.signup": "Sign up",
    "title.signupConfirmDesc": "Administrator admission is required for activation.",
    "title.signupFor": 'Sign up for <span class="highlight">{0}</span>',
    "user.email": "Email address",
    "user.isAlreadySignupUser": "Already signed up?",
    "user.login.key": "Login ID or E-mail",
    "user.loginId": "Login ID",
    "user.name": "Name",
    "user.password": "Password",
    "user.signupBtn": "Sign up",
    "user.signupId": "User ID (lower case)",
    "user.verified": "Verified User",
    "user.verified.detail": "User is verified. Try logging in.",
    "validation.retypePassword": "Password confirmation",
  },
  "ko-KR": {
    "app.description": "21세기 소프트웨어 개발 플랫폼",
    "app.warn.support.social.login.only": "소셜 로그인을 통한 로그인만 가능합니다.",
    "button.close": "닫기",
    "button.confirm": "확인",
    "button.login": "로그인",
    "site.mail.fail": "메일 발송에 실패했습니다.",
    "site.mail.sended": "메일을 발송하였습니다.",
    "site.resetPasswordEmail.invalidRequest": "잘못된 비밀번호 재 설정 요청입니다.",
    "site.resetPasswordEmail.wrongUrl": "비밀번호 재설정 URL이 잘못되었습니다.",
    "title.forgotpassword": "비밀번호를 잊어버리셨나요?",
    "title.login": "로그인",
    "title.loginFor": '<span class="highlight">{0}</span> 로그인',
    "title.or": "or",
    "title.rememberMe": "로그인 유지하기",
    "title.resetPassword": "비밀번호 재설정",
    "title.resetPasswordFor": '<span class="highlight">{0}</span> 비밀번호 재설정',
    "title.signup": "멤버 가입",
    "title.signupConfirmDesc": "가입 후 사용을 위해서는 관리자의 승인이 필요합니다",
    "title.signupFor": '<span class="highlight">{0}</span> 멤버 가입',
    "user.email": "이메일",
    "user.isAlreadySignupUser": "이미 가입하셨나요?",
    "user.login.key": "아이디 또는 이메일",
    "user.loginId": "아이디",
    "user.name": "이름",
    "user.password": "비밀번호",
    "user.signupBtn": "참여하기",
    "user.signupId": "아이디",
    "user.verified": "확인된 사용자",
    "user.verified.detail": "사용자 정보가 확인되었습니다. 다시 로그인 해주세요",
    "validation.retypePassword": "비밀번호를 한 번 더 입력해 주세요.",
  },
  "ja-JP": {
    "app.description": "ウェブ基盤のソフト開発プラットフォーム",
    "button.confirm": "確認",
    "button.login": "ログイン",
    "site.mail.fail": "メール送信に失敗しました",
    "site.mail.sended": "メールを送信しました",
    "site.resetPasswordEmail.invalidRequest": "間違ったパスワード再設定要請です。",
    "title.forgotpassword": "パスワードをお忘れました？",
    "title.login": "ログイン",
    "title.loginFor": '<span class="highlight">{0}</span> ログイン',
    "title.rememberMe": "ログインしたままにする",
    "title.resetPassword": "パスワード再設定",
    "title.resetPasswordFor": '<span class="highlight">{0}</span> パスワード再設定',
    "title.signup": "新規取得",
    "title.signupFor": '<span class="highlight">{0}</span> 新規取得',
    "user.email": "メール",
    "user.isAlreadySignupUser": "アカウントを持っている",
    "user.loginId": "ID",
    "user.name": "名前",
    "user.password": "パスワード",
    "user.signupBtn": "新規取得",
    "user.signupId": "ID",
    "validation.retypePassword": "パスワードをもう一回入力してください",
  },
  "ru-RU": {
    "app.description": "Веб-платформа для совместной разработки программного обеспечения",
    "app.warn.support.social.login.only": "Разрешить только вход через социальный логин",
    "button.close": "Закрыть",
    "button.confirm": "подтвердить",
    "button.login": "Авторизоваться",
    "site.mail.fail": "Не удалось отправить почту.",
    "site.mail.sended": "Письмо было отправлено.",
    "site.resetPasswordEmail.invalidRequest": "Запрос сброса Неверный пароль",
    "site.resetPasswordEmail.wrongUrl": "Неправильный URL для сброса пароля.",
    "title.login": "Авторизоваться",
    "title.rememberMe": "Оставаться в системе",
    "title.resetPassword": "Сброс пароля",
    "title.signup": "зарегистрироваться",
    "user.email": "Адрес электронной почты",
    "user.isAlreadySignupUser": "Уже зарегистрировались?",
    "user.login.key": "Логин ID или адрес электронной почты",
    "user.loginId": "Логин ID",
    "user.name": "имя",
    "user.password": "пароль",
    "user.signupBtn": "зарегистрироваться",
    "user.signupId": "Идентификатор пользователя (в нижнем регистре)",
    "user.verified": "Проверенный Пользователь",
    "user.verified.detail": "Пользователь проверяется. Попробуйте логин.",
    "validation.retypePassword": "Подтверждение пароля",
  },
  "uz-UZ": {
    "app.description": "Hamkorlik bilan dastur yaratish uchun Webga asoslangan platforma",
    "app.warn.support.social.login.only": "Faqat ijtimoiy tarmoqlar orqali kirish mumkin",
    "button.close": "Yopish",
    "button.confirm": "Tasdiqlash",
    "button.login": "Kirish",
    "site.mail.fail": "Elektron pochta yuborish bo`lmadi.",
    "site.mail.sended": "Elektron pochta yuborildi.",
    "site.resetPasswordEmail.invalidRequest": "Noto`g`ri parolni qayta tiklash uchun talabdir.",
    "site.resetPasswordEmail.wrongUrl": "Noto`g`ri parolni qayta tiklash uchun URL to`g`ri emas.",
    "title.login": "Kirish",
    "title.rememberMe": "Kirgan holatda qolish",
    "title.resetPassword": "Parolni qayta tiklash",
    "title.signup": "Ro`yxatdan o`tish",
    "user.email": "Elektron pochta manzili",
    "user.isAlreadySignupUser": "Allaqachon ro`yxatga o`tgansiz?",
    "user.login.key": "Kirish ID yoki Elektron pochta",
    "user.loginId": "Kirsh ID",
    "user.name": "Ismi",
    "user.password": "Parol",
    "user.signupBtn": "Ro`yxatdan o`tish",
    "user.signupId": "Kirish ID (Kichik harf bilan)",
    "user.verified": "Tasdiqlangan foydalanuvchi",
    "user.verified.detail": "Foydalanuvchi tekshirilgan. Yana kirib ko`ring.",
    "validation.retypePassword": "Parolni tasdiqlanishi",
  },
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
): LegacyLanguageCode {
  const supported = normalizeSupportedLanguages([...(supportedLanguages ?? [])]);
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
): LegacyI18nContextValue {
  const normalizedSupportedLanguages = normalizeSupportedLanguages([
    ...(supportedLanguages ?? []),
  ]) as LegacyLanguageCode[];
  let currentLanguage = resolveInitialLanguage(normalizedSupportedLanguages);
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
  t: (key, options) => formatLegacyMessage(options?.fallback ?? key, options?.args),
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
