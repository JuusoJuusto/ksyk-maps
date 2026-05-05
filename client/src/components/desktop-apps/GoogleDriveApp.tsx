import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, HardDrive, Folder, File, Upload } from "lucide-react";

export default function GoogleDriveApp({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-blue-600" />
          <span className="font-semibold">Google Drive</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Oma Drive</h2>
            <Button className="bg-blue-600">
              <Upload className="w-4 h-4 mr-2" />
              Uusi
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Koulu', 'Projektit', 'Kuvat', 'Dokumentit'].map((folder, i) => (
              <Card key={i} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <Folder className="w-12 h-12 text-blue-500 mb-3" />
                <h3 className="font-bold">{folder}</h3>
              </Card>
            ))}
          </div>

          <Card className="p-6">
            <h3 className="font-bold mb-4">Viimeaikaiset</h3>
            <div className="space-y-3">
              {['Esitys.pptx', 'Raportti.docx', 'Taulukko.xlsx'].map((file, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <File className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">{file}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
