import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Code, Terminal, Cpu, Zap } from "lucide-react";
import { useEffect } from "react";
import { trackEasterEgg } from "@/lib/analytics";

export default function DevModeEasterEgg() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const wasFound = localStorage.getItem("ksyk_dev_mode_found") === "true";
    localStorage.setItem("ksyk_dev_mode_found", "true");
    
    if (!wasFound) {
      trackEasterEgg('dev-mode');
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-8">
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
              <p><span className="text-blue-400">Developer:</span> Juuso @ StudiOWL</p>
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
