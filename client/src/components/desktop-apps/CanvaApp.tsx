import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Palette, Plus } from "lucide-react";

export default function CanvaApp({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-2 bg-[#00C4CC] text-white border-b">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          <span className="font-semibold">Canva</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-cyan-600">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold mb-6">Luo suunnitelma</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Esitys', 'Juliste', 'Instagram', 'Logo', 'Kortti', 'Banneri', 'Infografiikka', 'Video'].map((type, i) => (
              <Card key={i} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="aspect-square bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg mb-3 flex items-center justify-center">
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-center">{type}</h3>
              </Card>
            ))}
          </div>

          <Card className="p-6">
            <h3 className="font-bold mb-4">Viimeisimmät suunnitelmat</h3>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-video bg-gray-200 rounded-lg" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
