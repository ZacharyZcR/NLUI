"use client";

import { ChatLayout } from "@/components/chat/chat-layout";
import { I18nProvider } from "@/lib/i18n";

export default function Home() {
  return (
    <I18nProvider>
      <ChatLayout />
    </I18nProvider>
  );
}
