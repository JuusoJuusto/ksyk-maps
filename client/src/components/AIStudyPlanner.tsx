import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, BookOpen, Target, TrendingUp, Loader2, Sparkles } from "lucide-react";
import { generateStructuredOutput } from "@/lib/geminiAI";
import { useToast } from "@/hooks/use-toast";

export default function AIStudyPlanner() {
  const [subjects, setSubjects] = useState("");
  const [goals, setGoals] = useState("");
  const [availableTime, setAvailableTime] = useState("");
  const [studyPlan, setStudyPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateStudyPlan = async () => {
    if (!subjects.trim() || !goals.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in subjects and goals.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const prompt = `Create a personalized study plan for a student with:
      
Subjects: ${subjects}
Goals: ${goals}
Available Time: ${availableTime || "Not specified"}

Generate a comprehensive study plan with:
- Daily schedule breakdown
- Study techniques for each subject
- Time management tips
- Progress milestones
- Motivation strategies

Provide a structured JSON response.`;

      const schema = {
        type: "object",
        properties: {
          weeklySchedule: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "string" },
                sessions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      time: { type: "string" },
                      subject: { type: "string" },
                      activity: { type: "string" },
                      duration: { type: "string" },
                    },
                  },
                },
              },
            },
          },
          studyTechniques: {
            type: "array",
            items: {
              type: "object",
              properties: {
                subject: { type: "string" },
                technique: { type: "string" },
                description: { type: "string" },
              },
            },
          },
          milestones: {
            type: "array",
            items: {
              type: "object",
              properties: {
                week: { type: "number" },
                goal: { type: "string" },
                checkpoints: {
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

      const plan = await generateStructuredOutput(prompt, schema);
      setStudyPlan(plan);
      toast({
        title: "Study Plan Generated!",
        description: "Your personalized study plan is ready.",
      });
    } catch (error) {
      console.error("Error generating study plan:", error);
      toast({
        title: "Error",
        description: "Failed to generate study plan. Please try again.",
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
            AI Study Planner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Subjects</label>
            <Input
              placeholder="e.g., Math, Physics, History, English"
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Goals</label>
            <Textarea
              placeholder="What do you want to achieve? (e.g., Improve grades, prepare for exams, learn new topics)"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Available Study Time (Optional)</label>
            <Input
              placeholder="e.g., 2 hours per day, weekends only"
              value={availableTime}
              onChange={(e) => setAvailableTime(e.target.value)}
            />
          </div>

          <Button onClick={generateStudyPlan} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating Your Plan...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Study Plan
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {studyPlan && (
        <div className="space-y-6">
          {/* Weekly Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Weekly Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {studyPlan.weeklySchedule?.map((day: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <h3 className="font-bold mb-3">{day.day}</h3>
                    <div className="space-y-2">
                      {day.sessions?.map((session: any, sessionIdx: number) => (
                        <div
                          key={sessionIdx}
                          className="flex items-center gap-3 p-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded"
                        >
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{session.time}</span>
                              <Badge>{session.subject}</Badge>
                              <Badge variant="outline">{session.duration}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{session.activity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Study Techniques */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Study Techniques
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {studyPlan.studyTechniques?.map((technique: any, idx: number) => (
                  <Card key={idx} className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-2">
                        <Target className="h-5 w-5 text-green-500 mt-1" />
                        <div>
                          <h4 className="font-bold mb-1">{technique.subject}</h4>
                          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                            {technique.technique}
                          </p>
                          <p className="text-sm text-muted-foreground">{technique.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Milestones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progress Milestones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {studyPlan.milestones?.map((milestone: any, idx: number) => (
                  <div key={idx} className="border-l-4 border-purple-500 pl-4 py-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge>Week {milestone.week}</Badge>
                      <h4 className="font-bold">{milestone.goal}</h4>
                    </div>
                    <ul className="space-y-1">
                      {milestone.checkpoints?.map((checkpoint: string, cpIdx: number) => (
                        <li key={cpIdx} className="text-sm text-muted-foreground flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          {checkpoint}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Pro Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {studyPlan.tips?.map((tip: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <p className="text-sm">{tip}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
