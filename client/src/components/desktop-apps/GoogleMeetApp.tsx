import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { X, Video, Plus, Calendar } from "lucide-react";

export default function GoogleMeetApp({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-green-600" />
          <span className="font-semibold">Google Meet</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <Video className="w-20 h-20 mx-auto mb-4 text-green-600" />
            <h2 className="text-3xl font-bold mb-2">Google Meet</h2>
            <p className="text-gray-600">Turvallisia videokokouksia kaikille</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <Plus className="w-12 h-12 text-green-600 mb-3" />
              <h3 className="font-bold mb-2">Uusi kokous</h3>
              <p className="text-sm text-gray-600">Aloita pikakokous</p>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <Calendar className="w-12 h-12 text-blue-600 mb-3" />
              <h3 className="font-bold mb-2">Ajoita</h3>
              <p className="text-sm text-gray-600">Suunnittele myöhemmäksi</p>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-bold mb-4">Liity kokoukseen</h3>
            <div className="flex gap-2">
              <Input placeholder="Anna kokouksen koodi" className="flex-1" />
              <Button className="bg-green-600">Liity</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
