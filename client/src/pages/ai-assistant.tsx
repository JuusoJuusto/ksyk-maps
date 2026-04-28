import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AIAssistant from "@/components/AIAssistant";
import AIStudyPlanner from "@/components/AIStudyPlanner";
import AILanguageTutor from "@/components/AILanguageTutor";
import AIVirtualTourGuide from "@/components/AIVirtualTourGuide";
import { Bot, BookOpen, Languages, Map } from "lucide-react";

export default function AIAssistantPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900">
      <Tabs defaultValue="assistant" className="w-full">
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b">
          <TabsList className="w-full justify-start h-auto p-2 bg-transparent">
            <TabsTrigger value="assistant" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">AI Assistant</span>
            </TabsTrigger>
            <TabsTrigger value="study" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Study Planner</span>
            </TabsTrigger>
            <TabsTrigger value="language" className="flex items-center gap-2">
              <Languages className="h-4 w-4" />
              <span className="hidden sm:inline">Language Tutor</span>
            </TabsTrigger>
            <TabsTrigger value="tour" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Virtual Tour</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="assistant" className="mt-0">
          <AIAssistant />
        </TabsContent>

        <TabsContent value="study" className="mt-0">
          <AIStudyPlanner />
        </TabsContent>

        <TabsContent value="language" className="mt-0">
          <AILanguageTutor />
        </TabsContent>

        <TabsContent value="tour" className="mt-0">
          <AIVirtualTourGuide />
        </TabsContent>
      </Tabs>
    </div>
  );
}
