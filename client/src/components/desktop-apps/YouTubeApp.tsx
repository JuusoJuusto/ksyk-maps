import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Home, Compass, PlaySquare, Clock, ThumbsUp } from "lucide-react";

export default function YouTubeApp() {
  const [searchQuery, setSearchQuery] = useState("");

  const videos = [
    { title: "Learn React in 2024", channel: "Code Academy", views: "1.2M", thumbnail: "🎓", duration: "45:23" },
    { title: "Math Tutorial - Algebra", channel: "Math Master", views: "856K", thumbnail: "📐", duration: "32:15" },
    { title: "History of Finland", channel: "History Channel", views: "2.1M", thumbnail: "🏛️", duration: "28:47" },
    { title: "Science Experiments", channel: "Science Fun", views: "3.4M", thumbnail: "🔬", duration: "15:30" },
    { title: "Music Theory Basics", channel: "Music School", views: "678K", thumbnail: "🎵", duration: "22:18" },
    { title: "Art Techniques", channel: "Art Studio", views: "1.5M", thumbnail: "🎨", duration: "38:42" },
  ];

  return (
    <div className="h-full flex bg-white">
      {/* Sidebar */}
      <div className="w-60 border-r overflow-y-auto">
        <div className="p-3 space-y-1">
          <Button variant="ghost" className="w-full justify-start gap-3 bg-gray-100">
            <Home className="w-5 h-5" />
            <span>Home</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Compass className="w-5 h-5" />
            <span>Explore</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <PlaySquare className="w-5 h-5" />
            <span>Subscriptions</span>
          </Button>
          <div className="border-t my-2" />
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Clock className="w-5 h-5" />
            <span>History</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <ThumbsUp className="w-5 h-5" />
            <span>Liked videos</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center gap-4">
          <div className="flex items-center gap-2">
            <PlaySquare className="w-8 h-8 text-red-600" />
            <span className="text-xl font-bold">YouTube</span>
          </div>
          <div className="flex-1 max-w-2xl">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="flex-1"
              />
              <Button className="bg-gray-100 hover:bg-gray-200 text-black">
                <Search className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-4">
            {videos.map((video, idx) => (
              <Card key={idx} className="cursor-pointer hover:shadow-lg transition-shadow border-0">
                <div className="relative">
                  <div className="aspect-video bg-gradient-to-br from-red-500 to-pink-500 rounded-t-lg flex items-center justify-center text-6xl">
                    {video.thumbnail}
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                    {video.duration}
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">{video.title}</h3>
                  <p className="text-xs text-gray-600">{video.channel}</p>
                  <p className="text-xs text-gray-600">{video.views} views</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
