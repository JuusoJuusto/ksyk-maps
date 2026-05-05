import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Save, Download } from "lucide-react";

export default function WordApp() {
  const [content, setContent] = useState(`Tervetuloa Word-sovellukseen!

Tämä on yksinkertainen tekstinkäsittelyohjelma. Voit kirjoittaa esseitä, raportteja ja muita dokumentteja.

Ominaisuudet:
• Tekstin muotoilu
• Tallenna ja lataa dokumentteja
• Tulosta dokumentteja
• Ja paljon muuta!

Aloita kirjoittaminen tästä...`);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="border-b p-2 flex items-center gap-2 bg-gray-50">
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          Tallenna
        </Button>
        <Button size="sm" variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Lataa
        </Button>
        <div className="border-l h-6 mx-2" />
        <Button size="sm" variant="outline">
          <Bold className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline">
          <Italic className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline">
          <Underline className="w-4 h-4" />
        </Button>
        <div className="border-l h-6 mx-2" />
        <Button size="sm" variant="outline">
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline">
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline">
          <AlignRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Document */}
      <div className="flex-1 overflow-auto bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto bg-white shadow-lg min-h-[800px] p-16">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full border-0 outline-none resize-none text-base leading-relaxed"
            style={{ fontFamily: "Calibri, sans-serif" }}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="border-t p-2 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
        <div>Sivu 1 / 1</div>
        <div>{content.split(/\s+/).length} sanaa</div>
      </div>
    </div>
  );
}
