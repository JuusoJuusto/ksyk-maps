import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Camera, 
  Info, 
  Navigation, 
  Star, 
  Clock,
  Users,
  Building,
  Sparkles,
  Play,
  Pause,
  SkipForward,
  Volume2,
  Loader2
} from "lucide-react";
import { generateStructuredOutput, GeminiChat } from "@/lib/geminiAI";
import { useToast } from "@/hooks/use-toast";

interface TourStop {
  id: string;
  name: string;
  description: string;
  funFact: string;
  duration: string;
  coordinates: { lat: number; lng: number };
  imagePrompt: string;
  activities: string[];
}

interface VirtualTour {
  title: string;
  description: string;
  totalDuration: string;
  difficulty: string;
  stops: TourStop[];
  tips: string[];
}

export default function AIVirtualTourGuide() {
  const [tourType, setTourType] = useState<string>("");
  const [tour, setTour] = useState<VirtualTour | null>(null);
  const [currentStop, setCurrentStop] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tourGuide, setTourGuide] = useState<GeminiChat | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [question, setQuestion] = useState("");
  const { toast } = useToast();

  const tourTypes = [
    { id: "new-student", name: "New Student Orientation", icon: "🎓", description: "Perfect for first-time visitors" },
    { id: "history", name: "Historical Tour", icon: "🏛️", description: "Learn about KSYK's rich history" },
    { id: "facilities", name: "Facilities Tour", icon: "🏢", description: "Explore all campus amenities" },
    { id: "quick", name: "Quick Tour", icon: "⚡", description: "15-minute highlights" },
    { id: "accessibility", name: "Accessible Route Tour", icon: "♿", description: "Wheelchair-friendly paths" },
    { id: "hidden-gems", name: "Hidden Gems", icon: "💎", description: "Secret spots students love" },
  ];

  const generateTour = async (type: string) => {
    setLoading(true);
    setTourType(type);
    
    try {
      const tourInfo = tourTypes.find(t => t.id === type);
      
      const prompt = `Create a detailed virtual campus tour for KSYK (Kulosaaren Yhteiskoulu) school.

Tour Type: ${tourInfo?.name}
Description: ${tourInfo?.description}

Generate a comprehensive tour with:
- 5-8 interesting stops around campus
- Each stop should have: name, description, fun fact, duration, activities
- Include buildings: A, B, C, Gym, Cafeteria, Library, Computer Labs, Science Labs
- Make it engaging and informative
- Add practical tips for navigating campus

Provide structured JSON response.`;

      const schema = {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          totalDuration: { type: "string" },
          difficulty: { type: "string" },
          stops: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                description: { type: "string" },
                funFact: { type: "string" },
                duration: { type: "string" },
                imagePrompt: { type: "string" },
                activities: {
                  type: "array",
                  items: { type: "string" },
                },
              },
            },
          },
          tips: {
            type: "array",
            items: { type: "string" },
          },
        },
      };

      const generatedTour = await generateStructuredOutput<VirtualTour>(prompt, schema);
      setTour(generatedTour);
      setCurrentStop(0);

      // Initialize tour guide chat
      const guide = new GeminiChat(
        "gemini-2.0-flash-exp",
        `You are an enthusiastic and knowledgeable virtual tour guide for KSYK school.
        
Current tour: ${generatedTour.title}
Tour stops: ${generatedTour.stops.map(s => s.name).join(", ")}

Your personality:
- Friendly and welcoming
- Knowledgeable about the school
- Share interesting stories and facts
- Answer questions about campus life
- Encourage exploration
- Use emojis to be engaging 🎓

Help visitors feel excited about the campus!`
      );
      
      setTourGuide(guide);
      setChatMessages([{
        role: "assistant",
        content: `Welcome to ${generatedTour.title}! 🎉 I'm your virtual tour guide. We'll be visiting ${generatedTour.stops.length} amazing locations around campus. Feel free to ask me anything about what you see! Ready to start? 🚀`
      }]);

      toast({
        title: "Tour Generated!",
        description: `${generatedTour.stops.length} stops ready to explore`,
      });
    } catch (error) {
      console.error("Error generating tour:", error);
      toast({
        title: "Error",
        description: "Failed to generate tour. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const askTourGuide = async () => {
    if (!question.trim() || !tourGuide) return;

    const userQuestion = question;
    setQuestion("");
    setChatMessages(prev => [...prev, { role: "user", content: userQuestion }]);

    try {
      const response = await tourGuide.sendMessage(userQuestion);
      setChatMessages(prev => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to get response from tour guide.",
        variant: "destructive",
      });
    }
  };

  const nextStop = () => {
    if (tour && currentStop < tour.stops.length - 1) {
      setCurrentStop(currentStop + 1);
      if (tourGuide) {
        const stop = tour.stops[currentStop + 1];
        tourGuide.sendMessage(`We've arrived at ${stop.name}. Tell me something interesting about this location!`).then(response => {
          setChatMessages(prev => [...prev, { 
            role: "assistant", 
            content: response 
          }]);
        });
      }
    }
  };

  const previousStop = () => {
    if (currentStop > 0) {
      setCurrentStop(currentStop - 1);
    }
  };

  if (!tour) {
    return (
      <div className="container mx-auto p-4 max-w-6xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-500" />
              AI Virtual Tour Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Choose a tour type and let AI create a personalized campus experience for you!
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tourTypes.map((type) => (
                <Card
                  key={type.id}
                  className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                  onClick={() => !loading && generateTour(type.id)}
                >
                  <CardContent className="pt-6">
                    <div className="text-center space-y-2">
                      <div className="text-4xl mb-2">{type.icon}</div>
                      <h3 className="font-bold">{type.name}</h3>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {loading && (
              <div className="mt-6 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Creating your personalized tour...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const stop = tour.stops[currentStop];
  const progress = ((currentStop + 1) / tour.stops.length) * 100;

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* Tour Header */}
      <Card className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 mb-2">
                <MapPin className="h-6 w-6 text-purple-500" />
                {tour.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{tour.description}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setTour(null);
                setTourGuide(null);
                setChatMessages([]);
              }}
            >
              End Tour
            </Button>
          </div>
          
          <div className="flex gap-4 mt-4">
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              {tour.totalDuration}
            </Badge>
            <Badge variant="outline">
              <Navigation className="h-3 w-3 mr-1" />
              {tour.difficulty}
            </Badge>
            <Badge variant="outline">
              <MapPin className="h-3 w-3 mr-1" />
              Stop {currentStop + 1} of {tour.stops.length}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current Stop */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                {stop.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stop Image Placeholder */}
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg flex items-center justify-center">
                <div className="text-center p-4">
                  <Camera className="h-12 w-12 mx-auto mb-2 text-purple-500" />
                  <p className="text-sm text-muted-foreground">{stop.imagePrompt}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  About This Location
                </h4>
                <p className="text-sm text-muted-foreground">{stop.description}</p>
              </div>

              {/* Fun Fact */}
              <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <Star className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1">Fun Fact!</h4>
                      <p className="text-sm">{stop.funFact}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Activities */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Things to Do Here
                </h4>
                <ul className="space-y-2">
                  {stop.activities.map((activity, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      {activity}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Navigation Controls */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={previousStop}
                  disabled={currentStop === 0}
                  className="flex-1"
                >
                  Previous
                </Button>
                <Button
                  onClick={nextStop}
                  disabled={currentStop === tour.stops.length - 1}
                  className="flex-1"
                >
                  {currentStop === tour.stops.length - 1 ? "Finish Tour" : "Next Stop"}
                  <SkipForward className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tour Tips */}
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5" />
                Tour Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {tour.tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Tour Guide Chat */}
        <Card className="lg:sticky lg:top-4 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Ask Your Tour Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-[400px] overflow-y-auto border rounded-lg p-4 space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-3 ${
                        msg.role === "user"
                          ? "bg-purple-500 text-white"
                          : "bg-gray-100 dark:bg-gray-800"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask about this location..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && askTourGuide()}
                  className="flex-1 px-3 py-2 border rounded-lg"
                />
                <Button onClick={askTourGuide} disabled={!question.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                💡 Try asking: "What's special about this place?" or "Tell me more about the history"
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Send({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}
