import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Building2, MapPin, Layers, Wand2, Save, Download, Upload } from 'lucide-react';
import { useDarkMode } from '@/contexts/DarkModeContext';

export default function UltimateKSYKBuilder() {
  const { darkMode } = useDarkMode();
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [floors, setFloors] = useState(3);
  const [roomsPerFloor, setRoomsPerFloor] = useState(10);

  const handleAIGenerate = async () => {
    console.log('🤖 AI Generation started with prompt:', aiPrompt);
    setIsGenerating(true);
    
    try {
      // Simulate AI generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const generated = `Generated building layout based on: "${aiPrompt}"
      
Building: ${buildingName || 'New Building'}
Floors: ${floors}
Rooms per floor: ${roomsPerFloor}

Suggested room layout:
- Floor 1: Entrance hall, Reception, Classrooms 101-${100 + roomsPerFloor}
- Floor 2: Classrooms 201-${200 + roomsPerFloor}, Computer lab
- Floor 3: Science labs, Art studio, Music room

AI Recommendations:
✓ Add emergency exits on each floor
✓ Include accessible elevators
✓ Place restrooms centrally on each floor
✓ Consider natural lighting for classrooms`;
      
      setGeneratedContent(generated);
      console.log('✅ AI Generation complete');
    } catch (error) {
      console.error('❌ AI Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`min-h-screen p-4 sm:p-8 ${darkMode ? 'bg-gray-900' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-3 text-3xl ${darkMode ? 'text-white' : ''}`}>
              <Wand2 className="h-8 w-8 text-purple-500" />
              AI-Powered KSYK Builder
            </CardTitle>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Create and manage building layouts with AI assistance
            </p>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* AI Assistant Panel */}
          <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
                <Sparkles className="h-5 w-5 text-yellow-500" />
                AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Describe what you want to build
                </label>
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="E.g., 'Create a 3-story school building with science labs on the top floor and a cafeteria on the ground floor'"
                  className={`min-h-[120px] ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Building Name
                  </label>
                  <Input
                    value={buildingName}
                    onChange={(e) => setBuildingName(e.target.value)}
                    placeholder="Main Building"
                    className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Number of Floors
                  </label>
                  <Input
                    type="number"
                    value={floors}
                    onChange={(e) => setFloors(parseInt(e.target.value) || 1)}
                    min="1"
                    max="10"
                    className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Rooms per Floor
                </label>
                <Input
                  type="number"
                  value={roomsPerFloor}
                  onChange={(e) => setRoomsPerFloor(parseInt(e.target.value) || 1)}
                  min="1"
                  max="50"
                  className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>

              <Button
                onClick={handleAIGenerate}
                disabled={isGenerating || !aiPrompt}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate with AI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* AI Output Panel */}
          <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
                <Building2 className="h-5 w-5 text-blue-500" />
                AI Generated Layout
              </CardTitle>
            </CardHeader>
            <CardContent>
              {generatedContent ? (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <pre className={`whitespace-pre-wrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {generatedContent}
                  </pre>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      Save Layout
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={`text-center py-12 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>AI-generated content will appear here</p>
                  <p className="text-sm mt-2">Describe your building and click "Generate with AI"</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
              <Layers className="h-5 w-5 text-green-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-24 flex-col">
                <Building2 className="h-6 w-6 mb-2" />
                <span>New Building</span>
              </Button>
              <Button variant="outline" className="h-24 flex-col">
                <Layers className="h-6 w-6 mb-2" />
                <span>Add Floor</span>
              </Button>
              <Button variant="outline" className="h-24 flex-col">
                <MapPin className="h-6 w-6 mb-2" />
                <span>Add Room</span>
              </Button>
              <Button variant="outline" className="h-24 flex-col">
                <Upload className="h-6 w-6 mb-2" />
                <span>Import Data</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Tips */}
        <Card className={`border-l-4 border-l-purple-500 ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
          <CardContent className="p-6">
            <h3 className={`font-bold mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI Tips for Better Results
            </h3>
            <ul className={`space-y-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <li>• Be specific about room types and their purposes</li>
              <li>• Mention any special requirements (accessibility, safety, etc.)</li>
              <li>• Include floor-specific details for better organization</li>
              <li>• Specify connections between rooms or areas</li>
              <li>• Mention any existing constraints or preferences</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
