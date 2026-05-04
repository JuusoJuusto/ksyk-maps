import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Folder, File, Home, ChevronRight, Upload, Download, Trash2, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FileItem {
  id: string;
  name: string;
  type: "folder" | "file";
  size?: string;
  modified: string;
  icon?: string;
}

export default function FileManagerApp() {
  const [currentPath, setCurrentPath] = useState(["Omat tiedostot"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const mockFiles: FileItem[] = [
    { id: "1", name: "Dokumentit", type: "folder", modified: "2026-05-01" },
    { id: "2", name: "Kuvat", type: "folder", modified: "2026-05-02" },
    { id: "3", name: "Lataukset", type: "folder", modified: "2026-05-03" },
    { id: "4", name: "Matematiikan tehtävät.pdf", type: "file", size: "2.4 MB", modified: "2026-05-04" },
    { id: "5", name: "Historian essee.docx", type: "file", size: "1.8 MB", modified: "2026-05-03" },
    { id: "6", name: "Kuva001.jpg", type: "file", size: "3.2 MB", modified: "2026-05-02" },
    { id: "7", name: "Muistiinpanot.txt", type: "file", size: "45 KB", modified: "2026-05-01" },
  ];

  const filteredFiles = mockFiles.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 p-3">
        <div className="flex items-center gap-3 mb-3">
          <Button size="sm" variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Lataa
          </Button>
          <Button size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Uusi kansio
          </Button>
          <Button size="sm" variant="outline" disabled={selectedItems.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Lataa
          </Button>
          <Button size="sm" variant="outline" disabled={selectedItems.length === 0}>
            <Trash2 className="w-4 h-4 mr-2" />
            Poista
          </Button>
          
          <div className="flex-1"></div>
          
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Etsi tiedostoja..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Home className="w-4 h-4 text-gray-600" />
          {currentPath.map((path, index) => (
            <div key={index} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <button className="text-blue-600 hover:underline">{path}</button>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-48 bg-gray-50 border-r border-gray-200 p-3">
          <div className="space-y-1">
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-100 text-blue-900 font-medium">
              <Home className="w-4 h-4" />
              Omat tiedostot
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700">
              <Folder className="w-4 h-4" />
              Dokumentit
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700">
              <Folder className="w-4 h-4" />
              Kuvat
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700">
              <Folder className="w-4 h-4" />
              Lataukset
            </button>
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-auto p-4">
          {selectedItems.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-between">
              <span className="text-sm text-blue-900">
                {selectedItems.length} kohdetta valittu
              </span>
              <Button size="sm" variant="ghost" onClick={() => setSelectedItems([])}>
                Tyhjennä valinta
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            {filteredFiles.map((file) => (
              <button
                key={file.id}
                onClick={() => toggleSelect(file.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                  selectedItems.includes(file.id)
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  file.type === "folder" ? "bg-yellow-100" : "bg-blue-100"
                }`}>
                  {file.type === "folder" ? (
                    <Folder className="w-5 h-5 text-yellow-600" />
                  ) : (
                    <File className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {file.type === "folder" ? "Kansio" : file.size} • {file.modified}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {filteredFiles.length === 0 && (
            <div className="text-center py-12">
              <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Ei tiedostoja löytynyt</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-sm text-gray-600 flex items-center justify-between">
        <span>{filteredFiles.length} kohdetta</span>
        <span>{selectedItems.length} valittu</span>
      </div>
    </div>
  );
}
