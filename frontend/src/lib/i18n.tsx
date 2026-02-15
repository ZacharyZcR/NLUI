"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

const translations = {
  zh: {
    "app.title": "NLUI",
    "sidebar.new": "+ 新对话",
    "sidebar.empty": "暂无对话",
    "sidebar.untitled": "未命名对话",
    "chat.placeholder": "输入消息... (Enter 发送, Shift+Enter 换行)",
    "chat.send": "发送",
    "chat.thinking": "思考中...",
    "chat.empty": "开始对话，NLUI 将通过工具操作你的系统",
    "chat.error": "连接失败",
    "lang.switch": "EN",
  },
  en: {
    "app.title": "NLUI",
    "sidebar.new": "+ New Chat",
    "sidebar.empty": "No conversations",
    "sidebar.untitled": "Untitled",
    "chat.placeholder": "Type a message... (Enter to send, Shift+Enter for newline)",
    "chat.send": "Send",
    "chat.thinking": "Thinking...",
    "chat.empty": "Start a conversation. NLUI will operate your system through tools.",
    "chat.error": "Connection failed",
    "lang.switch": "中",
  },
  ja: {
    "app.title": "NLUI",
    "sidebar.new": "+ 新規チャット",
    "sidebar.empty": "会話なし",
    "sidebar.untitled": "無題",
    "chat.placeholder": "メッセージを入力... (Enter で送信、Shift+Enter で改行)",
    "chat.send": "送信",
    "chat.thinking": "考え中...",
    "chat.empty": "会話を開始してください。NLUI がツールでシステムを操作します。",
    "chat.error": "接続失敗",
    "lang.switch": "中",
  },
} as const;

export type Locale = keyof typeof translations;
type Key = keyof (typeof translations)["en"];

const langCycle: Locale[] = ["zh", "en", "ja"];

interface I18nContextValue {
  locale: Locale;
  t: (key: Key) => string;
  toggle: () => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  t: (key) => key,
  toggle: () => {},
});

export function I18nProvider({ initial, children }: { initial?: Locale; children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(initial || "en");

  useEffect(() => {
    const saved = localStorage.getItem("kelper-locale") as Locale | null;
    if (saved && translations[saved]) {
      setLocale(saved);
    }
  }, []);

  const t = useCallback(
    (key: Key): string => {
      return translations[locale]?.[key] || translations["en"][key] || key;
    },
    [locale]
  );

  const toggle = useCallback(() => {
    setLocale((prev) => {
      const idx = langCycle.indexOf(prev);
      const next = langCycle[(idx + 1) % langCycle.length];
      localStorage.setItem("kelper-locale", next);
      return next;
    });
  }, []);

  return (
    <I18nContext.Provider value={{ locale, t, toggle }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
