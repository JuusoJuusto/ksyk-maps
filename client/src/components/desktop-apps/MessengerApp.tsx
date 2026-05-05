import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Phone, Video, Info } from "lucide-react";

export default function MessengerApp() {
  const [message, setMessage] = useState("");

  const chats = [
    { name: "Math Study Group", lastMsg: "See you tomorrow!", time: "2m", avatar: "📚", unread: 2 },
    { name: "Emma Wilson", lastMsg: "Thanks for the notes!", time: "1h", avatar: "👩", unread: 0 },
    { name: "Class 9A", lastMsg: "Homework due Friday", time: "3h", avatar: "🎓", unread: 5 },
    { name: "John Smith", lastMsg: "Let's meet at library", time: "5h", avatar: "👨", unread: 0 },
  ];

  const messages = [
    { sender: "Emma", content: "Hey! Did you finish the math homework?", time: "10:30", isMine: false },
    { sender: "You", content: "Yes! It was challenging but I got it done", time: "10:32", isMine: true },
    { sender: "Emma", content: "Can you help me with problem 5?", time: "10:33", isMine: false },
    { sender: "You", content: "Sure! Let me explain...", time: "10:35", isMine: true },
  ];

  return (
    <div className="h-full flex bg-white">
      {/* Chats List */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Chats</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat, idx) => (
            <div
              key={idx}
              className="p-4 border-b hover:bg-gray-50 cursor-pointer flex items-center gap-3"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
                {chat.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold truncate">{chat.name}</h3>
                  <span className="text-xs text-gray-500">{chat.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 truncate">{chat.lastMsg}</p>
                  {chat.unread > 0 && (
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0 ml-2">
                      {chat.unread}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-xl">
              👩
            </div>
            <div>
              <h3 className="font-semibold">Emma Wilson</h3>
              <p className="text-xs text-green-600">Active now</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon">
              <Phone className="w-5 h-5 text-blue-600" />
            </Button>
            <Button variant="ghost" size="icon">
              <Video className="w-5 h-5 text-blue-600" />
            </Button>
            <Button variant="ghost" size="icon">
              <Info className="w-5 h-5 text-blue-600" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs ${msg.isMine ? "bg-blue-600 text-white" : "bg-gray-200 text-black"} rounded-2xl px-4 py-2`}>
                <p className="text-sm">{msg.content}</p>
                <p className={`text-xs mt-1 ${msg.isMine ? "text-blue-100" : "text-gray-500"}`}>
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              onKeyPress={(e) => {
                if (e.key === "Enter" && message.trim()) {
                  alert(`Sent: ${message}`);
                  setMessage("");
                }
              }}
            />
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
