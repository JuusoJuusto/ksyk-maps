import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, GraduationCap, BookOpen, Award } from "lucide-react";

export default function KhanAcademyApp({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-2 bg-[#14BF96] text-white border-b">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          <span className="font-semibold">Khan Academy</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-green-600">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold mb-6">Oppimispolkusi</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {['Matematiikka', 'Fysiikka', 'Kemia', 'Biologia'].map((subject, i) => (
              <Card key={i} className="p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">{subject}</h3>
                    <p className="text-sm text-gray-600">{Math.floor(Math.random() * 100)}% valmis</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div className="bg-green-500 h-3 rounded-full" style={{ width: `${Math.floor(Math.random() * 100)}%` }} />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <span>{Math.floor(Math.random() * 50)} pistettä</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
