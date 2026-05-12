import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  Code, 
  Calendar, 
  MessageSquare, 
  FileText, 
  BarChart3, 
  Users,
  Settings,
  Home,
  Search,
  Command,
  ChevronRight
} from "lucide-react";

interface Command {
  id: string;
  name: { fi: string; en: string };
  description: { fi: string; en: string };
  icon: any;
  action: () => void;
  keywords: string[];
}

interface WilmaCommandBarProps {
  language: 'fi' | 'en';
  userId?: string;
}

export default function WilmaCommandBar({ language, userId }: WilmaCommandBarProps) {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = (fi: string, en: string) => language === 'fi' ? fi : en;

  const commands: Command[] = [
    {
      id: 'learn-coding',
      name: { fi: 'Koodausplatformi', en: 'Coding Platform' },
      description: { fi: 'Opi koodaamaan interaktiivisesti', en: 'Learn to code interactively' },
      icon: Code,
      action: () => setLocation('/learn-coding'),
      keywords: ['coding', 'koodaus', 'learn', 'oppi', 'python', 'ohjelmointi', 'programming']
    },
    {
      id: 'schedule',
      name: { fi: 'Lukujärjestys', en: 'Schedule' },
      description: { fi: 'Näytä lukujärjestys', en: 'View schedule' },
      icon: Calendar,
      action: () => setLocation(`/wilma/${userId}/schedule`),
      keywords: ['schedule', 'lukujärjestys', 'calendar', 'kalenteri', 'tunnit']
    },
    {
      id: 'messages',
      name: { fi: 'Viestit', en: 'Messages' },
      description: { fi: 'Näytä viestit', en: 'View messages' },
      icon: MessageSquare,
      action: () => setLocation(`/wilma/${userId}/messages`),
      keywords: ['messages', 'viestit', 'mail', 'posti']
    },
    {
      id: 'grades',
      name: { fi: 'Arvosanat', en: 'Grades' },
      description: { fi: 'Näytä arvosanat', en: 'View grades' },
      icon: BarChart3,
      action: () => setLocation(`/wilma/${userId}/grades`),
      keywords: ['grades', 'arvosanat', 'marks', 'numerot']
    },
    {
      id: 'assignments',
      name: { fi: 'Tehtävät', en: 'Assignments' },
      description: { fi: 'Näytä tehtävät', en: 'View assignments' },
      icon: FileText,
      action: () => setLocation(`/wilma/${userId}/assignments`),
      keywords: ['assignments', 'tehtävät', 'homework', 'kotitehtävät', 'läksyt']
    },
    {
      id: 'desktop',
      name: { fi: 'Työpöytä', en: 'Desktop' },
      description: { fi: 'Avaa työpöytä', en: 'Open desktop' },
      icon: Home,
      action: () => setLocation(`/wilma-desktop/${userId}`),
      keywords: ['desktop', 'työpöytä', 'apps', 'sovellukset']
    },
    {
      id: 'settings',
      name: { fi: 'Asetukset', en: 'Settings' },
      description: { fi: 'Avaa asetukset', en: 'Open settings' },
      icon: Settings,
      action: () => setLocation(`/wilma/${userId}/settings`),
      keywords: ['settings', 'asetukset', 'preferences', 'valinnat']
    }
  ];

  // Keyboard shortcut to open command bar (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter commands based on query
  useEffect(() => {
    if (!query.trim()) {
      setFilteredCommands(commands);
      setSelectedIndex(0);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = commands.filter(cmd => {
      const nameMatch = cmd.name.fi.toLowerCase().includes(lowerQuery) || 
                       cmd.name.en.toLowerCase().includes(lowerQuery);
      const keywordMatch = cmd.keywords.some(kw => kw.toLowerCase().includes(lowerQuery));
      return nameMatch || keywordMatch;
    });

    setFilteredCommands(filtered);
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        executeCommand(filteredCommands[selectedIndex]);
      }
    }
  };

  const executeCommand = (command: Command) => {
    command.action();
    setIsOpen(false);
    setQuery('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 z-50"
        title={t('Avaa komentoikkuna (Ctrl+K)', 'Open command bar (Ctrl+K)')}
      >
        <Command className="w-6 h-6" />
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={() => setIsOpen(false)}
      />

      {/* Command Bar */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4">
        <Card className="shadow-2xl">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <Search className="w-5 h-5 text-gray-400" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('Kirjoita komento tai hae... (esim. /learn-coding)', 'Type a command or search... (e.g. /learn-coding)')}
                className="border-0 focus-visible:ring-0 text-lg"
                autoFocus
              />
              <kbd className="hidden sm:inline-block px-2 py-1 text-xs bg-gray-100 rounded">
                ESC
              </kbd>
            </div>

            {/* Command List */}
            <div className="max-h-96 overflow-y-auto space-y-1">
              {filteredCommands.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {t('Ei tuloksia', 'No results')}
                </div>
              ) : (
                filteredCommands.map((command, index) => {
                  const Icon = command.icon;
                  return (
                    <button
                      key={command.id}
                      onClick={() => executeCommand(command)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        index === selectedIndex
                          ? 'bg-purple-100 text-purple-900'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        index === selectedIndex ? 'bg-purple-200' : 'bg-gray-100'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold">
                          {command.name[language]}
                        </p>
                        <p className="text-sm text-gray-600">
                          {command.description[language]}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                  );
                })
              )}
            </div>

            {/* Hints */}
            <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-gray-100 rounded">↑↓</kbd>
                  {t('Navigoi', 'Navigate')}
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-gray-100 rounded">↵</kbd>
                  {t('Valitse', 'Select')}
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-gray-100 rounded">ESC</kbd>
                  {t('Sulje', 'Close')}
                </span>
              </div>
              <span className="hidden sm:inline">
                {t('Pikanäppäin:', 'Shortcut:')} <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl+K</kbd>
              </span>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
