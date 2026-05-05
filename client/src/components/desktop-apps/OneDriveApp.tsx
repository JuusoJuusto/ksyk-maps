import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Cloud, Folder, File, Upload, Download } from "lucide-react";

export default function OneDriveApp({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-2 bg-[#0078D4] text-white border-b">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          <span className="font-semibold">OneDrive</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-blue-700">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Omat tiedostot</h2>
            <Button className="bg-[#0078D4]">
              <Upload className="w-4 h-4 mr-2" />
              Lataa
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Dokumentit', 'Kuvat', 'Videot', 'Koulu'].map((folder, i) => (
              <Card key={i} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <Folder className="w-12 h-12 text-blue-500 mb-3" />
                <h3 className="font-bold">{folder}</h3>
                <p className="text-sm text-gray-500">{Math.floor(Math.random() * 50)} tiedostoa</p>
              </Card>
            ))}
          </div>

          <Card className="p-6">
            <h3 className="font-bold mb-4">Viimeisimmät tiedostot</h3>
            <div className="space-y-3">
              {['Matematiikka.docx', 'Esitys.pptx', 'Kuva.jpg'].map((file, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <File className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">{file}</span>
                  </div>
                  <Button size="sm" variant="ghost">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
