import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Video, Mic, PhoneOff, Users, MessageSquare, Calendar, Files } from "lucide-react";

export default function TeamsApp() {
  const [inCall, setInCall] = useState(false);

  const teams = [
    { name: "Class 9A", members: 28, unread: 3 },
    { name: "Math Study Group", members: 5, unread: 0 },
    { name: "Science Project", members: 4, unread: 1 },
  ];

  return (
    <div className="h-full flex bg-white">
      {/* Sidebar */}
      <div className="w-16 bg-gray-800 flex flex-col items-center py-4 gap-4">
        <Button variant="ghost" size="icon" className="text-white hover:bg-gray-700">
          <MessageSquare className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-white hover:bg-gray-700 bg-purple-600">
          <Users className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-white hover:bg-gray-700">
          <Calendar className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-white hover:bg-gray-700">
          <Files className="w-5 h-5" />
        </Button>
      </div>

      {/* Teams List */}
      <div className="w-72 border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg mb-3">Teams</h2>
          <Input placeholder="Search teams..." />
        </div>
        <div className="flex-1 overflow-y-auto">
          {teams.map((team, idx) => (
            <div key={idx} className="p-4 border-b hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">{team.name}</span>
                {team.unread > 0 && (
                  <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {team.unread}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">{team.members} members</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {!inCall ? (
          <>
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold mb-2">Class 9A</h2>
              <p className="text-gray-600">28 members • 3 new messages</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  T
                </div>
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-semibold">Teacher</span>
                    <span className="text-xs text-gray-500">10:30 AM</span>
                  </div>
                  <p className="text-sm">Don't forget about tomorrow's test!</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  E
                </div>
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-semibold">Emma</span>
                    <span className="text-xs text-gray-500">10:32 AM</span>
                  </div>
                  <p className="text-sm">Can someone share the study notes?</p>
                </div>
              </div>
            </div>
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input placeholder="Type a message..." className="flex-1" />
                <Button className="bg-purple-600 hover:bg-purple-700">Send</Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-900">
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="w-64 h-48 bg-gray-800 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2">
                      {i === 1 ? "Y" : i === 2 ? "T" : i === 3 ? "E" : "J"}
                    </div>
                    <p className="text-white text-sm">
                      {i === 1 ? "You" : i === 2 ? "Teacher" : i === 3 ? "Emma" : "John"}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
            <div className="flex gap-4">
              <Button size="lg" variant="outline" className="rounded-full w-14 h-14">
                <Mic className="w-6 h-6" />
              </Button>
              <Button size="lg" variant="outline" className="rounded-full w-14 h-14">
                <Video className="w-6 h-6" />
              </Button>
              <Button
                size="lg"
                className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700"
                onClick={() => setInCall(false)}
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </div>
          </div>
        )}
        {!inCall && (
          <div className="border-t p-4 bg-gray-50">
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700"
              onClick={() => setInCall(true)}
            >
              <Video className="w-4 h-4 mr-2" />
              Start Meeting
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
