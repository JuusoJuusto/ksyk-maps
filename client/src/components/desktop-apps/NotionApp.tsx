import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, FileText, Plus, Folder } from "lucide-react";

export default function NotionApp({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          <span className="font-semibold">Notion</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex">
        <div className="w-64 bg-gray-50 p-4 border-r">
          <Button className="w-full mb-4">
            <Plus className="w-4 h-4 mr-2" />
            Uusi sivu
          </Button>
          <div className="space-y-2">
            {['Muistiinpanot', 'Projektit', 'Tehtävät', 'Ideat'].map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-2 hover:bg-gray-200 rounded cursor-pointer">
                <Folder className="w-4 h-4" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 p-8">
          <h1 className="text-4xl font-bold mb-6">Tervetuloa Notioniin</h1>
          <p className="text-gray-600 mb-8">Luo muistiinpanoja, dokumentteja ja projekteja</p>
          
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="font-bold mb-2">📝 Muistiinpanot</h3>
              <p className="text-sm text-gray-600">Kirjoita ja järjestä ajatuksiasi</p>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="font-bold mb-2">✅ Tehtävälista</h3>
              <p className="text-sm text-gray-600">Seuraa tehtäviäsi</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
