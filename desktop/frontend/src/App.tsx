import { I18nProvider } from "@/lib/i18n"
import { ChatLayout } from "@/components/chat/chat-layout"

function App() {
  return (
    <I18nProvider>
      <ChatLayout />
    </I18nProvider>
  )
}

export default App
