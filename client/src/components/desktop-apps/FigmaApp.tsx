import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Figma, Plus } from "lucide-react";

export default function FigmaApp({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full bg-[#1E1E1E]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#2C2C2C] border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Figma className="w-5 h-5 text-white" />
          <span className="font-semibold text-white">Figma</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-gray-700">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <Figma className="w-20 h-20 mx-auto mb-4 text-white" />
            <h2 className="text-3xl font-bold text-white mb-2">Figma</h2>
            <p className="text-gray-400">Suunnittele ja prototyyppaa</p>
          </div>

          <Button className="w-full bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Uusi suunnitelma
          </Button>

          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 bg-[#2C2C2C] border-gray-700 hover:bg-[#333] transition-colors cursor-pointer">
                <div className="aspect-video bg-gray-700 rounded mb-3" />
                <h3 className="font-bold text-white">Projekti {i}</h3>
                <p className="text-sm text-gray-400">Muokattu eilen</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
