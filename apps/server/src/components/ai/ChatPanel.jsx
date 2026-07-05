export default function ChatPanel({ messages }) {
  return (
    <div className="chat-thread">
      {messages.map((message, index) => (
        <div
          key={`${message.role}-${index}`}
          className={`chat-bubble ${message.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}`}
        >
          <div className="chat-role">{message.role}</div>
          <div className="chat-content">{message.content}</div>
        </div>
      ))}
    </div>
  );
}
