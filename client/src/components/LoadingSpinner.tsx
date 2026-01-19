import { Loader2, MapPin, Building, Layers, Navigation } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

export default function LoadingSpinner({ 
  message = "Loading KSYK Maps...", 
  size = "md",
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-16 w-16", 
    lg: "h-24 w-24"
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };

  // Full-screen loading overlay
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 backdrop-blur-sm">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px),
                             radial-gradient(circle at 75% 75%, white 2px, transparent 2px)`,
            backgroundSize: '50px 50px',
            animation: 'moveBackground 20s linear infinite'
          }}></div>
        </div>

        {/* Main loading content */}
        <div className="relative z-10 flex flex-col items-center justify-center p-8">
          {/* Logo/Icon area with multiple spinning rings */}
          <div className="relative mb-8">
            {/* Outer ring - slow spin */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-32 w-32 border-4 border-white/20 border-t-white rounded-full animate-spin" 
                   style={{ animationDuration: '3s' }}></div>
            </div>
            
            {/* Middle ring - medium spin */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-24 w-24 border-4 border-white/30 border-t-white rounded-full animate-spin" 
                   style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
            </div>
            
            {/* Inner ring - fast spin */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 border-4 border-white/40 border-t-white rounded-full animate-spin" 
                   style={{ animationDuration: '1s' }}></div>
            </div>
            
            {/* Center icon with pulse */}
            <div className="relative h-32 w-32 flex items-center justify-center">
              <div className="absolute inset-0 bg-white/10 rounded-full animate-ping"></div>
              <div className="relative bg-white rounded-full p-6 shadow-2xl">
                <MapPin className="h-12 w-12 text-blue-600 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Loading text */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold text-white drop-shadow-lg animate-pulse">
              KSYK Maps
            </h2>
            <p className="text-xl text-white/90 font-medium">
              {message}
            </p>
            
            {/* Animated dots */}
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>

            {/* Feature icons */}
            <div className="flex items-center justify-center space-x-6 mt-8 pt-8 border-t border-white/20">
              <div className="flex flex-col items-center space-y-2 animate-pulse" style={{ animationDelay: '0ms' }}>
                <div className="bg-white/20 p-3 rounded-full">
                  <Building className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs text-white/80 font-medium">Buildings</span>
              </div>
              <div className="flex flex-col items-center space-y-2 animate-pulse" style={{ animationDelay: '200ms' }}>
                <div className="bg-white/20 p-3 rounded-full">
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs text-white/80 font-medium">Floors</span>
              </div>
              <div className="flex flex-col items-center space-y-2 animate-pulse" style={{ animationDelay: '400ms' }}>
                <div className="bg-white/20 p-3 rounded-full">
                  <Navigation className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs text-white/80 font-medium">Navigation</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-8 w-64 h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full animate-pulse" 
                 style={{ 
                   width: '100%',
                   animation: 'progressBar 2s ease-in-out infinite'
                 }}></div>
          </div>
        </div>

        {/* Add keyframe animations */}
        <style>{`
          @keyframes moveBackground {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 50px); }
          }
          @keyframes progressBar {
            0%, 100% { transform: translateX(-100%); }
            50% { transform: translateX(0); }
          }
        `}</style>
      </div>
    );
  }

  // Regular inline loading spinner
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative">
        {/* Outer spinning ring */}
        <div className={`${sizeClasses[size]} border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin`}></div>
        
        {/* Inner pulsing dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
        </div>
      </div>
      
      <div className="mt-4 text-center">
        <p className={`${textSizes[size]} font-medium text-gray-700`}>{message}</p>
        <div className="flex items-center justify-center mt-2 space-x-1">
          <MapPin className="h-4 w-4 text-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
          <Building className="h-4 w-4 text-green-500 animate-bounce" style={{ animationDelay: "150ms" }} />
          <MapPin className="h-4 w-4 text-purple-500 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}