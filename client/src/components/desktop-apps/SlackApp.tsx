import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { X, Hash, Send, Smile, Paperclip } from "lucide-react";
import { useState } from "react";

export default function SlackApp({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState("");

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-2 bg-[#4A154B] text-white border-b">
        <div className="flex items-center gap-2">
          <Hash className="w-5 h-5" />
          <span className="font-semibold">Slack</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-purple-800">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-[#3F0E40] text-white p-4 overflow-auto">
          <h3 className="font-bold mb-3">Kanavat</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 hover:bg-purple-800 rounded cursor-pointer">
              <Hash className="w-4 h-4" />
              <span className="text-sm">yleinen</span>
            </div>
            <div className="flex items-center gap-2 p-2 hover:bg-purple-800 rounded cursor-pointer">
              <Hash className="w-4 h-4" />
              <span className="text-sm">koulu</span>
            </div>
            <div className="flex items-center gap-2 p-2 hover:bg-purple-800 rounded cursor-pointer">
              <Hash className="w-4 h-4" />
              <span className="text-sm">projektit</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-auto p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded flex items-center justify-center text-white font-bold">
                U
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold">Käyttäjä</span>
                  <span className="text-xs text-gray-500">10:30</span>
                </div>
                <p className="text-gray-700">Hei kaikki! Miten menee?</p>
              </div>
            </div>
          </div>

          <div className="p-4 border-t">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Kirjoita viesti..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1"
              />
              <Button size="icon" variant="ghost">
                <Smile className="w-5 h-5" />
              </Button>
              <Button size="icon" variant="ghost">
                <Paperclip className="w-5 h-5" />
              </Button>
              <Button size="icon" className="bg-[#4A154B] hover:bg-purple-800">
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
