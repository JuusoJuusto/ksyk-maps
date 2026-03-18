import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Wrench, AlertTriangle } from 'lucide-react';

interface MaintenanceModeProps {
  message?: string;
}

export default function MaintenanceMode({ message }: MaintenanceModeProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    setIsVisible(true);
  }, []);

  const defaultMessage = "We are currently performing maintenance. Please check back soon.";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: '-100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 100,
            damping: 20,
            duration: 0.6
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 overflow-hidden"
        >
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
              animation: 'slide 20s linear infinite'
            }} />
          </div>

          {/* Content */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="relative z-10 max-w-2xl mx-4 text-center"
          >
            {/* Icon with pulse animation */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="mb-8 flex justify-center"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-blue-400 rounded-full blur-2xl opacity-50 animate-pulse" />
                <div className="relative bg-white/10 backdrop-blur-lg p-8 rounded-full border-4 border-white/20">
                  <Settings className="w-20 h-20 text-white" />
                </div>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-2xl"
            >
              Under Maintenance
            </motion.h1>

            {/* Message */}
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed"
            >
              {message || defaultMessage}
            </motion.p>

            {/* Animated tools */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex justify-center gap-6 mb-8"
            >
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Wrench className="w-12 h-12 text-blue-200" />
              </motion.div>
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              >
                <AlertTriangle className="w-12 h-12 text-yellow-300" />
              </motion.div>
            </motion.div>

            {/* Progress bar */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.8, duration: 1 }}
              className="w-full max-w-md mx-auto h-2 bg-white/20 rounded-full overflow-hidden"
            >
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="h-full w-1/3 bg-gradient-to-r from-transparent via-white to-transparent"
              />
            </motion.div>

            {/* Footer text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-8 text-blue-200 text-sm"
            >
              We'll be back shortly. Thank you for your patience!
            </motion.p>
          </motion.div>

          <style>{`
            @keyframes slide {
              0% {
                transform: translate(0, 0);
              }
              100% {
                transform: translate(50px, 50px);
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
