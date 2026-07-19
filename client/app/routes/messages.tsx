import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/axios";
import { useMe } from "~/hooks/useMe";
import type { APIResponse, UserDto, MessageDto, ConversationDto } from "~/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { 
  SearchIcon, 
  SendIcon, 
  MessageSquareIcon, 
  UserPlusIcon, 
  ArrowLeftIcon,
  Loader2Icon,
  CornerUpLeftIcon,
  XIcon
} from "lucide-react";
import { toast } from "sonner";

// INDIVIDUAL MESSAGE ITEM COMPONENT WITH GESTURE SWIPING & HOVER REPLY
interface MessageBubbleItemProps {
  msg: MessageDto;
  isMe: boolean;
  meId?: string;
  onReply: (msg: MessageDto) => void;
  getInitials: (name: string) => string;
  formatTime: (isoString: string) => string;
  onScrollToMessage: (id: number) => void;
  isHighlighted: boolean;
}

function MessageBubbleItem({
  msg,
  isMe,
  meId,
  onReply,
  getInitials,
  formatTime,
  onScrollToMessage,
  isHighlighted,
}: MessageBubbleItemProps) {
  const [startX, setStartX] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diffX = currentX - startX;

    // Swipe right to reply (friction & cap at 70px)
    if (diffX > 0) {
      const drag = Math.min(diffX * 0.4, 70);
      setOffsetX(drag);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (offsetX >= 40) {
      onReply(msg);
    }
    setOffsetX(0);
  };

  const parentSenderName = msg.parentMessage
    ? msg.parentMessage.senderId === meId
      ? "You"
      : msg.parentMessage.sender?.name || "User"
    : "";

  return (
    <div
      id={`message-${msg.id}`}
      className={`group relative flex w-full items-center my-1 select-none transition-all duration-300 ${
        isMe ? "justify-end" : "justify-start"
      }`}
    >
      {/* Slide-to-reply background indicator */}
      {offsetX > 0 && (
        <div
          className="absolute left-2 flex items-center gap-2 text-primary transition-opacity"
          style={{ opacity: Math.min(offsetX / 40, 1) }}
        >
          <CornerUpLeftIcon className="h-4 w-4 animate-pulse" />
          <span className="text-[10px] font-semibold">Reply</span>
        </div>
      )}

      {/* Main Drag/Slide wrapper */}
      <div
        ref={bubbleRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex items-center gap-2 transition-transform duration-200"
        style={{
          transform: `translateX(${offsetX}px)`,
          maxWidth: "75%",
        }}
      >
        {/* Desktop Quick-Reply button (Reveals on hover) */}
        {!isMe && (
          <div className="order-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 duration-200">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onReply(msg)}
              className="h-8 w-8 rounded-full hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
            >
              <CornerUpLeftIcon className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div
          className={`flex flex-col relative px-4 py-2.5 rounded-2xl shadow-sm leading-relaxed text-sm ${
            isMe
              ? "bg-primary text-primary-foreground rounded-br-none order-1"
              : "bg-card text-foreground border border-border rounded-bl-none order-1"
          } ${
            isHighlighted 
              ? "ring-4 ring-primary/40 scale-[1.02] transition-all duration-300 shadow-lg" 
              : ""
          }`}
        >
          {/* Quoted parent message block */}
          {msg.parentMessage && (
            <button
              onClick={() => onScrollToMessage(msg.parentMessageId!)}
              className={`block w-full text-left p-2 mb-2 rounded-lg border-l-4 text-xs select-none transition-colors ${
                isMe
                  ? "bg-black/10 text-primary-foreground/90 border-primary-foreground/50 hover:bg-black/20"
                  : "bg-muted text-muted-foreground border-primary hover:bg-muted/70"
              }`}
            >
              <p className="font-bold mb-0.5">{parentSenderName}</p>
              <p className="truncate line-clamp-1">{msg.parentMessage.content}</p>
            </button>
          )}

          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          <span
            className={`block text-[9px] text-right mt-1 font-medium ${
              isMe ? "text-primary-foreground/70" : "text-muted-foreground"
            }`}
          >
            {formatTime(msg.createdAt)}
          </span>
        </div>

        {/* Desktop Quick-Reply button for self messages */}
        {isMe && (
          <div className="order-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 duration-200">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onReply(msg)}
              className="h-8 w-8 rounded-full hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
            >
              <CornerUpLeftIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// MAIN MESSAGES VIEW
export default function MessagesRoute() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDto | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [replyingTo, setReplyingTo] = useState<MessageDto | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Fetch Conversations List
  const { data: conversations = [], isLoading: isConversationsLoading } = useQuery<ConversationDto[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await api.get<APIResponse>("/api/messages/conversations");
      return res.data.data;
    },
    refetchInterval: 3000,
  });

  // Fetch User Search Results
  const { data: searchResults = [], isLoading: isSearching } = useQuery<UserDto[]>({
    queryKey: ["users-search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const res = await api.get<APIResponse>(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      return res.data.data;
    },
    enabled: searchQuery.trim().length > 0,
  });

  // Fetch Chat History
  const { data: chatHistory = [], isLoading: isChatLoading } = useQuery<MessageDto[]>({
    queryKey: ["chat-history", selectedUserId],
    queryFn: async () => {
      const res = await api.get<APIResponse>(`/api/messages/${selectedUserId}`);
      return res.data.data;
    },
    enabled: !!selectedUserId,
    refetchInterval: 3000,
  });

  const activePartner = selectedUser;

  // Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, parentMessageId }: { content: string; parentMessageId?: number | null }) => {
      const res = await api.post<APIResponse>("/api/messages", {
        receiverId: selectedUserId,
        content,
        parentMessageId,
      });
      return res.data.data;
    },
    onSuccess: (newMessage) => {
      setMessageInput("");
      setReplyingTo(null);
      // Optimistic update of chat history
      queryClient.setQueryData<MessageDto[]>(["chat-history", selectedUserId], (old) => {
        if (!old) return [newMessage];
        return [...old, newMessage];
      });
      // Invalidate conversations to update last message
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setTimeout(scrollToBottom, 50);
    },
    onError: () => {
      toast.error("Failed to send message. Please try again.");
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || sendMessageMutation.isPending || !selectedUserId) return;
    sendMessageMutation.mutate({
      content: messageInput.trim(),
      parentMessageId: replyingTo?.id || null,
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom when chat opens or new messages arrive
  useEffect(() => {
    if (chatHistory.length > 0 && !replyingTo) {
      scrollToBottom();
    }
  }, [chatHistory.length, selectedUserId]);

  const selectUserFromSearch = (user: UserDto) => {
    setSelectedUser(user);
    setSelectedUserId(user.id);
    setSearchQuery(""); // Clear search to show recent conversations
  };

  const getInitials = (name: string = "") => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateLabel = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    }
  };

  // Click quoted bubble -> scroll to parent message + visual highlight animation
  const handleScrollToMessage = (parentMessageId: number) => {
    const targetElement = document.getElementById(`message-${parentMessageId}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(parentMessageId);
      // Remove flash highlight after 1.5 seconds
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 1500);
    } else {
      toast.info("Original message not loaded in thread");
    }
  };

  return (
    <div className="flex h-[calc(100vh-53px)] md:h-screen w-full bg-background overflow-hidden border-r">
      {/* LEFT SIDEBAR: Conversations List & Search */}
      <div
        className={`${
          selectedUserId ? "hidden md:flex" : "flex"
        } w-full md:w-80 lg:w-96 flex-col border-r border-border shrink-0 bg-card`}
      >
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight">Messages</h1>
          </div>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search students or faculties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-none rounded-xl"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {searchQuery.trim().length > 0 ? (
            /* Search Results View */
            <div className="p-2 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground px-3 py-1 flex items-center gap-1">
                <UserPlusIcon className="h-3 w-3" />
                Search Results
              </p>
              {isSearching ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2Icon className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => selectUserFromSearch(user)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent text-left transition-all"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.image || undefined} alt={user.name} />
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">@{user.username || "student"}</p>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No users found matching "{searchQuery}"</p>
              )}
            </div>
          ) : (
            /* Conversations List View */
            <div className="p-2 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground px-3 py-1">Recent Chats</p>
              {isConversationsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2Icon className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : conversations.length > 0 ? (
                conversations.map((chat) => {
                  const isActive = chat.user.id === selectedUserId;
                  const isSentByMe = chat.lastMessage.senderId === me?.id;
                  return (
                    <button
                      key={chat.user.id}
                      onClick={() => {
                        setSelectedUserId(chat.user.id);
                        setSelectedUser(chat.user);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[0.99]"
                          : "hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      <Avatar className="h-11 w-11 border-2 border-background/20">
                        <AvatarImage src={chat.user.image || undefined} alt={chat.user.name} />
                        <AvatarFallback>{getInitials(chat.user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <p className={`font-semibold truncate ${isActive ? "text-primary-foreground" : "text-foreground"}`}>
                            {chat.user.name}
                          </p>
                          <span className={`text-[10px] shrink-0 ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                            {formatTime(chat.lastMessage.createdAt)}
                          </span>
                        </div>
                        <p className={`text-xs truncate ${isActive ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
                          {isSentByMe ? "You: " : ""}{chat.lastMessage.content}
                        </p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-12 px-4 space-y-2">
                  <MessageSquareIcon className="h-10 w-10 text-muted-foreground/60 mx-auto" />
                  <p className="text-sm font-medium text-muted-foreground">No conversations yet</p>
                  <p className="text-xs text-muted-foreground/80">Search for students or faculty members above to start messaging.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Chat Area */}
      <div
        className={`${
          selectedUserId ? "flex" : "hidden md:flex"
        } flex-1 flex-col h-full bg-background`}
      >
        {selectedUserId && activePartner ? (
          <>
            {/* Chat Window Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 backdrop-blur">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedUserId(null);
                  setSelectedUser(null);
                  setReplyingTo(null);
                }}
                className="md:hidden"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={activePartner.image || undefined} alt={activePartner.name} />
                <AvatarFallback>{getInitials(activePartner.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-foreground truncate">{activePartner.name}</h2>
                <p className="text-xs text-muted-foreground truncate">@{activePartner.username || "student"}</p>
              </div>
            </div>

            {/* Messages Scroll Thread */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10"
            >
              {isChatLoading && chatHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full space-y-2">
                  <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Loading chat history...</p>
                </div>
              ) : chatHistory.length > 0 ? (
                chatHistory.map((msg, index) => {
                  const isMe = msg.senderId === me?.id;
                  const showDateLabel =
                    index === 0 ||
                    formatDateLabel(chatHistory[index - 1].createdAt) !== formatDateLabel(msg.createdAt);

                  return (
                    <div key={msg.id} className="space-y-2">
                      {showDateLabel && (
                        <div className="flex justify-center my-3">
                          <span className="text-[10px] font-semibold bg-muted px-2.5 py-1 rounded-md text-muted-foreground">
                            {formatDateLabel(msg.createdAt)}
                          </span>
                        </div>
                      )}
                      
                      <MessageBubbleItem
                        msg={msg}
                        isMe={isMe}
                        meId={me?.id}
                        onReply={setReplyingTo}
                        getInitials={getInitials}
                        formatTime={formatTime}
                        onScrollToMessage={handleScrollToMessage}
                        isHighlighted={highlightedMessageId === msg.id}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-12">
                  <Avatar className="h-16 w-16 mb-2">
                    <AvatarImage src={activePartner.image || undefined} alt={activePartner.name} />
                    <AvatarFallback>{getInitials(activePartner.name)}</AvatarFallback>
                  </Avatar>
                  <p className="font-semibold text-foreground">Say hello to {activePartner.name}!</p>
                  <p className="text-xs text-muted-foreground max-w-xs">This is the start of your message history with @{activePartner.username || "student"}.</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Replying Preview Bar */}
            {replyingTo && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/40 animate-slide-up">
                <div className="flex items-center gap-3 border-l-4 border-primary pl-3 py-1">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-primary">
                      Replying to {replyingTo.senderId === me?.id ? "yourself" : replyingTo.sender?.name || "User"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-lg line-clamp-1">
                      {replyingTo.content}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setReplyingTo(null)}
                  className="h-7 w-7 rounded-full hover:bg-muted"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Message Input Box */}
            <form
              onSubmit={handleSend}
              className="p-4 border-t border-border bg-card flex items-center gap-2"
            >
              <Input
                placeholder={`Message ${activePartner.name}...`}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                disabled={sendMessageMutation.isPending}
                className="flex-1 rounded-xl bg-muted/40 border-none h-11"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!messageInput.trim() || sendMessageMutation.isPending}
                className="h-11 w-11 rounded-xl shrink-0 transition-transform active:scale-95"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2Icon className="h-5 w-5 animate-spin" />
                ) : (
                  <SendIcon className="h-4 w-4" />
                )}
              </Button>
            </form>
          </>
        ) : (
          /* Empty Chat Area State */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/5">
            <div className="p-4 rounded-full bg-primary/10 mb-4 animate-bounce">
              <MessageSquareIcon className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-bold">Direct Messaging</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-2">
              Select a fellow student or faculty member from your recent chats or start typing their name to send a direct message.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
