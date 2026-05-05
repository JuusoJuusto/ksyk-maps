import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Mail, Send, Inbox, Star, Trash2, Search } from "lucide-react";

export default function OutlookApp() {
  const [emails, setEmails] = useState([
    { from: "Teacher", subject: "Homework Reminder", preview: "Don't forget to submit your math homework...", time: "10:30 AM", unread: true },
    { from: "Principal", subject: "School Event", preview: "We're organizing a school event next week...", time: "Yesterday", unread: true },
    { from: "Classmate", subject: "Study Group", preview: "Hey! Want to join our study group?", time: "2 days ago", unread: false },
    { from: "Library", subject: "Book Return", preview: "Your borrowed books are due soon...", time: "3 days ago", unread: false },
  ]);

  return (
    <div className="h-full flex bg-white">
      {/* Sidebar */}
      <div className="w-60 border-r flex flex-col">
        <div className="p-3">
          <Button className="w-full bg-blue-600 hover:bg-blue-700">
            <Send className="w-4 h-4 mr-2" />
            New Email
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-1">
            <Button variant="ghost" className="w-full justify-start bg-blue-50 text-blue-700">
              <Inbox className="w-4 h-4 mr-2" />
              Inbox
              <span className="ml-auto bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">2</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Star className="w-4 h-4 mr-2" />
              Starred
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Send className="w-4 h-4 mr-2" />
              Sent
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Trash2 className="w-4 h-4 mr-2" />
              Trash
            </Button>
          </div>
        </div>
      </div>

      {/* Email List */}
      <div className="w-96 border-r flex flex-col">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search emails..." className="pl-10" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {emails.map((email, idx) => (
            <div
              key={idx}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                email.unread ? "bg-blue-50" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-semibold text-sm ${email.unread ? "text-blue-700" : "text-gray-700"}`}>
                  {email.from}
                </span>
                <span className="text-xs text-gray-500">{email.time}</span>
              </div>
              <div className={`text-sm mb-1 ${email.unread ? "font-semibold" : ""}`}>
                {email.subject}
              </div>
              <div className="text-xs text-gray-600 truncate">{email.preview}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold mb-2">{emails[0].subject}</h2>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
              {emails[0].from[0]}
            </div>
            <div>
              <div className="font-semibold text-gray-800">{emails[0].from}</div>
              <div>to: me</div>
            </div>
            <div className="ml-auto">{emails[0].time}</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-gray-700 leading-relaxed">
            {emails[0].preview}
            <br /><br />
            This is the full email content. You can read all the details here.
            <br /><br />
            Best regards,<br />
            {emails[0].from}
          </p>
        </div>
        <div className="border-t p-4 flex gap-2">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Send className="w-4 h-4 mr-2" />
            Reply
          </Button>
          <Button variant="outline">Forward</Button>
          <Button variant="outline" className="ml-auto text-red-600">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
