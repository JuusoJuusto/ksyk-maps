import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Languages, MessageCircle, BookOpen, Mic, Volume2, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { GeminiChat, generateStructuredOutput } from "@/lib/geminiAI";
import { useToast } from "@/hooks/use-toast";

export default function AILanguageTutor() {
  const [language, setLanguage] = useState("Finnish");
  const [level, setLevel] = useState("Beginner");
  const [chat, setChat] = useState<GeminiChat | null>(null);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [practiceText, setPracticeText] = useState("");
  const [feedback, setFeedback] = useState<any>(null);
  const { toast } = useToast();

  const startConversation = () => {
    const systemInstruction = `You are a friendly and patient language tutor teaching ${language} at ${level} level.
    
Your teaching style:
- Use simple, clear explanations
- Provide examples and context
- Correct mistakes gently and constructively
- Encourage practice and repetition
- Mix ${language} with English based on student's level
- Use emojis to make learning fun 🎓
- Celebrate progress and achievements 🎉

For beginners: Use mostly English with ${language} words/phrases
For intermediate: Mix both languages equally
For advanced: Use mostly ${language} with English explanations when needed`;

    const newChat = new GeminiChat("gemini-2.0-flash-exp", systemInstruction);
    setChat(newChat);
    setMessages([{
      role: "assistant",
      content: `Hei! 👋 I'm your ${language} tutor. I'm excited to help you learn! What would you like to practice today?`
    }]);
  };

  const sendMessage = async () => {
    if (!input.trim() || !chat) return;

    const userMessage = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await chat.sendMessage(userMessage);
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkGrammar = async () => {
    if (!practiceText.trim()) return;

    setLoading(true);
    try {
      const prompt = `Analyze this ${language} text for grammar, spelling, and style:

"${practiceText}"

Provide detailed feedback in JSON format with:
- Overall score (0-100)
- Corrections (array of {original, corrected, explanation})
- Strengths (array of strings)
- Suggestions (array of strings)
- Level assessment`;

      const schema = {
        type: "object",
        properties: {
          score: { type: "number" },
          corrections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                original: { type: "string" },
                corrected: { type: "string" },
                explanation: { type: "string" },
              },
            },
          },
          strengths: {
            type: "array",
            items: { type: "string" },
          },
          suggestions: {
            type: "array",
            items: { type: "string" },
          },
          levelAssessment: { type: "string" },
        },
      };

      const result = await generateStructuredOutput(prompt, schema) as any;
      setFeedback(result);
      toast({
        title: "Analysis Complete!",
        description: `Score: ${result?.score}/100`,
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to analyze text. Please try again.",
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
            <Languages className="h-6 w-6 text-blue-500" />
            AI Language Tutor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Language</label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Finnish">Finnish 🇫🇮</SelectItem>
                  <SelectItem value="Swedish">Swedish 🇸🇪</SelectItem>
                  <SelectItem value="English">English 🇬🇧</SelectItem>
                  <SelectItem value="Spanish">Spanish 🇪🇸</SelectItem>
                  <SelectItem value="French">French 🇫🇷</SelectItem>
                  <SelectItem value="German">German 🇩🇪</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Level</label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={startConversation} className="w-full">
            <MessageCircle className="h-4 w-4 mr-2" />
            Start Conversation
          </Button>
        </CardContent>
      </Card>

      {chat && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Chat Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Conversation Practice
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
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    disabled={loading}
                  />
                  <Button onClick={sendMessage} disabled={loading}>
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grammar Check Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Grammar & Writing Practice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder={`Write something in ${language}...`}
                value={practiceText}
                onChange={(e) => setPracticeText(e.target.value)}
                rows={8}
              />

              <Button onClick={checkGrammar} disabled={loading || !practiceText.trim()} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Check Grammar
                  </>
                )}
              </Button>

              {feedback && (
                <div className="space-y-4">
                  {/* Score */}
                  <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold mb-2">{feedback.score}/100</div>
                        <Badge>{feedback.levelAssessment}</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Corrections */}
                  {feedback.corrections && feedback.corrections.length > 0 && (
                    <div>
                      <h4 className="font-bold mb-2 flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Corrections
                      </h4>
                      <div className="space-y-2">
                        {feedback.corrections.map((correction: any, idx: number) => (
                          <Card key={idx}>
                            <CardContent className="pt-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="destructive">Original</Badge>
                                  <span className="line-through text-sm">{correction.original}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-green-500">Corrected</Badge>
                                  <span className="text-sm font-medium">{correction.corrected}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{correction.explanation}</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strengths */}
                  {feedback.strengths && feedback.strengths.length > 0 && (
                    <div>
                      <h4 className="font-bold mb-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Strengths
                      </h4>
                      <ul className="space-y-1">
                        {feedback.strengths.map((strength: string, idx: number) => (
                          <li key={idx} className="text-sm flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggestions */}
                  {feedback.suggestions && feedback.suggestions.length > 0 && (
                    <div>
                      <h4 className="font-bold mb-2 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-blue-500" />
                        Suggestions
                      </h4>
                      <ul className="space-y-1">
                        {feedback.suggestions.map((suggestion: string, idx: number) => (
                          <li key={idx} className="text-sm flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
