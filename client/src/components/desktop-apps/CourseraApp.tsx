import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, GraduationCap, Play, BookOpen } from "lucide-react";

export default function CourseraApp({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-2 bg-[#0056D2] text-white border-b">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          <span className="font-semibold">Coursera</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-blue-700">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold mb-6">Omat kurssit</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {['Python ohjelmointi', 'Matematiikka', 'Tietorakenteet', 'Web-kehitys'].map((course, i) => (
              <Card key={i} className="p-6 hover:shadow-xl transition-shadow">
                <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mb-4 flex items-center justify-center">
                  <Play className="w-16 h-16 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-2">{course}</h3>
                <p className="text-sm text-gray-600 mb-4">Edistyminen: {Math.floor(Math.random() * 100)}%</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.floor(Math.random() * 100)}%` }} />
                </div>
                <Button className="w-full bg-[#0056D2]">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Jatka oppimista
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
