import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Heart, Share2, Trash2 } from "lucide-react";

export default function PhotosApp() {
  const albums = [
    { name: "School Events", count: 45, cover: "🎓" },
    { name: "Friends", count: 128, cover: "👥" },
    { name: "Nature", count: 67, cover: "🌲" },
    { name: "Favorites", count: 23, cover: "⭐" },
  ];

  const photos = [
    "🏫", "📚", "🎨", "⚽", "🎵", "🌅", "🌸", "🎭", "🏀", "🎪", "🌈", "🎯"
  ];

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 to-purple-50 overflow-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Photos</h1>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>

        {/* Albums */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Albums</h2>
          <div className="grid grid-cols-4 gap-4">
            {albums.map((album, idx) => (
              <Card key={idx} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
                <div className="aspect-square bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-6xl">
                  {album.cover}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold">{album.name}</h3>
                  <p className="text-sm text-gray-600">{album.count} photos</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Photos */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent</h2>
          <div className="grid grid-cols-6 gap-3">
            {photos.map((photo, idx) => (
              <Card key={idx} className="aspect-square overflow-hidden cursor-pointer hover:scale-105 transition-transform group relative">
                <div className="w-full h-full bg-gradient-to-br from-pink-400 to-orange-500 flex items-center justify-center text-4xl">
                  {photo}
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="icon" variant="ghost" className="text-white hover:bg-white/20">
                    <Heart className="w-5 h-5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-white hover:bg-white/20">
                    <Share2 className="w-5 h-5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-white hover:bg-white/20">
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
