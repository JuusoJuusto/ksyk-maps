import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Brain, Plus, BookOpen } from "lucide-react";

export default function QuizletApp({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-2 bg-[#4255FF] text-white border-b">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          <span className="font-semibold">Quizlet</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-blue-600">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold">Omat kortit</h2>
            <Button className="bg-[#4255FF]">
              <Plus className="w-4 h-4 mr-2" />
              Luo uusi
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['Englannin sanat', 'Matematiikan kaavat', 'Historian päivämäärät', 'Kemian alkuaineet'].map((set, i) => (
              <Card key={i} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center gap-3 mb-4">
                  <BookOpen className="w-8 h-8 text-blue-600" />
                  <div>
                    <h3 className="font-bold text-lg">{set}</h3>
                    <p className="text-sm text-gray-600">{Math.floor(Math.random() * 100)} korttia</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-blue-600">Opiskele</Button>
                  <Button size="sm" variant="outline" className="flex-1">Testi</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
