import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, Send, HelpCircle, Book, Calendar, 
  Mail, User, Settings, ExternalLink, ChevronRight,
  Clock, CheckCircle, AlertCircle, FileText
} from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'owl';
  timestamp: Date;
  quickActions?: QuickAction[];
}

interface QuickAction {
  label: string;
  action: string;
  icon?: React.ReactNode;
}

/**
 * Smart Support Owl (Tuki Pöllö)
 * Rule-based intelligent support system - NO AI
 * Finnish language support with quick actions
 */
export default function SmartSupportOwl() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hei! Olen Tuki Pöllö 🦉 Kuinka voin auttaa sinua tänään?',
      sender: 'owl',
      timestamp: new Date(),
      quickActions: [
        { label: 'Salasanan vaihto', action: 'password', icon: <Settings className="w-4 h-4" /> },
        { label: 'Lukujärjestys', action: 'schedule', icon: <Calendar className="w-4 h-4" /> },
        { label: 'Arvosanat', action: 'grades', icon: <FileText className="w-4 h-4" /> },
        { label: 'Viestit', action: 'messages', icon: <Mail className="w-4 h-4" /> },
      ]
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Knowledge base - Rule-based responses (NO AI)
  const knowledgeBase = {
    // Password related
    salasana: {
      keywords: ['salasana', 'password', 'vaihda', 'unohdin', 'forgot'],
      response: 'Voit vaihtaa salasanasi seuraavasti:\n\n1. Klikkaa "Asetukset" yläpalkista\n2. Valitse "Salasanan vaihto"\n3. Syötä vanha salasana\n4. Syötä uusi salasana kahdesti\n5. Klikkaa "Tallenna"\n\nJos olet unohtanut salasanasi, klikkaa "Unohdin salasanani" kirjautumissivulla.',
      quickActions: [
        { label: 'Avaa asetukset', action: 'open-settings', icon: <Settings className="w-4 h-4" /> },
        { label: 'Salasanan palautus', action: 'reset-password', icon: <HelpCircle className="w-4 h-4" /> },
      ]
    },
    
    // Schedule related
    lukujärjestys: {
      keywords: ['lukujärjestys', 'aikataulu', 'schedule', 'oppitunti', 'tunti'],
      response: 'Lukujärjestyksesi löydät seuraavasti:\n\n1. Siirry "Wilma" -välilehdelle\n2. Valitse "Lukujärjestys"\n3. Näet tämän viikon tunnit\n\nVoit myös:\n- Tulostaa lukujärjestyksen\n- Ladata sen PDF-muodossa\n- Jakaa sen huoltajille',
      quickActions: [
        { label: 'Avaa lukujärjestys', action: 'open-schedule', icon: <Calendar className="w-4 h-4" /> },
        { label: 'Lataa PDF', action: 'download-schedule', icon: <FileText className="w-4 h-4" /> },
      ]
    },
    
    // Grades related
    arvosanat: {
      keywords: ['arvosana', 'arvosanat', 'grade', 'numero', 'suoritus'],
      response: 'Arvosanasi löydät seuraavasti:\n\n1. Siirry "Wilma" -välilehdelle\n2. Valitse "Arvosanat"\n3. Näet kaikki arvosanasi\n\nArvosanat päivittyvät automaattisesti kun opettaja on merkinnyt ne järjestelmään.',
      quickActions: [
        { label: 'Avaa arvosanat', action: 'open-grades', icon: <FileText className="w-4 h-4" /> },
        { label: 'Tilastot', action: 'view-stats', icon: <CheckCircle className="w-4 h-4" /> },
      ]
    },
    
    // Messages related
    viestit: {
      keywords: ['viesti', 'viestit', 'message', 'sähköposti', 'email'],
      response: 'Viestit löydät seuraavasti:\n\n1. Siirry "Wilma" -välilehdelle\n2. Valitse "Viestit"\n3. Näet kaikki viestisi\n\nVoit lähettää viestin:\n1. Klikkaa "Uusi viesti"\n2. Valitse vastaanottaja\n3. Kirjoita viesti\n4. Klikkaa "Lähetä"',
      quickActions: [
        { label: 'Avaa viestit', action: 'open-messages', icon: <Mail className="w-4 h-4" /> },
        { label: 'Uusi viesti', action: 'new-message', icon: <Send className="w-4 h-4" /> },
      ]
    },
    
    // Attendance related
    poissaolo: {
      keywords: ['poissaolo', 'poissa', 'sairas', 'absence', 'tuntimerkintä'],
      response: 'Poissaolojen ilmoittaminen:\n\n1. Siirry "Wilma" -välilehdelle\n2. Valitse "Tuntimerkinnät"\n3. Klikkaa "Ilmoita poissaolo"\n4. Valitse päivämäärä ja syy\n5. Klikkaa "Tallenna"\n\nHuoltaja voi myös ilmoittaa poissaolon puolestasi.',
      quickActions: [
        { label: 'Ilmoita poissaolo', action: 'report-absence', icon: <AlertCircle className="w-4 h-4" /> },
        { label: 'Näytä tuntimerkinnät', action: 'view-attendance', icon: <CheckCircle className="w-4 h-4" /> },
      ]
    },
    
    // Technical issues
    tekninen: {
      keywords: ['ei toimi', 'virhe', 'error', 'bug', 'ongelma', 'tekninen'],
      response: 'Teknisen ongelman ratkaiseminen:\n\n1. Päivitä sivu (F5 tai Ctrl+R)\n2. Tyhjennä selaimen välimuisti\n3. Kokeile toista selainta\n4. Tarkista internet-yhteys\n\nJos ongelma jatkuu, ota yhteyttä tukeen.',
      quickActions: [
        { label: 'Päivitä sivu', action: 'refresh', icon: <HelpCircle className="w-4 h-4" /> },
        { label: 'Ota yhteyttä tukeen', action: 'contact-support', icon: <Mail className="w-4 h-4" /> },
      ]
    },
    
    // Default/general help
    default: {
      keywords: [],
      response: 'Voin auttaa sinua seuraavissa asioissa:\n\n• Salasanan vaihto\n• Lukujärjestyksen katselu\n• Arvosanojen tarkistus\n• Viestien lähettäminen\n• Poissaolojen ilmoittaminen\n• Tekniset ongelmat\n\nKirjoita kysymyksesi tai valitse aihe alta!',
      quickActions: [
        { label: 'Salasana', action: 'password', icon: <Settings className="w-4 h-4" /> },
        { label: 'Lukujärjestys', action: 'schedule', icon: <Calendar className="w-4 h-4" /> },
        { label: 'Arvosanat', action: 'grades', icon: <FileText className="w-4 h-4" /> },
        { label: 'Viestit', action: 'messages', icon: <Mail className="w-4 h-4" /> },
      ]
    }
  };

  // Find best matching response based on keywords (rule-based)
  const findBestResponse = (userInput: string): { response: string; quickActions?: QuickAction[] } => {
    const input = userInput.toLowerCase();
    
    // Check each knowledge base entry
    for (const [key, data] of Object.entries(knowledgeBase)) {
      if (key === 'default') continue;
      
      // Check if any keyword matches
      const hasMatch = data.keywords.some(keyword => input.includes(keyword));
      if (hasMatch) {
        return { response: data.response, quickActions: data.quickActions };
      }
    }
    
    // Return default response if no match
    return { response: knowledgeBase.default.response, quickActions: knowledgeBase.default.quickActions };
  };

  // Handle sending message
  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate typing delay (rule-based response generation)
    setTimeout(() => {
      const { response, quickActions } = findBestResponse(inputText);
      
      const owlMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'owl',
        timestamp: new Date(),
        quickActions
      };
      
      setMessages(prev => [...prev, owlMessage]);
      setIsTyping(false);
    }, 800);
  };

  // Handle quick action
  const handleQuickAction = (action: string) => {
    // Simulate clicking quick action
    const actionMessages: Record<string, string> = {
      password: 'Kuinka vaihdan salasanani?',
      schedule: 'Missä näen lukujärjestykseni?',
      grades: 'Kuinka tarkistan arvosanani?',
      messages: 'Kuinka lähetän viestin?',
      'open-settings': 'Avaa asetukset',
      'open-schedule': 'Avaa lukujärjestys',
      'open-grades': 'Avaa arvosanat',
      'open-messages': 'Avaa viestit',
      'contact-support': 'Haluan ottaa yhteyttä tukeen'
    };

    const message = actionMessages[action] || action;
    setInputText(message);
    handleSendMessage();
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="border-gray-200 dark:border-gray-700 h-[600px] flex flex-col">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-b">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-2xl">
            🦉
          </div>
          <div>
            <CardTitle className="text-lg">Tuki Pöllö</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">Älykäs tukijärjestelmä</p>
          </div>
          <Badge variant="outline" className="ml-auto">
            <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
            Online
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] ${message.sender === 'user' ? 'order-2' : 'order-1'}`}>
              <div
                className={`rounded-lg p-3 ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                }`}
              >
                <p className="text-sm whitespace-pre-line">{message.text}</p>
              </div>
              
              {/* Quick Actions */}
              {message.quickActions && message.quickActions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {message.quickActions.map((action, idx) => (
                    <Button
                      key={idx}
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickAction(action.action)}
                      className="text-xs"
                    >
                      {action.icon}
                      <span className="ml-1">{action.label}</span>
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {message.timestamp.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Kirjoita kysymyksesi..."
            className="flex-1"
          />
          <Button onClick={handleSendMessage} className="bg-blue-600 hover:bg-blue-700">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          Tuki Pöllö käyttää sääntöpohjaista logiikkaa - ei tekoälyä
        </p>
      </div>
    </Card>
  );
}
