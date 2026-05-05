import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { X, Video, Mic, MicOff, VideoOff, Users, Share, MessageSquare } from "lucide-react";
import { useState } from "react";

interface ZoomAppProps {
  onClose: () => void;
}

export default function ZoomApp({ onClose }: ZoomAppProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-blue-500" />
          <span className="font-semibold text-white">Zoom</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-gray-700">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="p-8 bg-gray-800 border-gray-700">
            <div className="text-center mb-6">
              <Video className="w-16 h-16 mx-auto mb-4 text-blue-500" />
              <h2 className="text-2xl font-bold text-white mb-2">Liity kokoukseen</h2>
              <p className="text-gray-400">Anna kokoustunnus liittyäksesi</p>
            </div>
            <div className="space-y-4">
              <Input placeholder="Kokoustunnus" className="bg-gray-700 border-gray-600 text-white" />
              <Input placeholder="Nimesi" className="bg-gray-700 border-gray-600 text-white" />
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <Video className="w-4 h-4 mr-2" />
                Liity
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-6 bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer">
              <Video className="w-8 h-8 text-blue-500 mb-3" />
              <h3 className="font-bold text-white mb-1">Uusi kokous</h3>
              <p className="text-sm text-gray-400">Aloita pikakokous</p>
            </Card>
            <Card className="p-6 bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer">
              <Users className="w-8 h-8 text-green-500 mb-3" />
              <h3 className="font-bold text-white mb-1">Ajoita</h3>
              <p className="text-sm text-gray-400">Suunnittele kokous</p>
            </Card>
          </div>

          <Card className="p-6 bg-gray-800 border-gray-700">
            <h3 className="font-bold text-white mb-4">Viimeisimmät kokoukset</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div>
                  <p className="font-medium text-white">Matematiikan tunti</p>
                  <p className="text-sm text-gray-400">Tänään 10:00</p>
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Liity</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center justify-center gap-4">
          <Button
            size="lg"
            variant={isMuted ? "destructive" : "secondary"}
            onClick={() => setIsMuted(!isMuted)}
            className="rounded-full w-14 h-14"
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Button
            size="lg"
            variant={isVideoOff ? "destructive" : "secondary"}
            onClick={() => setIsVideoOff(!isVideoOff)}
            className="rounded-full w-14 h-14"
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </Button>
          <Button size="lg" variant="secondary" className="rounded-full w-14 h-14">
            <Share className="w-5 h-5" />
          </Button>
          <Button size="lg" variant="secondary" className="rounded-full w-14 h-14">
            <MessageSquare className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
