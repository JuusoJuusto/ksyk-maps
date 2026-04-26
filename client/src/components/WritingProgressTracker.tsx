import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, TrendingUp, FileText, AlertTriangle, CheckCircle,
  Zap, Copy, Edit3, BarChart3, Play, Pause, RotateCcw
} from 'lucide-react';

interface WritingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  wordsAdded: number;
  wordsDeleted: number;
  charactersAdded: number;
  charactersDeleted: number;
  pauseDuration: number;
  copyPasteEvents: number;
  keystrokeCount: number;
}

interface WritingProgressProps {
  homeworkId: string;
  studentId: string;
  targetWords?: number;
  onUpdate?: (progress: WritingProgress) => void;
  initialContent?: string;
}

interface WritingProgress {
  homeworkId: string;
  studentId: string;
  sessions: WritingSession[];
  totalWords: number;
  totalCharacters: number;
  totalTimeMinutes: number;
  revisions: number;
  startedAt: Date;
  lastUpdatedAt: Date;
  targetWords?: number;
  copyPasteDetected: boolean;
  aiDetectionScore?: number;
}

export default function WritingProgressTracker({
  homeworkId,
  studentId,
  targetWords = 500,
  onUpdate,
  initialContent = ''
}: WritingProgressProps) {
  const [content, setContent] = useState(initialContent);
  const [isTracking, setIsTracking] = useState(false);
  const [currentSession, setCurrentSession] = useState<WritingSession | null>(null);
  const [progress, setProgress] = useState<WritingProgress>({
    homeworkId,
    studentId,
    sessions: [],
    totalWords: 0,
    totalCharacters: 0,
    totalTimeMinutes: 0,
    revisions: 0,
    startedAt: new Date(),
    lastUpdatedAt: new Date(),
    targetWords,
    copyPasteDetected: false,
  });
  
  const [stats, setStats] = useState({
    words: 0,
    characters: 0,
    sentences: 0,
    paragraphs: 0,
    wpm: 0,
    timeElapsed: 0,
  });
  
  const lastContentRef = useRef(content);
  const lastUpdateRef = useRef(Date.now());
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseStartRef = useRef<number | null>(null);
  
  // Calculate statistics
  const calculateStats = (text: string) => {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    
    return {
      words: words.length,
      characters: text.length,
      sentences: sentences.length,
      paragraphs: paragraphs.length,
    };
  };
  
  // Start tracking session
  const startSession = () => {
    const session: WritingSession = {
      id: `session_${Date.now()}`,
      startTime: new Date(),
      wordsAdded: 0,
      wordsDeleted: 0,
      charactersAdded: 0,
      charactersDeleted: 0,
      pauseDuration: 0,
      copyPasteEvents: 0,
      keystrokeCount: 0,
    };
    
    setCurrentSession(session);
    setIsTracking(true);
    lastUpdateRef.current = Date.now();
    
    // Start session timer
    sessionTimerRef.current = setInterval(() => {
      setStats(prev => ({
        ...prev,
        timeElapsed: prev.timeElapsed + 1,
      }));
    }, 1000);
  };
  
  // Pause tracking
  const pauseSession = () => {
    setIsTracking(false);
    pauseStartRef.current = Date.now();
    
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  };
  
  // Resume tracking
  const resumeSession = () => {
    setIsTracking(true);
    
    if (pauseStartRef.current && currentSession) {
      const pauseDuration = Date.now() - pauseStartRef.current;
      setCurrentSession({
        ...currentSession,
        pauseDuration: currentSession.pauseDuration + pauseDuration,
      });
      pauseStartRef.current = null;
    }
    
    // Restart timer
    sessionTimerRef.current = setInterval(() => {
      setStats(prev => ({
        ...prev,
        timeElapsed: prev.timeElapsed + 1,
      }));
    }, 1000);
  };
  
  // End session
  const endSession = () => {
    if (currentSession) {
      const endedSession = {
        ...currentSession,
        endTime: new Date(),
      };
      
      setProgress(prev => ({
        ...prev,
        sessions: [...prev.sessions, endedSession],
        lastUpdatedAt: new Date(),
      }));
      
      setCurrentSession(null);
      setIsTracking(false);
      
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    }
  };
  
  // Handle content change
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    
    if (!isTracking || !currentSession) return;
    
    const oldStats = calculateStats(lastContentRef.current);
    const newStats = calculateStats(newContent);
    
    // Detect copy-paste (large sudden increase)
    const wordDiff = newStats.words - oldStats.words;
    if (Math.abs(wordDiff) > 20) {
      setCurrentSession({
        ...currentSession,
        copyPasteEvents: currentSession.copyPasteEvents + 1,
      });
      
      setProgress(prev => ({
        ...prev,
        copyPasteDetected: true,
      }));
    }
    
    // Update session stats
    if (wordDiff > 0) {
      setCurrentSession({
        ...currentSession,
        wordsAdded: currentSession.wordsAdded + wordDiff,
        charactersAdded: currentSession.charactersAdded + (newContent.length - lastContentRef.current.length),
        keystrokeCount: currentSession.keystrokeCount + 1,
      });
    } else if (wordDiff < 0) {
      setCurrentSession({
        ...currentSession,
        wordsDeleted: currentSession.wordsDeleted + Math.abs(wordDiff),
        charactersDeleted: currentSession.charactersDeleted + Math.abs(newContent.length - lastContentRef.current.length),
      });
    }
    
    // Update progress
    setProgress(prev => ({
      ...prev,
      totalWords: newStats.words,
      totalCharacters: newStats.characters,
      revisions: prev.revisions + 1,
      lastUpdatedAt: new Date(),
    }));
    
    // Calculate WPM
    const timeElapsedMinutes = stats.timeElapsed / 60;
    const wpm = timeElapsedMinutes > 0 ? Math.round(newStats.words / timeElapsedMinutes) : 0;
    
    setStats({
      ...newStats,
      wpm,
      timeElapsed: stats.timeElapsed,
    });
    
    lastContentRef.current = newContent;
    lastUpdateRef.current = Date.now();
    
    // Call onUpdate callback
    if (onUpdate) {
      onUpdate(progress);
    }
  };
  
  // Reset tracking
  const resetTracking = () => {
    setContent('');
    setIsTracking(false);
    setCurrentSession(null);
    setProgress({
      homeworkId,
      studentId,
      sessions: [],
      totalWords: 0,
      totalCharacters: 0,
      totalTimeMinutes: 0,
      revisions: 0,
      startedAt: new Date(),
      lastUpdatedAt: new Date(),
      targetWords,
      copyPasteDetected: false,
    });
    setStats({
      words: 0,
      characters: 0,
      sentences: 0,
      paragraphs: 0,
      wpm: 0,
      timeElapsed: 0,
    });
    
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
    }
  };
  
  // Format time
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };
  
  // Calculate progress percentage
  const progressPercentage = targetWords > 0 ? Math.min(100, (stats.words / targetWords) * 100) : 0;
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
      if (pauseTimerRef.current) {
        clearInterval(pauseTimerRef.current);
      }
    };
  }, []);
  
  return (
    <div className="space-y-4">
      {/* Main Stats Card */}
      <Card className="border-[#003d82]">
        <CardHeader className="bg-gradient-to-r from-[#e6f2ff] to-[#f0f8ff]">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-[#003d82]" />
              Kirjoituksen seuranta
            </span>
            <div className="flex gap-2">
              {!isTracking && !currentSession && (
                <Button size="sm" onClick={startSession} className="bg-[#28a745] hover:bg-[#218838]">
                  <Play className="w-4 h-4 mr-1" />
                  Aloita
                </Button>
              )}
              {isTracking && (
                <Button size="sm" onClick={pauseSession} className="bg-[#ffc107] hover:bg-[#e0a800]">
                  <Pause className="w-4 h-4 mr-1" />
                  Tauko
                </Button>
              )}
              {!isTracking && currentSession && (
                <Button size="sm" onClick={resumeSession} className="bg-[#28a745] hover:bg-[#218838]">
                  <Play className="w-4 h-4 mr-1" />
                  Jatka
                </Button>
              )}
              {currentSession && (
                <Button size="sm" onClick={endSession} variant="outline">
                  Lopeta istunto
                </Button>
              )}
              <Button size="sm" onClick={resetTracking} variant="outline">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Edistyminen tavoitteeseen
              </span>
              <span className="text-sm font-bold text-[#003d82]">
                {stats.words} / {targetWords} sanaa ({Math.round(progressPercentage)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-[#003d82] h-4 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
          
          {/* Live Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-[#e6f2ff] rounded-lg border border-[#003d82]">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-[#003d82]" />
                <span className="text-xs text-gray-600">Sanat</span>
              </div>
              <p className="text-2xl font-bold text-[#003d82]">{stats.words}</p>
            </div>
            
            <div className="p-4 bg-[#e6f2ff] rounded-lg border border-[#003d82]">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-[#003d82]" />
                <span className="text-xs text-gray-600">Aika</span>
              </div>
              <p className="text-2xl font-bold text-[#003d82]">{formatTime(stats.timeElapsed)}</p>
            </div>
            
            <div className="p-4 bg-[#e6f2ff] rounded-lg border border-[#003d82]">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-[#003d82]" />
                <span className="text-xs text-gray-600">Nopeus</span>
              </div>
              <p className="text-2xl font-bold text-[#003d82]">{stats.wpm} <span className="text-sm">s/min</span></p>
            </div>
            
            <div className="p-4 bg-[#e6f2ff] rounded-lg border border-[#003d82]">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-[#003d82]" />
                <span className="text-xs text-gray-600">Merkit</span>
              </div>
              <p className="text-2xl font-bold text-[#003d82]">{stats.characters}</p>
            </div>
          </div>
          
          {/* Warnings */}
          {progress.copyPasteDetected && (
            <div className="mb-4 p-3 bg-[#fff3cd] border border-[#ffc107] rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-[#856404] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#856404]">Kopioi-liitä havaittu</p>
                <p className="text-sm text-[#856404]">
                  Järjestelmä havaitsi suuren tekstin lisäyksen. Varmista, että työ on omaa tuotostasi.
                </p>
              </div>
            </div>
          )}
          
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {isTracking && (
              <Badge className="bg-[#28a745] text-white">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2" />
                Seuranta aktiivinen
              </Badge>
            )}
            {!isTracking && currentSession && (
              <Badge className="bg-[#ffc107] text-gray-900">
                Tauolla
              </Badge>
            )}
            {progress.sessions.length > 0 && (
              <Badge variant="outline">
                {progress.sessions.length} istuntoa
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Text Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Kirjoitusalue</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="w-full h-64 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003d82] font-mono text-sm"
            placeholder="Aloita kirjoittaminen tähän..."
            disabled={!isTracking && !currentSession}
          />
          <div className="mt-2 text-xs text-gray-600">
            {stats.sentences} lausetta • {stats.paragraphs} kappaletta
          </div>
        </CardContent>
      </Card>
      
      {/* Session History */}
      {progress.sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Istuntohistoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {progress.sessions.map((session, index) => (
                <div key={session.id} className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm">Istunto {index + 1}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(session.startTime).toLocaleString('fi-FI')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[#003d82]">
                        +{session.wordsAdded} sanaa
                      </p>
                      <p className="text-xs text-gray-600">
                        {session.keystrokeCount} näppäinpainallusta
                      </p>
                    </div>
                  </div>
                  {session.copyPasteEvents > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-[#856404]">
                      <Copy className="w-3 h-3" />
                      {session.copyPasteEvents} kopioi-liitä tapahtumaa
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
