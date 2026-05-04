import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, FileText, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NotepadApp() {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [savedNotes, setSavedNotes] = useState<Array<{ id: string; title: string; content: string; date: string }>>([]);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("notepad_notes");
    if (saved) {
      setSavedNotes(JSON.parse(saved));
    }
  }, []);

  const saveNote = () => {
    const title = content.split("\n")[0].substring(0, 50) || "Untitled Note";
    const date = new Date().toLocaleString("fi-FI");
    
    let updatedNotes;
    if (currentNoteId) {
      updatedNotes = savedNotes.map(note =>
        note.id === currentNoteId ? { ...note, title, content, date } : note
      );
    } else {
      const newNote = {
        id: Date.now().toString(),
        title,
        content,
        date,
      };
      updatedNotes = [newNote, ...savedNotes];
      setCurrentNoteId(newNote.id);
    }
    
    setSavedNotes(updatedNotes);
    localStorage.setItem("notepad_notes", JSON.stringify(updatedNotes));
    
    toast({
      title: "Tallennettu!",
      description: "Muistiinpano on tallennettu",
    });
  };

  const loadNote = (note: typeof savedNotes[0]) => {
    setContent(note.content);
    setCurrentNoteId(note.id);
  };

  const newNote = () => {
    setContent("");
    setCurrentNoteId(null);
  };

  const deleteNote = (id: string) => {
    const updatedNotes = savedNotes.filter(note => note.id !== id);
    setSavedNotes(updatedNotes);
    localStorage.setItem("notepad_notes", JSON.stringify(updatedNotes));
    
    if (currentNoteId === id) {
      newNote();
    }
    
    toast({
      title: "Poistettu",
      description: "Muistiinpano on poistettu",
    });
  };

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <Button onClick={newNote} className="w-full bg-blue-600 hover:bg-blue-700">
            <FileText className="w-4 h-4 mr-2" />
            Uusi muistiinpano
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {savedNotes.length === 0 ? (
            <p className="text-center text-gray-500 text-sm mt-4">Ei tallennettuja muistiinpanoja</p>
          ) : (
            savedNotes.map(note => (
              <div
                key={note.id}
                className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                  currentNoteId === note.id
                    ? "bg-blue-100 border-2 border-blue-500"
                    : "bg-white hover:bg-gray-100 border border-gray-200"
                }`}
                onClick={() => loadNote(note)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{note.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{note.date}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(note.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <h3 className="font-semibold text-gray-900">
            {currentNoteId ? "Muokkaa muistiinpanoa" : "Uusi muistiinpano"}
          </h3>
          <Button onClick={saveNote} className="bg-green-600 hover:bg-green-700">
            <Save className="w-4 h-4 mr-2" />
            Tallenna
          </Button>
        </div>
        
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Aloita kirjoittaminen..."
          className="flex-1 border-0 rounded-none resize-none focus-visible:ring-0 font-mono text-base p-6"
        />
        
        <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600 flex items-center justify-between">
          <span>{content.length} merkkiä</span>
          <span>{content.split(/\s+/).filter(w => w.length > 0).length} sanaa</span>
        </div>
      </div>
    </div>
  );
}
