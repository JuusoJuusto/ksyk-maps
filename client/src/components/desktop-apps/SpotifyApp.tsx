import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, SkipForward, SkipBack, Volume2, Heart, Shuffle, Repeat } from "lucide-react";

export default function SpotifyApp() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState({
    title: "Blinding Lights",
    artist: "The Weeknd",
    album: "After Hours",
    duration: "3:20",
    progress: 45,
  });

  const playlists = [
    { name: "Today's Top Hits", songs: 50, image: "🎵" },
    { name: "Chill Vibes", songs: 32, image: "🌊" },
    { name: "Workout Mix", songs: 28, image: "💪" },
    { name: "Study Focus", songs: 45, image: "📚" },
  ];

  return (
    <div className="h-full bg-gradient-to-br from-gray-900 via-green-900 to-black text-white overflow-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Good evening</h1>
        </div>

        {/* Playlists Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {playlists.map((playlist, idx) => (
            <Card
              key={idx}
              className="bg-gray-800/50 hover:bg-gray-700/50 p-4 cursor-pointer transition-all border-0"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded flex items-center justify-center text-3xl">
                  {playlist.image}
                </div>
                <div>
                  <h3 className="font-bold">{playlist.name}</h3>
                  <p className="text-sm text-gray-400">{playlist.songs} songs</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Now Playing */}
        <Card className="bg-gray-800 border-0 p-6">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-4xl">
              🎵
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">{currentSong.title}</h2>
              <p className="text-gray-400">{currentSong.artist}</p>
            </div>
            <Button variant="ghost" size="icon" className="text-green-500">
              <Heart className="w-6 h-6" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="w-full bg-gray-700 h-1 rounded-full mb-2">
              <div
                className="bg-green-500 h-1 rounded-full"
                style={{ width: `${currentSong.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>1:32</span>
              <span>{currentSong.duration}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <Shuffle className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <SkipBack className="w-6 h-6" />
            </Button>
            <Button
              size="icon"
              className="w-12 h-12 bg-white hover:bg-gray-200 text-black rounded-full"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <SkipForward className="w-6 h-6" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <Repeat className="w-5 h-5" />
            </Button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3 mt-6">
            <Volume2 className="w-5 h-5 text-gray-400" />
            <div className="flex-1 bg-gray-700 h-1 rounded-full">
              <div className="bg-white h-1 rounded-full w-2/3" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
