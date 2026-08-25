const TypingIndicator = ({
  users = [],
}) => {
  if (!users.length) {
    return null;
  }

  const names = users.map(
    (user) =>
      user.username ||
      "Someone",
  );

  let text;

  if (names.length === 1) {
    text = `${names[0]} is typing`;
  } else if (names.length === 2) {
    text = `${names[0]} and ${names[1]} are typing`;
  } else {
    text = `${names[0]} and ${names.length - 1} others are typing`;
  }

  return (
    <div className="flex h-8 items-center px-6 text-xs text-indigo-400 font-medium">
      <span>{text}</span>

      <div className="ml-2 flex items-center gap-1">
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.3s]"></div>
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.15s]"></div>
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400"></div>
      </div>
    </div>
  );
};

export default TypingIndicator;