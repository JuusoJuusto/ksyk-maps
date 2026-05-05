import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Hash, Users, Settings, Mic, Headphones, Send } from "lucide-react";

export default function DiscordApp() {
  const [message, setMessage] = useState("");

  const channels = [
    { name: "general", unread: 3 },
    { name: "homework-help", unread: 0 },
    { name: "announcements", unread: 1 },
    { name: "random", unread: 0 },
  ];

  const messages = [
    { user: "Teacher", content: "Remember to submit your homework by Friday!", time: "10:30 AM", avatar: "👨‍🏫" },
    { user: "Student1", content: "Can someone help me with math problem 5?", time: "10:32 AM", avatar: "👨‍🎓" },
    { user: "Student2", content: "Sure! Which part are you stuck on?", time: "10:33 AM", avatar: "👩‍🎓" },
    { user: "You", content: "I can help too!", time: "10:35 AM", avatar: "😊" },
  ];

  return (
    <div className="h-full flex bg-gray-800 text-white">
      {/* Server Sidebar */}
      <div className="w-16 bg-gray-900 flex flex-col items-center py-3 gap-2">
        <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-xl font-bold cursor-pointer hover:rounded-xl transition-all">
          K
        </div>
        <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-xl cursor-pointer hover:rounded-xl transition-all">
          +
        </div>
      </div>

      {/* Channels Sidebar */}
      <div className="w-60 bg-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="font-bold text-lg">KSYK Server</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-400 mb-2 px-2">TEXT CHANNELS</div>
            {channels.map((channel, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-700 cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{channel.name}</span>
                </div>
                {channel.unread > 0 && (
                  <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-xs">
                    {channel.unread}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400 mb-2 px-2">VOICE CHANNELS</div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700 cursor-pointer">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm">Study Room</span>
            </div>
          </div>
        </div>
        <div className="p-2 bg-gray-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-sm">
              😊
            </div>
            <div className="text-xs">
              <div className="font-semibold">You</div>
              <div className="text-gray-400">#1234</div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <Mic className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <Headphones className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center gap-2">
          <Hash className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold">general</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                {msg.avatar}
              </div>
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-semibold">{msg.user}</span>
                  <span className="text-xs text-gray-400">{msg.time}</span>
                </div>
                <p className="text-sm text-gray-200">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message #general"
              className="bg-gray-700 border-0 text-white placeholder:text-gray-400"
              onKeyPress={(e) => {
                if (e.key === "Enter" && message.trim()) {
                  alert(`Sent: ${message}`);
                  setMessage("");
                }
              }}
            />
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
