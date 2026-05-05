import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Box, Folder, File, Upload } from "lucide-react";

export default function DropboxApp({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-2 bg-[#0061FF] text-white border-b">
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5" />
          <span className="font-semibold">Dropbox</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-blue-600">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Tiedostot</h2>
            <Button className="bg-[#0061FF]">
              <Upload className="w-4 h-4 mr-2" />
              Lataa
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Koulu', 'Työt', 'Kuvat', 'Dokumentit'].map((folder, i) => (
              <Card key={i} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <Folder className="w-12 h-12 text-blue-600 mb-3" />
                <h3 className="font-bold">{folder}</h3>
              </Card>
            ))}
          </div>

          <Card className="p-6">
            <h3 className="font-bold mb-4">Viimeaikaiset</h3>
            <div className="space-y-3">
              {['Tiedosto1.pdf', 'Kuva.jpg', 'Dokumentti.docx'].map((file, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <File className="w-5 h-5 text-blue-600" />
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
