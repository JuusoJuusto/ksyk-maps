import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Code, Terminal, Cpu, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { trackEasterEgg } from "@/lib/analytics";

export default function DevModeEasterEgg() {
  const [, setLocation] = useLocation();
  const [showNeonPopup, setShowNeonPopup] = useState(false);

  useEffect(() => {
    const wasFound = localStorage.getItem("ksyk_dev_mode_found") === "true";
    localStorage.setItem("ksyk_dev_mode_found", "true");
    
    // Unlock neon mode
    const wasNeonUnlocked = localStorage.getItem("ksyk_neon_unlocked") === "true";
    localStorage.setItem("ksyk_neon_unlocked", "true");
    
    // Show neon unlock popup if first time
    if (!wasNeonUnlocked) {
      setShowNeonPopup(true);
      setTimeout(() => setShowNeonPopup(false), 5000);
    }
    
    if (!wasFound) {
      trackEasterEgg('dev-mode');
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-8">
      {/* Neon Mode Unlocked Popup */}
      {showNeonPopup && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: -100 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: -100 }}
          className="fixed top-4 left-4 right-4 md:top-8 md:left-1/2 md:right-auto md:transform md:-translate-x-1/2 z-[9999] bg-gradient-to-r from-green-500 via-cyan-500 to-purple-500 p-1 rounded-2xl shadow-2xl max-w-md mx-auto"
        >
          <div className="bg-black px-4 py-4 md:px-8 md:py-6 rounded-2xl">
            <div className="flex items-center gap-3 md:gap-4">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="text-4xl"
              >
                🌈
              </motion.div>
              <div>
                <h3 className="text-lg md:text-xl font-bold text-green-400">Neon Mode Unlocked!</h3>
                <p className="text-sm text-cyan-400">Check your theme settings</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <Terminal className="w-12 h-12" />
            <h1 className="text-4xl font-bold">DEV MODE ACTIVATED</h1>
          </div>

          <div className="space-y-4 mb-8">
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2"
            >
              <span className="text-yellow-400">$</span>
              <span>Initializing developer environment...</span>
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                _
              </motion.span>
            </motion.div>

            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <span className="text-green-500">✓</span> Loading React components...
            </motion.div>

            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <span className="text-green-500">✓</span> Compiling TypeScript...
            </motion.div>

            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <span className="text-green-500">✓</span> Starting Vite dev server...
            </motion.div>

            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <span className="text-green-500">✓</span> Connecting to Firebase...
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="bg-green-900/20 border border-green-500 rounded p-6 mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <Code className="w-8 h-8" />
              <h2 className="text-2xl font-bold">System Info</h2>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="text-blue-400">Framework:</span> React + TypeScript</p>
              <p><span className="text-blue-400">Build Tool:</span> Vite</p>
              <p><span className="text-blue-400">Backend:</span> Express + Firebase</p>
              <p><span className="text-blue-400">Styling:</span> Tailwind CSS</p>
              <p><span className="text-blue-400">Developer:</span> KSYK Maps team</p>
            </div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => setLocation("/")}
            className="bg-green-600 text-black px-8 py-3 rounded font-bold hover:bg-green-500 transition-colors"
          >
            EXIT DEV MODE
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
