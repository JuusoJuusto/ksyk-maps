import { useState } from "react";
import Header from "@/components/Header";
import KSYKBuilderV3 from "@/components/KSYKBuilderV3";
import UltimateKSYKBuilder from "@/components/UltimateKSYKBuilder";
import ImprovedKSYKBuilder from "@/components/ImprovedKSYKBuilder";
import BuildingOutlineEditor from "@/components/BuildingOutlineEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building, 
  Zap,
  Sparkles,
  Home,
  Square
} from "lucide-react";

export default function Builder() {
  const [activeTab, setActiveTab] = useState("outline-editor");

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-full mx-auto px-0 py-0">
        {/* Header */}
        <div className="mb-4 text-center bg-blue-600 text-white py-6 px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center justify-center gap-3">
            <Zap className="h-8 w-8" />
            KSYK Builder Pro
          </h1>
          <p className="text-base md:text-xl text-blue-100 max-w-2xl mx-auto">
            Professional campus design tool - Draw campus outline, buildings, and rooms
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-0">
          <TabsList className="grid w-full max-w-6xl mx-auto grid-cols-4 gap-2 mb-4 px-4">
            <TabsTrigger value="outline-editor" className="flex items-center justify-center text-sm md:text-base py-3">
              <Square className="mr-2 h-4 md:h-5 w-4 md:w-5" />
              📐 Building Outlines
            </TabsTrigger>
            <TabsTrigger value="v3-builder" className="flex items-center justify-center text-sm md:text-base py-3">
              <Home className="mr-2 h-4 md:h-5 w-4 md:w-5" />
              🏫 V3 Campus
            </TabsTrigger>
            <TabsTrigger value="improved-builder" className="flex items-center justify-center text-sm md:text-base py-3">
              <Sparkles className="mr-2 h-4 md:h-5 w-4 md:w-5" />
              🎯 V2 Smart
            </TabsTrigger>
            <TabsTrigger value="ultimate-builder" className="flex items-center justify-center text-sm md:text-base py-3">
              <Building className="mr-2 h-4 md:h-5 w-4 md:w-5" />
              🏗️ V1 Ultimate
            </TabsTrigger>
          </TabsList>

          {/* Building Outline Editor - SIMPLE OUTLINE TOOL */}
          <TabsContent value="outline-editor" className="m-0 p-0">
            <BuildingOutlineEditor />
          </TabsContent>

          {/* V3 Builder - NEW CAMPUS BUILDER */}
          <TabsContent value="v3-builder" className="m-0 p-0">
            <KSYKBuilderV3 />
          </TabsContent>

          {/* Improved KSYK Builder */}
          <TabsContent value="improved-builder" className="m-0 p-0">
            <ImprovedKSYKBuilder />
          </TabsContent>

          {/* Ultimate KSYK Builder */}
          <TabsContent value="ultimate-builder" className="m-0 p-0">
            <UltimateKSYKBuilder />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
