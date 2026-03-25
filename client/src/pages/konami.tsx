import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Gamepad2, Trophy, Zap, Star } from "lucide-react";
import { useEffect, useState } from "react";
import Confetti from "react-confetti";

export default function KonamiEasterEgg() {
  const [, setLocation] = useLocation();
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    
    // Mark as found
    localStorage.setItem("ksyk_konami_found", "true");
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 overflow-hidden relative flex items-center justify-center p-4">
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={true}
        numberOfPieces={200}
      />
      
      <div className="relative z-10 text-center max-w-4xl">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 1 }}
          className="flex justify-center mb-8"
        >
          <Gamepad2 className="w-32 h-32 text-yellow-400" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl md:text-8xl font-black mb-6 text-white"
        >
          KONAMI CODE!
        </motion.h1>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 mb-8"
        >
          <p className="text-3xl text-yellow-400 font-bold mb-4">
            ↑ ↑ ↓ ↓ ← → ← → B A
          </p>
          <p className="text-xl text-white">
            You're a true gamer! 🎮
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          whileHover={{ scale: 1.1 }}
          onClick={() => setLocation("/")}
          className="bg-purple-600 text-white px-12 py-4 rounded-full text-2xl font-bold"
        >
          Back to Reality
        </motion.button>
      </div>
    </div>
  );
}
