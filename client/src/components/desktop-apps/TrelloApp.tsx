import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Trello, Plus } from "lucide-react";

export default function TrelloApp({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full bg-[#0079BF]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#0079BF] border-b border-blue-700">
        <div className="flex items-center gap-2">
          <Trello className="w-5 h-5 text-white" />
          <span className="font-semibold text-white">Trello</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-blue-700">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="flex gap-4 overflow-x-auto">
          {['Tehtävät', 'Työn alla', 'Valmis'].map((list, i) => (
            <div key={i} className="flex-shrink-0 w-72">
              <Card className="p-4 bg-gray-100">
                <h3 className="font-bold mb-4">{list}</h3>
                <div className="space-y-3">
                  <Card className="p-3 bg-white hover:shadow-md transition-shadow cursor-pointer">
                    <p className="font-medium">Tehtävä {i + 1}</p>
                  </Card>
                </div>
                <Button variant="ghost" className="w-full mt-3">
                  <Plus className="w-4 h-4 mr-2" />
                  Lisää kortti
                </Button>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
