import { useState } from "react";
import Header from "@/components/Header";
import ImprovedKSYKBuilder from "@/components/ImprovedKSYKBuilder";
import BuildingOutlineEditor from "@/components/BuildingOutlineEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building, 
  Square
} from "lucide-react";

export default function Builder() {
  const [activeTab, setActiveTab] = useState("improved-builder");

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-full mx-auto px-0 py-0">
        {/* Header */}
        <div className="mb-4 text-center bg-blue-600 text-white py-6 px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center justify-center gap-3">
            <Building className="h-8 w-8" />
            KSYK Builder
          </h1>
          <p className="text-base md:text-xl text-blue-100 max-w-2xl mx-auto">
            Professional campus map builder - Draw outlines, buildings, and rooms
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-0">
          <TabsList className="grid w-full max-w-4xl mx-auto grid-cols-2 gap-2 mb-4 px-4">
            <TabsTrigger value="improved-builder" className="flex items-center justify-center text-sm md:text-base py-3">
              <Building className="mr-2 h-4 md:h-5 w-4 md:w-5" />
              🎯 KSYK Builder
            </TabsTrigger>
            <TabsTrigger value="outline-editor" className="flex items-center justify-center text-sm md:text-base py-3">
              <Square className="mr-2 h-4 md:h-5 w-4 md:w-5" />
              📐 Simple Outline Tool
            </TabsTrigger>
          </TabsList>

          {/* Improved KSYK Builder - MAIN BUILDER */}
          <TabsContent value="improved-builder" className="m-0 p-0">
            <ImprovedKSYKBuilder />
          </TabsContent>

          {/* Building Outline Editor - SIMPLE TOOL */}
          <TabsContent value="outline-editor" className="m-0 p-0">
            <BuildingOutlineEditor />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
