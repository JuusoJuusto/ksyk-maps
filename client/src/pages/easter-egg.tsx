import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Sparkles, Trophy, Star, Zap, Heart, Code, Rocket } from "lucide-react";
import { useEffect, useState } from "react";

export default function EasterEgg() {
  const [, setLocation] = useLocation();
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; delay: number }>>([]);

  useEffect(() => {
    // Generate confetti
    const newConfetti = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2
    }));
    setConfetti(newConfetti);

    // Mark easter egg as found
    localStorage.setItem("ksyk_easter_egg_found", "true");
  }, []);

  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 overflow-hidden relative flex items-center justify-center p-4">
      {/* Animated background stars */}
      {Array.from({ length: 100 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      {/* Confetti */}
      {confetti.map((item) => (
        <motion.div
          key={item.id}
          className="absolute w-3 h-3 rounded-full"
          style={{
            left: `${item.x}%`,
            top: "-10%",
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
          }}
          animate={{
            y: ["0vh", "110vh"],
            rotate: [0, 360],
            x: [0, Math.random() * 100 - 50],
          }}
          transition={{
            duration: Math.random() * 3 + 3,
            repeat: Infinity,
            delay: item.delay,
            ease: "linear",
          }}
        />
      ))}

      <div className="relative z-10 text-center max-w-4xl">
        {/* Trophy Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 1, bounce: 0.5 }}
          className="flex justify-center mb-8"
        >
          <div className="relative">
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            >
              <Trophy className="w-32 h-32 text-yellow-400" />
            </motion.div>
            <motion.div
              className="absolute -top-4 -right-4"
              animate={{
                rotate: 360,
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
            >
              <Sparkles className="w-12 h-12 text-yellow-300" />
            </motion.div>
          </div>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-6xl md:text-8xl font-black mb-6"
        >
          {"YOU FOUND IT!".split("").map((char, i) => (
            <motion.span
              key={i}
              className="inline-block"
              style={{
                background: `linear-gradient(45deg, ${colors[i % colors.length]}, ${colors[(i + 1) % colors.length]})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
              animate={{
                y: [0, -20, 0],
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </motion.h1>

        {/* Achievement Badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.5, bounce: 0.6 }}
          className="inline-block bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 p-1 rounded-2xl mb-8"
        >
          <div className="bg-gray-900 px-8 py-4 rounded-2xl">
            <motion.p
              className="text-3xl md:text-5xl font-bold text-white flex items-center gap-3"
              animate={{
                textShadow: [
                  "0 0 20px #fff",
                  "0 0 30px #ff00de",
                  "0 0 40px #00ff00",
                  "0 0 30px #00ffff",
                  "0 0 20px #fff",
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
            >
              <Star className="w-8 h-8 text-yellow-400" />
              1/1 Easter Eggs Found!
              <Star className="w-8 h-8 text-yellow-400" />
            </motion.p>
          </div>
        </motion.div>

        {/* Fun Fact Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 mb-8 border-4 border-white/20"
        >
          <motion.div
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
            className="inline-block mb-4"
          >
            <Zap className="w-16 h-16 text-yellow-400" />
          </motion.div>
          
          <h2 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <Sparkles className="w-8 h-8 text-pink-400" />
            Fun Fact!
            <Sparkles className="w-8 h-8 text-blue-400" />
          </h2>
          
          <motion.p
            className="text-2xl md:text-3xl text-white font-semibold leading-relaxed"
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
            }}
            style={{
              background: "linear-gradient(90deg, #FF6B6B, #4ECDC4, #45B7D1, #FFA07A, #FF6B6B)",
              backgroundSize: "200% 200%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            The creator and main coder is
          </motion.p>
          
          <motion.p
            className="text-5xl md:text-7xl font-black mt-4"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 2, -2, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
            style={{
              background: "linear-gradient(45deg, #FFD700, #FFA500, #FF69B4, #00CED1, #FFD700)",
              backgroundSize: "300% 300%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "gradient 3s ease infinite",
            }}
          >
            JUUSO
          </motion.p>

          <div className="flex justify-center gap-4 mt-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Code className="w-10 h-10 text-green-400" />
            </motion.div>
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Heart className="w-10 h-10 text-red-400" />
            </motion.div>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Rocket className="w-10 h-10 text-blue-400" />
            </motion.div>
          </div>
        </motion.div>

        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setLocation("/")}
          className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white px-12 py-4 rounded-full text-2xl font-bold shadow-2xl hover:shadow-pink-500/50 transition-all"
        >
          Back to Home
        </motion.button>

        {/* Floating Icons */}
        {[Star, Sparkles, Zap, Heart].map((Icon, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${20 + i * 20}%`,
              top: `${30 + (i % 2) * 40}%`,
            }}
            animate={{
              y: [0, -30, 0],
              rotate: [0, 360],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          >
            <Icon className="w-12 h-12" style={{ color: colors[i] }} />
          </motion.div>
        ))}
      </div>

      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
