// High-level components
export { default as ChatInterface } from './components/chat/ChatInterface.vue';

export { default as SettingsPanel } from './components/chat/SettingsPanel.vue';

// Mid-level components
export { default as MessageList } from './components/chat/MessageList.vue';
export { default as InputBox } from './components/chat/InputBox.vue';
export { default as ConversationSidebar } from './components/chat/ConversationSidebar.vue';

// Low-level components
export { default as Message } from './components/chat/Message.vue';
export { default as UserMessage } from './components/chat/UserMessage.vue';
export { default as AssistantMessage } from './components/chat/AssistantMessage.vue';
export { default as ToolCallMessage } from './components/chat/ToolCallMessage.vue';
export { default as ToolResultMessage } from './components/chat/ToolResultMessage.vue';

// Renderers
export { default as RichResult } from './components/renderers/RichResult.vue';
export { default as DataTable } from './components/renderers/DataTable.vue';
export { default as KVCard } from './components/renderers/KVCard.vue';
export { default as BadgeList } from './components/renderers/BadgeList.vue';

// UI components
export { default as Button } from './components/ui/Button.vue';
export { default as Card } from './components/ui/Card.vue';
export { default as Badge } from './components/ui/Badge.vue';
export { default as Table } from './components/ui/Table.vue';
export { default as Textarea } from './components/ui/Textarea.vue';
export { default as Input } from './components/ui/Input.vue';

// Theme
export { default as ThemeProvider } from './components/theme/ThemeProvider.vue';
export { useTheme } from './composables/useTheme';

// Types
export type { Message as MessageType, Conversation } from './lib/types';

// Import styles
import './styles/index.css';
