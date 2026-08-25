import { useSelector } from "react-redux";
import ConversationSidebar from "../components/chat/ConversationSidebar";
import ChatWindow from "../components/chat/ChatWindow";

const Chat = () => {
  const activeConversationId = useSelector(
    (state) => state.conversations.activeConversationId
  );

  return (
    <main className="h-screen overflow-hidden spidey-web-bg font-sans">
      <div className="flex h-full relative">
        <div className={`w-full md:w-auto h-full absolute inset-0 md:relative md:block ${activeConversationId ? 'hidden' : 'block z-10'}`}>
          <ConversationSidebar />
        </div>

        <div className={`flex-1 min-w-0 h-full absolute inset-0 md:relative md:block ${activeConversationId ? 'block z-20 spidey-web-bg' : 'hidden'}`}>
          <ChatWindow />
        </div>
      </div>
    </main>
  );
};

export default Chat;