import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Video, Users, Calendar, MessageSquare } from "lucide-react";

export default function TeamsApp({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full bg-[#464775]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#464775] border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-white" />
          <span className="font-semibold text-white">Microsoft Teams</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-purple-800">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <Users className="w-20 h-20 mx-auto mb-4 text-white" />
            <h2 className="text-3xl font-bold text-white mb-2">Microsoft Teams</h2>
            <p className="text-gray-300">Tiimityöskentely ja videoneuvottelut</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-6 bg-white/10 border-white/20 hover:bg-white/20 transition-colors">
              <Video className="w-8 h-8 text-white mb-3" />
              <h3 className="font-bold text-white mb-2">Kokoukset</h3>
              <p className="text-sm text-gray-300">Liity tai aloita kokous</p>
            </Card>
            <Card className="p-6 bg-white/10 border-white/20 hover:bg-white/20 transition-colors">
              <MessageSquare className="w-8 h-8 text-white mb-3" />
              <h3 className="font-bold text-white mb-2">Chat</h3>
              <p className="text-sm text-gray-300">Viestit ja keskustelut</p>
            </Card>
          </div>

          <Card className="p-6 bg-white/10 border-white/20">
            <h3 className="font-bold text-white mb-4">Tiimit</h3>
            <div className="space-y-3">
              {['Koulu', 'Projektit', 'Opettajat'].map((team, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <h4 className="font-bold text-white mb-2">{team}</h4>
                  <p className="text-sm text-gray-300">Aktiivinen tiimi</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
