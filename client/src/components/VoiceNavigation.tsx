import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Play,
  Square,
  RotateCcw
} from 'lucide-react';

interface VoiceCommand {
  phrase: string;
  action: string;
  room?: string;
}

export function VoiceNavigation() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const voiceCommands: VoiceCommand[] = [
    { phrase: "navigate to", action: "Navigate to room", room: "dynamic" },
    { phrase: "find room", action: "Search for room", room: "dynamic" },
    { phrase: "where is", action: "Locate room", room: "dynamic" },
    { phrase: "go to admin", action: "Open admin panel" },
    { phrase: "show map", action: "Display campus map" },
    { phrase: "help", action: "Show help guide" },
    { phrase: "clear route", action: "Clear navigation" }
  ];

  const speak = (text: string) => {
    if (!voiceEnabled) return;
    
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      speak("Sorry, voice recognition is not supported in this browser.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript.toLowerCase();
      setTranscript(result);
      processVoiceCommand(result);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      speak("Sorry, I didn't catch that. Please try again.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const processVoiceCommand = (transcript: string) => {
    const foundCommand = voiceCommands.find(cmd => 
      transcript.includes(cmd.phrase)
    );

    if (foundCommand) {
      if (foundCommand.phrase === "navigate to" || foundCommand.phrase === "find room" || foundCommand.phrase === "where is") {
        // Extract room number from transcript
        const roomMatch = transcript.match(/[a-z]?\d+/i);
        if (roomMatch) {
          const room = roomMatch[0].toUpperCase();
          setLastCommand({ ...foundCommand, room });
          speak(`Navigating to room ${room}. Please follow the blue path on the map.`);
        } else {
          speak("Please specify a room number, for example: 'Navigate to M12'");
        }
      } else {
        setLastCommand(foundCommand);
        
        switch (foundCommand.action) {
          case "Open admin panel":
            speak("Opening admin panel");
            setTimeout(() => window.location.href = '/admin', 1000);
            break;
          case "Display campus map":
            speak("Showing campus map");
            break;
          case "Show help guide":
            speak("Opening help guide. You can say commands like 'navigate to M12' or 'find room K15'");
            break;
          case "Clear navigation":
            speak("Navigation cleared");
            break;
          default:
            speak(`Command recognized: ${foundCommand.action}`);
        }
      }
    } else {
      speak("Sorry, I didn't understand that command. Try saying 'navigate to M12' or 'help' for available commands.");
    }
  };

  const stopSpeaking = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    if (voiceEnabled) {
      stopSpeaking();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-blue-600" />
            Voice Navigation
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleVoice}
            className="p-1"
          >
            {voiceEnabled ? (
              <Volume2 className="w-4 h-4 text-blue-600" />
            ) : (
              <VolumeX className="w-4 h-4 text-gray-400" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voice Controls */}
        <div className="flex gap-2">
          <Button
            onClick={startListening}
            disabled={isListening || !voiceEnabled}
            className={`flex-1 ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4 mr-2" />
                Listening...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Start Voice
              </>
            )}
          </Button>
          
          {isSpeaking && (
            <Button
              onClick={stopSpeaking}
              variant="outline"
              className="px-3"
            >
              <Square className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-2">
          {isListening && (
            <Badge className="bg-red-500 animate-pulse">
              🎤 Listening
            </Badge>
          )}
          {isSpeaking && (
            <Badge className="bg-blue-500 animate-pulse">
              🔊 Speaking
            </Badge>
          )}
          {!isListening && !isSpeaking && (
            <Badge variant="secondary">
              Ready
            </Badge>
          )}
        </div>

        {/* Last Transcript */}
        {transcript && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-600 mb-1">You said:</p>
            <p className="text-sm italic">"{transcript}"</p>
          </div>
        )}

        {/* Last Command */}
        {lastCommand && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-600 mb-1">Action:</p>
            <p className="text-sm">{lastCommand.action} {lastCommand.room && `- ${lastCommand.room}`}</p>
          </div>
        )}

        {/* Voice Commands Help */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600">Try saying:</p>
          <div className="grid grid-cols-1 gap-1 text-xs">
            <div className="p-2 bg-gray-50 rounded text-center">"Navigate to M12"</div>
            <div className="p-2 bg-gray-50 rounded text-center">"Find room K15"</div>
            <div className="p-2 bg-gray-50 rounded text-center">"Where is L20?"</div>
            <div className="p-2 bg-gray-50 rounded text-center">"Go to admin"</div>
            <div className="p-2 bg-gray-50 rounded text-center">"Help"</div>
          </div>
        </div>

        {/* Browser Support Note */}
        {!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window) && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              Voice recognition requires Chrome, Safari, or Edge browser
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}