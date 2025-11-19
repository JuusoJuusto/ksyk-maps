import { Loader2, MapPin, Building } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export default function LoadingSpinner({ message = "Loading...", size = "md" }: LoadingSpinnerProps) {
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