import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Timer, Alarm } from "lucide-react";

export default function ClockApp() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mode, setMode] = useState<"clock" | "timer" | "stopwatch">("clock");
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerInput, setTimerInput] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            // Play sound or notification
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const startTimer = () => {
    const total = timerInput.hours * 3600 + timerInput.minutes * 60 + timerInput.seconds;
    if (total > 0) {
      setTimerSeconds(total);
      setTimerRunning(true);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white">
      {/* Mode Selector */}
      <div className="flex items-center justify-center gap-2 p-4 bg-black/20">
        <Button
          onClick={() => setMode("clock")}
          variant={mode === "clock" ? "default" : "ghost"}
          className={mode === "clock" ? "bg-white text-blue-900" : "text-white hover:bg-white/10"}
        >
          <Clock className="w-4 h-4 mr-2" />
          Kello
        </Button>
        <Button
          onClick={() => setMode("timer")}
          variant={mode === "timer" ? "default" : "ghost"}
          className={mode === "timer" ? "bg-white text-blue-900" : "text-white hover:bg-white/10"}
        >
          <Timer className="w-4 h-4 mr-2" />
          Ajastin
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        {mode === "clock" && (
          <div className="text-center">
            <div className="text-8xl font-bold mb-4 font-mono">
              {currentTime.toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
            <div className="text-3xl text-white/80">
              {currentTime.toLocaleDateString("fi-FI", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>
        )}

        {mode === "timer" && (
          <div className="text-center w-full max-w-md">
            {timerRunning || timerSeconds > 0 ? (
              <>
                <div className="text-8xl font-bold mb-8 font-mono">
                  {formatTime(timerSeconds)}
                </div>
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => setTimerRunning(!timerRunning)}
                    className="bg-white text-blue-900 hover:bg-gray-100 px-8 py-6 text-lg"
                  >
                    {timerRunning ? "Pysäytä" : "Jatka"}
                  </Button>
                  <Button
                    onClick={() => {
                      setTimerSeconds(0);
                      setTimerRunning(false);
                    }}
                    className="bg-red-600 hover:bg-red-700 px-8 py-6 text-lg"
                  >
                    Nollaa
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-4xl font-bold mb-8">Aseta ajastin</div>
                <div className="flex gap-4 justify-center mb-8">
                  <div className="text-center">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={timerInput.hours}
                      onChange={(e) => setTimerInput({ ...timerInput, hours: parseInt(e.target.value) || 0 })}
                      className="w-20 h-20 text-4xl text-center bg-white/10 border-2 border-white/30 rounded-lg text-white font-mono"
                    />
                    <p className="text-sm mt-2 text-white/70">Tunnit</p>
                  </div>
                  <div className="text-center">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={timerInput.minutes}
                      onChange={(e) => setTimerInput({ ...timerInput, minutes: parseInt(e.target.value) || 0 })}
                      className="w-20 h-20 text-4xl text-center bg-white/10 border-2 border-white/30 rounded-lg text-white font-mono"
                    />
                    <p className="text-sm mt-2 text-white/70">Minuutit</p>
                  </div>
                  <div className="text-center">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={timerInput.seconds}
                      onChange={(e) => setTimerInput({ ...timerInput, seconds: parseInt(e.target.value) || 0 })}
                      className="w-20 h-20 text-4xl text-center bg-white/10 border-2 border-white/30 rounded-lg text-white font-mono"
                    />
                    <p className="text-sm mt-2 text-white/70">Sekunnit</p>
                  </div>
                </div>
                <Button
                  onClick={startTimer}
                  className="bg-green-600 hover:bg-green-700 px-12 py-6 text-xl"
                >
                  <Alarm className="w-6 h-6 mr-2" />
                  Käynnistä ajastin
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
