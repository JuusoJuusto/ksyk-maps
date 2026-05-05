import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Video, Star } from "lucide-react";

export default function UdemyApp({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-2 bg-[#A435F0] text-white border-b">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          <span className="font-semibold">Udemy</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-purple-700">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold mb-6">Oppimiseni</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Git'].map((course, i) => (
              <Card key={i} className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="aspect-video bg-gray-200 rounded mb-3" />
                <h3 className="font-bold mb-2">{course} kurssi</h3>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-600">{Math.floor(Math.random() * 50)} tuntia</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
