'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api/client';
import { toast } from 'react-hot-toast';

const SUBJECTS = [
  { id: 'MATH', name: 'Mathematics', icon: '📐' },
  { id: 'PHYSICS', name: 'Physics', icon: '⚛️' },
  { id: 'CHEMISTRY', name: 'Chemistry', icon: '🧪' },
  { id: 'ASTRONOMY', name: 'Astronomy', icon: '🌌' },
];

const GRADES = ['7', '8', '9', 'Lukio 1', 'Lukio 2', 'Lukio 3'];

const GOALS = [
  { id: 'improve_grades', label: 'Improve my grades' },
  { id: 'exam_prep', label: 'Prepare for exams' },
  { id: 'understand_better', label: 'Understand concepts better' },
  { id: 'homework_help', label: 'Get help with homework' },
  { id: 'challenge', label: 'Challenge myself' },
];

export default function OnboardingPage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Welcome
  // Step 2: Goals & Subjects
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  // Step 3: AI Assessment
  const [assessmentId, setAssessmentId] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);

  // Step 4: Completion
  const [analysis, setAnalysis] = useState<any>(null);

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const handleStartOnboarding = async () => {
    setIsLoading(true);
    try {
      await api.post('/api/onboarding/start');
      setStep(2);
    } catch (error) {
      toast.error('Failed to start onboarding');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoalsSubmit = async () => {
    if (selectedSubjects.length === 0 || !selectedGrade || selectedGoals.length === 0) {
      toast.error('Please complete all fields');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/api/onboarding/goals', {
        subjects: selectedSubjects,
        grade: selectedGrade,
        goals: selectedGoals,
      });

      // Generate AI assessment
      const response = await api.post('/api/onboarding/assessment/generate', {
        subjects: selectedSubjects,
        grade: selectedGrade,
      });

      const data = response.data as Record<string, unknown> | undefined;
      setAssessmentId((data?.assessmentId as string) || '');
      setQuestions((data?.questions as any[]) || []);
      setStep(3);
    } catch (error) {
      toast.error('Failed to save goals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSubmit = () => {
    if (!answers[questions[currentQuestion].id]) {
      toast.error('Please provide an answer');
      return;
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleAssessmentComplete();
    }
  };

  const handleAssessmentComplete = async () => {
    setIsLoading(true);
    try {
      const response = await api.post('/api/onboarding/assessment/submit', {
        assessmentId,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer,
        })),
      });

      const data = response.data as Record<string, unknown> | undefined;
      setAnalysis((data?.analysis as Record<string, unknown>) || null);

      // Complete onboarding
      await api.post('/api/onboarding/complete');
      setStep(4);
    } catch (error) {
      toast.error('Failed to complete assessment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    router.push('/dashboard');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              Step {step} of {totalSteps}
            </span>
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              {Math.round(progress)}% complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      <div className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">👋</span>
              </div>
              <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-4">
                Welcome to STEM Genius!
              </h1>
              <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl mx-auto">
                Let's personalize your learning experience. This will take about 5 minutes.
              </p>
              <Card className="p-8 max-w-2xl mx-auto">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">🎯</span>
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                        Set Your Goals
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Tell us what you want to achieve
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">🤖</span>
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                        AI Assessment
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Quick assessment to understand your level
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">🚀</span>
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                        Personalized Plan
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Get your custom learning roadmap
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleStartOnboarding}
                  disabled={isLoading}
                  className="w-full mt-8 bg-blue-600 text-white hover:bg-blue-700"
                  size="lg"
                >
                  {isLoading ? 'Starting...' : "Let's get started"}
                </Button>
              </Card>
            </div>
          )}

          {/* Step 2: Goals & Subjects */}
          {step === 2 && (
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2 text-center">
                Tell us about yourself
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 mb-8 text-center">
                This helps us personalize your learning experience
              </p>

              <Card className="p-8 max-w-2xl mx-auto">
                <div className="space-y-8">
                  {/* Grade Selection */}
                  <div>
                    <Label className="text-base font-semibold mb-4 block">
                      What grade are you in?
                    </Label>
                    <div className="grid grid-cols-3 gap-3">
                      {GRADES.map((grade) => (
                        <button
                          key={grade}
                          onClick={() => setSelectedGrade(grade)}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            selectedGrade === grade
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                          }`}
                        >
                          <span className="font-medium text-neutral-900 dark:text-white">
                            {grade}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subject Selection */}
                  <div>
                    <Label className="text-base font-semibold mb-4 block">
                      Which subjects do you want to study?
                    </Label>
                    <div className="grid grid-cols-2 gap-4">
                      {SUBJECTS.map((subject) => (
                        <button
                          key={subject.id}
                          onClick={() => {
                            setSelectedSubjects((prev) =>
                              prev.includes(subject.id)
                                ? prev.filter((s) => s !== subject.id)
                                : [...prev, subject.id]
                            );
                          }}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            selectedSubjects.includes(subject.id)
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                          }`}
                        >
                          <div className="text-2xl mb-2">{subject.icon}</div>
                          <div className="font-medium text-neutral-900 dark:text-white">
                            {subject.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Goals Selection */}
                  <div>
                    <Label className="text-base font-semibold mb-4 block">
                      What are your learning goals?
                    </Label>
                    <div className="space-y-3">
                      {GOALS.map((goal) => (
                        <label
                          key={goal.id}
                          className="flex items-center gap-3 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={selectedGoals.includes(goal.id)}
                            onCheckedChange={(checked) => {
                              setSelectedGoals((prev) =>
                                checked
                                  ? [...prev, goal.id]
                                  : prev.filter((g) => g !== goal.id)
                              );
                            }}
                          />
                          <span className="text-neutral-900 dark:text-white">
                            {goal.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <Button
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleGoalsSubmit}
                    disabled={isLoading || selectedSubjects.length === 0 || !selectedGrade || selectedGoals.length === 0}
                    className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {isLoading ? 'Generating assessment...' : 'Continue'}
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Step 3: AI Assessment */}
          {step === 3 && questions.length > 0 && (
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2 text-center">
                Quick Assessment
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 mb-8 text-center">
                Question {currentQuestion + 1} of {questions.length}
              </p>

              <Card className="p-8 max-w-2xl mx-auto">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-blue-600">
                      {questions[currentQuestion].subject}
                    </span>
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                      Difficulty: {questions[currentQuestion].difficulty}/10
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                    {questions[currentQuestion].question}
                  </h2>
                  <textarea
                    value={answers[questions[currentQuestion].id] || ''}
                    onChange={(e) =>
                      setAnswers({
                        ...answers,
                        [questions[currentQuestion].id]: e.target.value,
                      })
                    }
                    placeholder="Type your answer here..."
                    className="w-full h-32 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="flex gap-4">
                  {currentQuestion > 0 && (
                    <Button
                      onClick={() => setCurrentQuestion(currentQuestion - 1)}
                      variant="outline"
                    >
                      Previous
                    </Button>
                  )}
                  <Button
                    onClick={handleAnswerSubmit}
                    disabled={isLoading || !answers[questions[currentQuestion].id]}
                    className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {isLoading
                      ? 'Processing...'
                      : currentQuestion === questions.length - 1
                      ? 'Complete Assessment'
                      : 'Next Question'}
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Step 4: Completion */}
          {step === 4 && (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🎉</span>
              </div>
              <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-4">
                You're all set!
              </h1>
              <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-8">
                Your personalized learning plan is ready
              </p>

              {analysis && (
                <Card className="p-8 max-w-2xl mx-auto mb-8">
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">
                    Your Learning Profile
                  </h2>
                  <div className="grid md:grid-cols-2 gap-6 text-left">
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">
                        Strengths
                      </h3>
                      <ul className="space-y-2">
                        {analysis.strengths?.map((strength: string, i: number) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                            <span className="text-green-600">✓</span>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">
                        Areas to Improve
                      </h3>
                      <ul className="space-y-2">
                        {analysis.weaknesses?.map((weakness: string, i: number) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                            <span className="text-blue-600">→</span>
                            {weakness}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              )}

              <Button
                onClick={handleFinish}
                size="lg"
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
