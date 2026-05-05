import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Save, Plus, Trash2 } from "lucide-react";

interface Document {
  id: string;
  name: string;
  content: string;
}

export default function TextEditorApp() {
  const [documents, setDocuments] = useState<Document[]>([
    { id: "1", name: "Untitled", content: "" }
  ]);
  const [activeDocId, setActiveDocId] = useState("1");
  const [content, setContent] = useState("");

  const activeDoc = documents.find(d => d.id === activeDocId);

  const updateContent = (newContent: string) => {
    setContent(newContent);
    setDocuments(documents.map(d =>
      d.id === activeDocId ? { ...d, content: newContent } : d
    ));
  };

  const newDocument = () => {
    const newId = Date.now().toString();
    const newDoc = { id: newId, name: `Document ${documents.length + 1}`, content: "" };
    setDocuments([...documents, newDoc]);
    setActiveDocId(newId);
    setContent("");
  };

  const deleteDocument = (id: string) => {
    if (documents.length === 1) return;
    const filtered = documents.filter(d => d.id !== id);
    setDocuments(filtered);
    setActiveDocId(filtered[0].id);
    setContent(filtered[0].content);
  };

  const saveDocument = () => {
    const dataStr = JSON.stringify(documents);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "documents.json";
    link.click();
  };

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar */}
      <div className="w-48 bg-gray-100 border-r flex flex-col">
        <div className="p-3 border-b">
          <Button onClick={newDocument} size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Uusi
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {documents.map(doc => (
            <div
              key={doc.id}
              onClick={() => {
                setActiveDocId(doc.id);
                setContent(doc.content);
              }}
              className={`p-3 border-b cursor-pointer hover:bg-gray-200 ${
                activeDocId === doc.id ? "bg-blue-100" : ""
              }`}
            >
              <p className="text-sm font-medium truncate">{doc.name}</p>
              <p className="text-xs text-gray-600">{doc.content.length} merkkiä</p>
            </div>
          ))}
        </div>
        <div className="p-3 border-t">
          <Button onClick={saveDocument} size="sm" className="w-full bg-green-600 hover:bg-green-700">
            <Save className="w-4 h-4 mr-2" />
            Tallenna
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        <div className="bg-gray-100 border-b p-3 flex items-center justify-between">
          <h3 className="font-semibold">{activeDoc?.name}</h3>
          <Button
            onClick={() => deleteDocument(activeDocId)}
            size="sm"
            variant="outline"
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <textarea
          value={content}
          onChange={(e) => updateContent(e.target.value)}
          className="flex-1 p-4 border-0 resize-none focus:outline-none font-mono text-sm"
          placeholder="Kirjoita tähän..."
        />
      </div>
    </div>
  );
}
