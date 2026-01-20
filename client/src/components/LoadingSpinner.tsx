import { MapPin, Building, Layers, Navigation } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
  variant?: "gradient" | "white";
}

export default function LoadingSpinner({ 
  message = "Loading KSYK Maps...", 
  size = "md",
  fullScreen = false,
  variant = "gradient"
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
    const isWhite = variant === "white";
    
    return (
      <div className={`fixed inset-0 z-[9999] flex items-center justify-center ${
        isWhite 
          ? 'bg-white' 
          : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700'
      }`} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}>
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, ${isWhite ? '#3B82F6' : 'white'} 2px, transparent 2px),
                             radial-gradient(circle at 75% 75%, ${isWhite ? '#3B82F6' : 'white'} 2px, transparent 2px)`,
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
              <div className={`h-32 w-32 border-4 rounded-full animate-spin ${
                isWhite 
                  ? 'border-blue-100 border-t-blue-600' 
                  : 'border-white/20 border-t-white'
              }`} style={{ animationDuration: '3s' }}></div>
            </div>
            
            {/* Middle ring - medium spin */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`h-24 w-24 border-4 rounded-full animate-spin ${
                isWhite 
                  ? 'border-indigo-100 border-t-indigo-600' 
                  : 'border-white/30 border-t-white'
              }`} style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
            </div>
            
            {/* Inner ring - fast spin */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`h-16 w-16 border-4 rounded-full animate-spin ${
                isWhite 
                  ? 'border-purple-100 border-t-purple-600' 
                  : 'border-white/40 border-t-white'
              }`} style={{ animationDuration: '1s' }}></div>
            </div>
            
            {/* Center icon with pulse */}
            <div className="relative h-32 w-32 flex items-center justify-center">
              <div className={`absolute inset-0 rounded-full animate-ping ${
                isWhite ? 'bg-blue-200' : 'bg-white/10'
              }`}></div>
              <div className={`relative rounded-full p-6 shadow-2xl ${
                isWhite ? 'bg-gradient-to-br from-blue-600 to-indigo-600' : 'bg-white'
              }`}>
                <MapPin className={`h-12 w-12 animate-pulse ${
                  isWhite ? 'text-white' : 'text-blue-600'
                }`} />
              </div>
            </div>
          </div>

          {/* Loading text */}
          <div className="text-center space-y-4">
            <h2 className={`text-4xl font-bold drop-shadow-lg animate-pulse ${
              isWhite 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent' 
                : 'text-white'
            }`}>
              KSYK Maps
            </h2>
            <p className={`text-xl font-medium ${
              isWhite ? 'text-gray-700' : 'text-white/90'
            }`}>
              {message}
            </p>
            
            {/* Animated dots */}
            <div className="flex items-center justify-center space-x-2">
              <div className={`w-3 h-3 rounded-full animate-bounce ${
                isWhite ? 'bg-blue-600' : 'bg-white'
              }`} style={{ animationDelay: '0ms' }}></div>
              <div className={`w-3 h-3 rounded-full animate-bounce ${
                isWhite ? 'bg-indigo-600' : 'bg-white'
              }`} style={{ animationDelay: '150ms' }}></div>
              <div className={`w-3 h-3 rounded-full animate-bounce ${
                isWhite ? 'bg-purple-600' : 'bg-white'
              }`} style={{ animationDelay: '300ms' }}></div>
            </div>

            {/* Feature icons */}
            <div className={`flex items-center justify-center space-x-6 mt-8 pt-8 border-t ${
              isWhite ? 'border-gray-200' : 'border-white/20'
            }`}>
              <div className="flex flex-col items-center space-y-2 animate-pulse" style={{ animationDelay: '0ms' }}>
                <div className={`p-3 rounded-full ${
                  isWhite ? 'bg-blue-100' : 'bg-white/20'
                }`}>
                  <Building className={`h-6 w-6 ${
                    isWhite ? 'text-blue-600' : 'text-white'
                  }`} />
                </div>
                <span className={`text-xs font-medium ${
                  isWhite ? 'text-gray-600' : 'text-white/80'
                }`}>Buildings</span>
              </div>
              <div className="flex flex-col items-center space-y-2 animate-pulse" style={{ animationDelay: '200ms' }}>
                <div className={`p-3 rounded-full ${
                  isWhite ? 'bg-indigo-100' : 'bg-white/20'
                }`}>
                  <Layers className={`h-6 w-6 ${
                    isWhite ? 'text-indigo-600' : 'text-white'
                  }`} />
                </div>
                <span className={`text-xs font-medium ${
                  isWhite ? 'text-gray-600' : 'text-white/80'
                }`}>Floors</span>
              </div>
              <div className="flex flex-col items-center space-y-2 animate-pulse" style={{ animationDelay: '400ms' }}>
                <div className={`p-3 rounded-full ${
                  isWhite ? 'bg-purple-100' : 'bg-white/20'
                }`}>
                  <Navigation className={`h-6 w-6 ${
                    isWhite ? 'text-purple-600' : 'text-white'
                  }`} />
                </div>
                <span className={`text-xs font-medium ${
                  isWhite ? 'text-gray-600' : 'text-white/80'
                }`}>Navigation</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className={`mt-8 w-64 h-2 rounded-full overflow-hidden ${
            isWhite ? 'bg-gray-200' : 'bg-white/20'
          }`}>
            <div className={`h-full rounded-full ${
              isWhite ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-white'
            }`} style={{ 
              width: '100%',
              animation: 'progressBarSlide 2s ease-in-out infinite'
            }}></div>
          </div>
        </div>

        {/* Add keyframe animations */}
        <style>{`
          @keyframes moveBackground {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 50px); }
          }
          @keyframes progressBarSlide {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
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