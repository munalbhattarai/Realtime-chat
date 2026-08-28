import { useSelector } from "react-redux";
import ConversationSidebar from "../components/chat/ConversationSidebar";
import ChatWindow from "../components/chat/ChatWindow";

const Chat = () => {
  const activeConversationId = useSelector(
    (state) => state.conversations.activeConversationId
  );

  return (
    <main className="flex-1 flex flex-col min-h-0 h-full h-[100dvh] w-full overflow-hidden spidey-web-bg font-sans">
      <div className="flex flex-1 min-h-0 h-full w-full relative overflow-hidden">
        {/* Sidebar: full screen on mobile when no conversation active, fixed width on tablet/desktop */}
        <div
          className={`w-full md:w-80 lg:w-96 h-full shrink-0 ${
            activeConversationId ? "hidden md:block" : "block"
          }`}
        >
          <ConversationSidebar />
        </div>

        {/* Chat Window: full screen on mobile when conversation is active, flex-1 on tablet/desktop */}
        <div
          className={`flex-1 min-w-0 h-full ${
            activeConversationId ? "block" : "hidden md:block"
          }`}
        >
          <ChatWindow />
        </div>
      </div>
    </main>
  );
};

export default Chat;