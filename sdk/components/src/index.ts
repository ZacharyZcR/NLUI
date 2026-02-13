// Import styles
import './styles/index.css';

// UI Components
export { NluiButton } from './components/ui/button';
export { NluiCard, NluiCardHeader } from './components/ui/card';
export { NluiBadge } from './components/ui/badge';
export {
  NluiTable,
  NluiTableHeader,
  NluiTableBody,
  NluiTableRow,
  NluiTableHead,
  NluiTableCell,
} from './components/ui/table';
export { NluiTextarea } from './components/ui/textarea';
export { NluiInput } from './components/ui/input';

// Renderers
export { NluiRichResult } from './components/renderers/rich-result';
export { NluiDataTable } from './components/renderers/data-table';
export { NluiKVCard } from './components/renderers/kv-card';
export { NluiBadgeList } from './components/renderers/badge-list';

// Chat Components
export { NluiMessage } from './components/chat/message';
export { NluiUserMessage } from './components/chat/user-message';
export { NluiAssistantMessage } from './components/chat/assistant-message';
export { NluiToolCallMessage } from './components/chat/tool-call-message';
export { NluiToolResultMessage } from './components/chat/tool-result-message';
export { NluiMessageList } from './components/chat/message-list';
export { NluiInputBox } from './components/chat/input-box';
export { NluiConversationSidebar } from './components/chat/conversation-sidebar';
export { NluiChatInterface } from './components/chat/chat-interface';

// Types
export type { Message, Conversation } from './lib/types';

// Auto-register all custom elements
import './components/ui/button';
import './components/ui/card';
import './components/ui/badge';
import './components/ui/table';
import './components/ui/textarea';
import './components/ui/input';
import './components/renderers/rich-result';
import './components/renderers/data-table';
import './components/renderers/kv-card';
import './components/renderers/badge-list';
import './components/chat/message';
import './components/chat/user-message';
import './components/chat/assistant-message';
import './components/chat/tool-call-message';
import './components/chat/tool-result-message';
import './components/chat/message-list';
import './components/chat/input-box';
import './components/chat/conversation-sidebar';
import './components/chat/chat-interface';
