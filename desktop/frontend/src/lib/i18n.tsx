import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

const translations = {
  zh: {
    "app.title": "Kelper",
    "sidebar.new": "+ 新对话",
    "sidebar.empty": "暂无对话",
    "sidebar.untitled": "未命名对话",
    "chat.placeholder": "输入消息... (Enter 发送, Shift+Enter 换行)",
    "chat.send": "发送",
    "chat.thinking": "思考中...",
    "chat.empty": "开始对话，Kelper 将通过工具操作你的系统",
    "chat.error": "连接失败",
    "lang.switch": "EN",
    "settings.btn": "设置",
    "settings.title": "LLM 配置",
    "settings.close": "关闭",
    "settings.detected": "自动检测",
    "settings.scanning": "扫描中...",
    "settings.rescan": "重新扫描",
    "settings.noProviders": "未检测到本地 LLM 服务",
    "settings.use": "使用",
    "settings.manual": "手动配置",
    "settings.fetchModels": "获取模型",
    "settings.keyPlaceholder": "留空表示无需密钥（本地 LLM）",
    "settings.required": "API Base 和 Model 为必填项",
    "settings.saving": "保存中...",
    "settings.save": "保存并应用",
    "settings.llmSection": "LLM 配置",
    "targets.btn": "目标",
    "targets.section": "API 目标（OpenAPI → 工具）",
    "targets.empty": "暂无 API 目标",
    "targets.add": "添加目标",
    "targets.baseUrl": "Base URL",
    "targets.probe": "探测",
    "targets.found": "已发现 OpenAPI 规范",
    "targets.notFound": "未找到",
    "targets.name": "名称",
    "targets.description": "描述",
    "targets.descPlaceholder": "简要描述此 API",
    "targets.authType": "认证方式",
    "targets.addBtn": "添加目标",
    "targets.remove": "删除",
    "targets.nameUrlRequired": "名称和 URL 为必填项",
    "tools.title": "工具列表",
    "tools.btn": "工具",
    "tools.empty": "暂无已加载的工具",
    "confirm.title": "危险操作确认",
    "confirm.approve": "执行",
    "confirm.reject": "取消",
  },
  en: {
    "app.title": "Kelper",
    "sidebar.new": "+ New Chat",
    "sidebar.empty": "No conversations",
    "sidebar.untitled": "Untitled",
    "chat.placeholder": "Type a message... (Enter to send, Shift+Enter for newline)",
    "chat.send": "Send",
    "chat.thinking": "Thinking...",
    "chat.empty": "Start a conversation. Kelper will operate your system through tools.",
    "chat.error": "Connection failed",
    "lang.switch": "中",
    "settings.btn": "Settings",
    "settings.title": "LLM Configuration",
    "settings.close": "Close",
    "settings.detected": "Auto-detected",
    "settings.scanning": "Scanning...",
    "settings.rescan": "Rescan",
    "settings.noProviders": "No local LLM service detected",
    "settings.use": "Use",
    "settings.manual": "Manual Configuration",
    "settings.fetchModels": "Fetch Models",
    "settings.keyPlaceholder": "Leave empty for local LLM (no key needed)",
    "settings.required": "API Base and Model are required",
    "settings.saving": "Saving...",
    "settings.save": "Save & Apply",
    "settings.llmSection": "LLM Configuration",
    "targets.btn": "Targets",
    "targets.section": "API Targets (OpenAPI → Tools)",
    "targets.empty": "No API targets configured",
    "targets.add": "Add Target",
    "targets.baseUrl": "Base URL",
    "targets.probe": "Probe",
    "targets.found": "OpenAPI spec found",
    "targets.notFound": "Not found",
    "targets.name": "Name",
    "targets.description": "Description",
    "targets.descPlaceholder": "Brief description of this API",
    "targets.authType": "Auth Type",
    "targets.addBtn": "Add Target",
    "targets.remove": "Remove",
    "targets.nameUrlRequired": "Name and URL are required",
    "tools.title": "Tools",
    "tools.btn": "Tools",
    "tools.empty": "No tools loaded",
    "confirm.title": "Dangerous Operation",
    "confirm.approve": "Execute",
    "confirm.reject": "Cancel",
  },
  ja: {
    "app.title": "Kelper",
    "sidebar.new": "+ 新規チャット",
    "sidebar.empty": "会話なし",
    "sidebar.untitled": "無題",
    "chat.placeholder": "メッセージを入力... (Enter で送信、Shift+Enter で改行)",
    "chat.send": "送信",
    "chat.thinking": "考え中...",
    "chat.empty": "会話を開始してください。Kelper がツールでシステムを操作します。",
    "chat.error": "接続失敗",
    "lang.switch": "中",
    "settings.btn": "設定",
    "settings.title": "LLM 設定",
    "settings.close": "閉じる",
    "settings.detected": "自動検出",
    "settings.scanning": "スキャン中...",
    "settings.rescan": "再スキャン",
    "settings.noProviders": "ローカル LLM サービスが見つかりません",
    "settings.use": "使用",
    "settings.manual": "手動設定",
    "settings.fetchModels": "モデル取得",
    "settings.keyPlaceholder": "ローカル LLM の場合は空欄",
    "settings.required": "API Base と Model は必須です",
    "settings.saving": "保存中...",
    "settings.save": "保存して適用",
    "settings.llmSection": "LLM 設定",
    "targets.btn": "ターゲット",
    "targets.section": "API ターゲット（OpenAPI → ツール）",
    "targets.empty": "API ターゲットなし",
    "targets.add": "ターゲット追加",
    "targets.baseUrl": "Base URL",
    "targets.probe": "探査",
    "targets.found": "OpenAPI 仕様を検出",
    "targets.notFound": "見つかりません",
    "targets.name": "名前",
    "targets.description": "説明",
    "targets.descPlaceholder": "この API の簡単な説明",
    "targets.authType": "認証方式",
    "targets.addBtn": "ターゲット追加",
    "targets.remove": "削除",
    "targets.nameUrlRequired": "名前と URL は必須です",
    "tools.title": "ツール一覧",
    "tools.btn": "ツール",
    "tools.empty": "ツールがありません",
    "confirm.title": "危険な操作の確認",
    "confirm.approve": "実行",
    "confirm.reject": "キャンセル",
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
