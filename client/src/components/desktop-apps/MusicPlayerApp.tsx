import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Music } from "lucide-react";

interface Track {
  id: number;
  title: string;
  artist: string;
  url: string;
  duration: string;
}

export default function MusicPlayerApp() {
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);

  const tracks: Track[] = [
    {
      id: 1,
      title: "Lo-Fi Study Beats",
      artist: "ChilledCow",
      url: "https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1",
      duration: "LIVE"
    },
    {
      id: 2,
      title: "Peaceful Piano",
      artist: "Relaxing Music",
      url: "https://www.youtube.com/embed/lTRiuFIWV54?autoplay=1",
      duration: "LIVE"
    },
    {
      id: 3,
      title: "Jazz Cafe",
      artist: "Smooth Jazz",
      url: "https://www.youtube.com/embed/Dx5qFachd3A?autoplay=1",
      duration: "LIVE"
    },
    {
      id: 4,
      title: "Nature Sounds",
      artist: "Ambient",
      url: "https://www.youtube.com/embed/eKFTSSKCzWA?autoplay=1",
      duration: "LIVE"
    }
  ];

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    setCurrentTrack((prev) => (prev + 1) % tracks.length);
    setIsPlaying(true);
  };

  const handlePrevious = () => {
    setCurrentTrack((prev) => (prev - 1 + tracks.length) % tracks.length);
    setIsPlaying(true);
  };

  const handleTrackSelect = (index: number) => {
    setCurrentTrack(index);
    setIsPlaying(true);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 text-white">
      {/* Now Playing */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-64 h-64 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-2xl mb-8 flex items-center justify-center">
          <Music className="w-32 h-32 text-white/80" />
        </div>
        
        <h2 className="text-3xl font-bold mb-2">{tracks[currentTrack].title}</h2>
        <p className="text-xl text-white/70 mb-8">{tracks[currentTrack].artist}</p>

        {/* Player iframe (hidden) */}
        {isPlaying && (
          <iframe
            src={tracks[currentTrack].url}
            className="hidden"
            allow="autoplay"
          />
        )}

        {/* Controls */}
        <div className="flex items-center gap-6 mb-8">
          <Button
            size="lg"
            variant="ghost"
            onClick={handlePrevious}
            className="text-white hover:bg-white/10 rounded-full w-14 h-14"
          >
            <SkipBack className="w-6 h-6" />
          </Button>
          
          <Button
            size="lg"
            onClick={handlePlayPause}
            className="bg-white text-purple-900 hover:bg-gray-100 rounded-full w-16 h-16"
          >
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </Button>
          
          <Button
            size="lg"
            variant="ghost"
            onClick={handleNext}
            className="text-white hover:bg-white/10 rounded-full w-14 h-14"
          >
            <SkipForward className="w-6 h-6" />
          </Button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-4 w-64">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsMuted(!isMuted)}
            className="text-white hover:bg-white/10"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(parseInt(e.target.value));
              setIsMuted(false);
            }}
            className="flex-1"
          />
          <span className="text-sm w-12 text-right">{isMuted ? 0 : volume}%</span>
        </div>
      </div>

      {/* Playlist */}
      <div className="bg-black/30 backdrop-blur-sm border-t border-white/10 p-4">
        <h3 className="text-lg font-semibold mb-3">Soittolista</h3>
        <div className="space-y-2">
          {tracks.map((track, index) => (
            <button
              key={track.id}
              onClick={() => handleTrackSelect(index)}
              className={`w-full p-3 rounded-lg text-left transition-all ${
                currentTrack === index
                  ? "bg-white/20 border-2 border-white/40"
                  : "bg-white/5 hover:bg-white/10 border-2 border-transparent"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{track.title}</p>
                  <p className="text-sm text-white/60">{track.artist}</p>
                </div>
                <span className="text-sm text-white/60">{track.duration}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
