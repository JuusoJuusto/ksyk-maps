import { useDarkMode } from "@/contexts/DarkModeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Mail, MessageSquare, Github, Globe, Heart } from "lucide-react";
import { useNavigate } from "wouter";

export default function OWLApps() {
  const { darkMode } = useDarkMode();
  const [, navigate] = useNavigate();

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'}`}>
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b shadow-sm`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to KSYK Maps
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl mb-6 shadow-2xl">
            <span className="text-4xl font-black text-white">OWL</span>
          </div>
          <h1 className={`text-5xl font-black mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            OWL Apps
          </h1>
          <p className={`text-xl ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Building innovative solutions for education
          </p>
        </div>

        {/* About Section */}
        <Card className={`mb-8 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <CardContent className="p-8">
            <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              About Us
            </h2>
            <p className={`text-lg leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              OWL Apps is a software development team dedicated to creating innovative solutions for educational institutions. 
              We specialize in building intuitive, user-friendly applications that enhance the learning experience and streamline 
              campus operations.
            </p>
          </CardContent>
        </Card>

        {/* Projects Section */}
        <Card className={`mb-8 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <CardContent className="p-8">
            <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Our Projects
            </h2>
            
            <div className={`p-6 rounded-xl border-2 ${darkMode ? 'bg-gray-700 border-blue-600' : 'bg-blue-50 border-blue-300'}`}>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-600 rounded-xl">
                  <Globe className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    KSYK Maps
                  </h3>
                  <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Interactive campus navigation system for Kulosaaren Yhteiskoulu. Features include:
                  </p>
                  <ul className={`space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <li className="flex items-center gap-2">
                      <span className="text-blue-600">•</span>
                      Google Maps-style navigation with A* pathfinding
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-blue-600">•</span>
                      3D building visualization with real-time updates
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-blue-600">•</span>
                      Staff directory and room booking system
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-blue-600">•</span>
                      Multilingual support (English & Finnish)
                    </li>
                  </ul>
                  <div className="mt-4">
                    <Button
                      onClick={() => navigate("/")}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Visit KSYK Maps
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <Card className={`mb-8 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <CardContent className="p-8">
            <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Get in Touch
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <a
                href="mailto:juuso.kaikula@ksyk.fi"
                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 hover:border-blue-500' 
                    : 'bg-gray-50 border-gray-200 hover:border-blue-500'
                }`}
              >
                <div className="p-3 bg-blue-600 rounded-xl">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Email</h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    juuso.kaikula@ksyk.fi
                  </p>
                </div>
              </a>

              <a
                href="https://discord.gg/5ERZp9gUpr"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 hover:border-indigo-500' 
                    : 'bg-gray-50 border-gray-200 hover:border-indigo-500'
                }`}
              >
                <div className="p-3 bg-indigo-600 rounded-xl">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Discord</h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Join our community
                  </p>
                </div>
              </a>

              <a
                href="https://github.com/JuusoJuusto/ksyk-maps"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 hover:border-gray-500' 
                    : 'bg-gray-50 border-gray-200 hover:border-gray-500'
                }`}
              >
                <div className="p-3 bg-gray-800 rounded-xl">
                  <Github className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>GitHub</h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    View our code
                  </p>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-8">
          <p className={`flex items-center justify-center gap-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Made with <Heart className="h-4 w-4 text-red-500 fill-current" /> by OWL Apps
          </p>
          <p className={`text-sm mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            © 2026 OWL Apps. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
