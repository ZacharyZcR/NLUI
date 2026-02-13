import { I18nProvider } from "@/lib/i18n"
import { ChatLayout } from "@/components/chat/chat-layout"
import { Toaster } from "@/components/ui/sonner"

function App() {
  return (
    <I18nProvider>
      <ChatLayout />
      <Toaster position="top-right" richColors />
    </I18nProvider>
  )
}

export default App
