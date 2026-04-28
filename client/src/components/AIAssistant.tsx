import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Send, 
  Sparkles, 
  Image as ImageIcon, 
  FileText, 
  MessageSquare,
  Loader2,
  Trash2,
  Upload,
  Brain,
  Lightbulb,
  Map,
  BookOpen,
  Calendar,
  Search,
  Accessibility
} from "lucide-react";
import { 
  createStudyBuddyChat, 
  createCampusAssistant,
  findRoomWithAI,
  helpWithHomework,
  optimizeSchedule,
  analyzeCampusImage,
  getAccessibilityRoute,
  suggestCampusEvents,
  smartSearch,
  GeminiChat
} from "@/lib/geminiAI";
import { useToast } from "@/hooks/use-toast";

export default function AIAssistant() {
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatInstance, setChatInstance] = useState<GeminiChat | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Room finder state
  const [roomQuery, setRoomQuery] = useState("");
  const [roomResult, setRoomResult] = useState<any>(null);

  // Homework helper state
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [homeworkImage, setHomeworkImage] = useState<File | null>(null);
  const [homeworkAnswer, setHomeworkAnswer] = useState("");

  // Schedule optimizer state
  const [scheduleData, setScheduleData] = useState("");
  const [scheduleOptimization, setScheduleOptimization] = useState<any>(null);

  // Image analysis state
  const [analysisImage, setAnalysisImage] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState("");

  // Accessibility route state
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [accessibilityNeeds, setAccessibilityNeeds] = useState<string[]>([]);
  const [accessibilityRoute, setAccessibilityRoute] = useState<any>(null);

  // Event suggestions state
  const [interests, setInterests] = useState("");
  const [eventSuggestions, setEventSuggestions] = useState<any>(null);

  // Smart search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initializeChat = (type: "study" | "campus") => {
    const chat = type === "study" 
      ? createStudyBuddyChat() 
      : createCampusAssistant();
    setChatInstance(chat);
    setMessages([{
      role: "assistant",
      content: type === "study" 
        ? "Hi! I'm your AI study buddy 📚 How can I help you learn today?"
        : "Hello! I'm your campus assistant 🗺️ How can I help you navigate KSYK today?"
    }]);
  };

  const sendMessage = async () => {
    if (!input.trim() || !chatInstance) return;

    const userMessage = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      let response = "";
      for await (const chunk of chatInstance.streamMessage(userMessage)) {
        response += chunk;
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages[newMessages.length - 1]?.role === "assistant" && 
              newMessages[newMessages.length - 1]?.content === response.slice(0, -chunk.length)) {
            newMessages[newMessages.length - 1].content = response;
          } else {
            newMessages.push({ role: "assistant", content: response });
          }
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const findRoom = async () => {
    if (!roomQuery.trim()) return;
    setLoading(true);
    try {
      const result = await findRoomWithAI(roomQuery);
      setRoomResult(result);
      toast({
        title: "Room Found!",
        description: `${result.roomNumber} - ${result.building}`,
      });
    } catch (error) {
      console.error("Error finding room:", error);
      toast({
        title: "Error",
        description: "Failed to find room. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getHomeworkHelp = async () => {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const answer = await helpWithHomework(subject, question, homeworkImage || undefined);
      setHomeworkAnswer(answer);
    } catch (error) {
      console.error("Error getting homework help:", error);
      toast({
        title: "Error",
        description: "Failed to get homework help. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const optimizeMySchedule = async () => {
    if (!scheduleData.trim()) return;
    setLoading(true);
    try {
      const schedule = JSON.parse(scheduleData);
      const optimization = await optimizeSchedule(schedule);
      setScheduleOptimization(optimization);
    } catch (error) {
      console.error("Error optimizing schedule:", error);
      toast({
        title: "Error",
        description: "Failed to optimize schedule. Please check your JSON format.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeImage = async () => {
    if (!analysisImage) return;
    setLoading(true);
    try {
      const result = await analyzeCampusImage(analysisImage);
      setAnalysisResult(result);
    } catch (error) {
      console.error("Error analyzing image:", error);
      toast({
        title: "Error",
        description: "Failed to analyze image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const findAccessibleRoute = async () => {
    if (!fromLocation.trim() || !toLocation.trim()) return;
    setLoading(true);
    try {
      const route = await getAccessibilityRoute(fromLocation, toLocation, accessibilityNeeds);
      setAccessibilityRoute(route);
    } catch (error) {
      console.error("Error finding accessible route:", error);
      toast({
        title: "Error",
        description: "Failed to find accessible route. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventSuggestions = async () => {
    if (!interests.trim()) return;
    setLoading(true);
    try {
      const interestList = interests.split(",").map(i => i.trim());
      const suggestions = await suggestCampusEvents(interestList);
      setEventSuggestions(suggestions);
    } catch (error) {
      console.error("Error getting event suggestions:", error);
      toast({
        title: "Error",
        description: "Failed to get event suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const performSmartSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const results = await smartSearch(searchQuery, {
        userRole: "student",
        recentSearches: [],
      });
      setSearchResults(results);
    } catch (error) {
      console.error("Error performing smart search:", error);
      toast({
        title: "Error",
        description: "Failed to perform search. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            AI Assistant - Powered by Gemini
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-2 h-auto">
          <TabsTrigger value="chat" className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="room" className="flex items-center gap-1">
            <Map className="h-4 w-4" />
            <span className="hidden sm:inline">Find Room</span>
          </TabsTrigger>
          <TabsTrigger value="homework" className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Homework</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="image" className="flex items-center gap-1">
            <ImageIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Image</span>
          </TabsTrigger>
          <TabsTrigger value="accessibility" className="flex items-center gap-1">
            <Accessibility className="h-4 w-4" />
            <span className="hidden sm:inline">Access</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-1">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Events</span>
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-1">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search</span>
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>AI Chat</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={chatInstance ? "outline" : "default"}
                    onClick={() => initializeChat("study")}
                  >
                    <BookOpen className="h-4 w-4 mr-1" />
                    Study Buddy
                  </Button>
                  <Button
                    size="sm"
                    variant={chatInstance ? "outline" : "default"}
                    onClick={() => initializeChat("campus")}
                  >
                    <Map className="h-4 w-4 mr-1" />
                    Campus Assistant
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-[400px] overflow-y-auto border rounded-lg p-4 space-y-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === "user"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 dark:bg-gray-800"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    disabled={!chatInstance || loading}
                  />
                  <Button onClick={sendMessage} disabled={!chatInstance || loading}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Room Finder Tab */}
        <TabsContent value="room">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                AI Room Finder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., 'Where is the math classroom?' or 'Find room A205'"
                  value={roomQuery}
                  onChange={(e) => setRoomQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && findRoom()}
                />
                <Button onClick={findRoom} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {roomResult && (
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold">{roomResult.roomNumber}</h3>
                      <div className="flex gap-2">
                        <Badge>{roomResult.building}</Badge>
                        <Badge variant="outline">Floor {roomResult.floor}</Badge>
                        <Badge variant="secondary">
                          {Math.round(roomResult.confidence * 100)}% confident
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{roomResult.reasoning}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Homework Helper Tab */}
        <TabsContent value="homework">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                AI Homework Helper
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Subject (e.g., Math, Physics, History)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <Textarea
                placeholder="What do you need help with?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={4}
              />
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => setHomeworkImage(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {homeworkImage ? "Image Selected" : "Upload Image"}
                </Button>
                <Button onClick={getHomeworkHelp} disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
                  Get Help
                </Button>
              </div>

              {homeworkAnswer && (
                <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
                  <CardContent className="pt-6">
                    <p className="whitespace-pre-wrap">{homeworkAnswer}</p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Optimizer Tab */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                AI Schedule Optimizer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder='Paste your schedule as JSON, e.g., {"classes": [{"name": "Math", "time": "9:00", "room": "A101"}]}'
                value={scheduleData}
                onChange={(e) => setScheduleData(e.target.value)}
                rows={6}
              />
              <Button onClick={optimizeMySchedule} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Optimize Schedule
              </Button>

              {scheduleOptimization && (
                <div className="space-y-2">
                  {scheduleOptimization.suggestions?.map((suggestion: any, idx: number) => (
                    <Card key={idx}>
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-2">
                          <Badge>{suggestion.priority}</Badge>
                          <div className="flex-1">
                            <p className="font-medium">{suggestion.type}</p>
                            <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">Impact: {suggestion.impact}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Image Analysis Tab */}
        <TabsContent value="image">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                AI Image Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAnalysisImage(e.target.files?.[0] || null)}
                  className="hidden"
                  id="analysis-image"
                />
                <label htmlFor="analysis-image" className="cursor-pointer">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {analysisImage ? analysisImage.name : "Click to upload campus image"}
                  </p>
                </label>
              </div>

              <Button onClick={analyzeImage} disabled={!analysisImage || loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
                Analyze Image
              </Button>

              {analysisResult && (
                <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
                  <CardContent className="pt-6">
                    <p className="whitespace-pre-wrap">{analysisResult}</p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accessibility Tab */}
        <TabsContent value="accessibility">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Accessibility className="h-5 w-5" />
                Accessible Route Finder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="From (e.g., Main Entrance)"
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
              />
              <Input
                placeholder="To (e.g., Room A205)"
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
              />
              <div className="space-y-2">
                <p className="text-sm font-medium">Accessibility Needs:</p>
                <div className="flex flex-wrap gap-2">
                  {["Wheelchair", "Elevator", "Ramp", "Wide Corridors"].map((need) => (
                    <Badge
                      key={need}
                      variant={accessibilityNeeds.includes(need) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setAccessibilityNeeds(prev =>
                          prev.includes(need)
                            ? prev.filter(n => n !== need)
                            : [...prev, need]
                        );
                      }}
                    >
                      {need}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button onClick={findAccessibleRoute} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Map className="h-4 w-4 mr-2" />}
                Find Accessible Route
              </Button>

              {accessibilityRoute && (
                <div className="space-y-2">
                  <div className="flex gap-2 mb-4">
                    <Badge>Total Time: {accessibilityRoute.totalTime}</Badge>
                    <Badge variant="secondary">
                      Accessibility Score: {Math.round(accessibilityRoute.accessibilityScore * 100)}%
                    </Badge>
                  </div>
                  {accessibilityRoute.steps?.map((step: any, idx: number) => (
                    <Card key={idx}>
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-2">
                          <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{step.instruction}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline">{step.distance}</Badge>
                              <Badge variant="secondary">{step.accessibility}</Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                AI Event Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Your interests (comma-separated, e.g., sports, music, coding)"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
              />
              <Button onClick={getEventSuggestions} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Get Event Suggestions
              </Button>

              {eventSuggestions && (
                <div className="space-y-2">
                  {eventSuggestions.events?.map((event: any, idx: number) => (
                    <Card key={idx} className="hover:shadow-lg transition-shadow">
                      <CardContent className="pt-6">
                        <h3 className="font-bold text-lg mb-2">{event.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{event.description}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge>{event.category}</Badge>
                          <Badge variant="outline">{event.suggestedLocation}</Badge>
                          <Badge variant="secondary">{event.estimatedDuration}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Smart Search Tab */}
        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                AI Smart Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search anything... (AI understands context and typos)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && performSmartSearch()}
                />
                <Button onClick={performSmartSearch} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {searchResults && (
                <div className="space-y-4">
                  {searchResults.suggestions && searchResults.suggestions.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Did you mean:</p>
                      <div className="flex flex-wrap gap-2">
                        {searchResults.suggestions.map((suggestion: string, idx: number) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                            onClick={() => {
                              setSearchQuery(suggestion);
                              performSmartSearch();
                            }}
                          >
                            {suggestion}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {searchResults.results?.map((result: any, idx: number) => (
                      <Card key={idx} className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h3 className="font-bold mb-1">{result.title}</h3>
                              <p className="text-sm text-muted-foreground mb-2">{result.snippet}</p>
                              <div className="flex gap-2">
                                <Badge>{result.type}</Badge>
                                <Badge variant="secondary">
                                  {Math.round(result.relevance * 100)}% relevant
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
