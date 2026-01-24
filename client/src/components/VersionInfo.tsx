import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Info, Sparkles, Zap, Users, Map, Navigation } from "lucide-react";

export default function VersionInfo() {
  const [showChangelog, setShowChangelog] = useState(false);
  
  const version = "2.0.2";
  const releaseDate = "January 25, 2026";
  const originalReleaseDate = "August 20, 2025";
  
  return (
    <>
      <button
        onClick={() => setShowChangelog(true)}
        className="fixed bottom-4 right-4 z-30 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center space-x-2 text-sm font-semibold"
        title="View Version Info & Changelog"
      >
        <Info className="h-4 w-4" />
        <span>v{version}</span>
      </button>
      
      <Dialog open={showChangelog} onOpenChange={setShowChangelog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-br from-white via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <DialogHeader className="pb-6 border-b-2 border-blue-200 dark:border-gray-700">
            <DialogTitle className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-2xl shadow-xl">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-3xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  KSYK Maps v{version}
                </div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">
                  Latest Update: {releaseDate}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-3 space-y-6 mt-6 pb-6" style={{ maxHeight: 'calc(90vh - 200px)', overflowY: 'auto' }}>
            <div className="space-y-6">
            {/* Version 2.0.1 Updates */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200">
              <h3 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
                <Sparkles className="h-6 w-6" />
                Version 2.0.1 - Latest Updates
              </h3>
              <div className="space-y-3 text-green-800">
                <div>
                  <h4 className="font-bold mb-2">Added:</h4>
                  <ul className="space-y-1 text-sm ml-4">
                    <li>• Version info button showing current version</li>
                    <li>• Comprehensive changelog dialog</li>
                    <li>• Staff management system fully functional</li>
                    <li>• Staff dashboard with statistics</li>
                    <li>• Search and filter for staff members</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-2">Fixed:</h4>
                  <ul className="space-y-1 text-sm ml-4">
                    <li>• Staff CRUD operations now working</li>
                    <li>• Mobile responsiveness improvements</li>
                    <li>• Sidebar toggle positioning on mobile</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Major Features from 2.0.0 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200">
              <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                <Zap className="h-6 w-6" />
                Version 2.0.0 - Major Release
              </h3>
              <p className="text-blue-800 mb-4">
                Complete redesign with navigation, staff management, and enhanced map visualization.
              </p>
            </div>
            
            {/* Navigation System */}
            <div className="space-y-3">
              <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Navigation className="h-5 w-5 text-blue-600" />
                Navigation System
              </h4>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Google Maps-Style Navigation</strong> - Professional route planning with visual paths</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Animated Path Visualization</strong> - Blue animated lines showing the route on map</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Smart Waypoints</strong> - Numbered step markers along the route</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>A to B Markers</strong> - Pulsing green start and red destination markers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Pathfinding Algorithm</strong> - A* algorithm for optimal routes</span>
                </li>
              </ul>
            </div>
            
            {/* Staff Management */}
            <div className="space-y-3">
              <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Staff Management
              </h4>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  <span><strong>Full CRUD Operations</strong> - Create, Read, Update, Delete staff members</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  <span><strong>Staff Dashboard</strong> - Stats showing total staff, active count, departments</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  <span><strong>Search & Filter</strong> - Find staff by name, email, position, or department</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  <span><strong>Multilingual Support</strong> - Position and department names in EN/FI</span>
                </li>
              </ul>
            </div>
            
            {/* Map Enhancements */}
            <div className="space-y-3">
              <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Map className="h-5 w-5 text-green-600" />
                Map Enhancements
              </h4>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span><strong>3D Building Rendering</strong> - Multi-layer shadows for depth perception</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span><strong>Dynamic Gradients</strong> - Custom color gradients for each building</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span><strong>Glow Effects</strong> - Gaussian blur filters for professional appearance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span><strong>Glass Shine</strong> - Modern glass overlay effect on buildings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span><strong>Floor Badges</strong> - Visual indicators showing building height</span>
                </li>
              </ul>
            </div>
            
            {/* UI/UX Improvements */}
            <div className="space-y-3">
              <h4 className="text-lg font-bold text-gray-900">UI/UX Improvements</h4>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 font-bold">•</span>
                  <span><strong>Fixed Sidebar Toggle</strong> - Smooth sliding sidebar with proper positioning</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 font-bold">•</span>
                  <span><strong>Mobile Responsive</strong> - Optimized for all screen sizes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 font-bold">•</span>
                  <span><strong>Dark Mode</strong> - Fully functional dark theme throughout the app</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 font-bold">•</span>
                  <span><strong>Smooth Animations</strong> - 300ms transitions with easing</span>
                </li>
              </ul>
            </div>
            
            {/* Bug Fixes */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="text-lg font-bold text-green-900 mb-3">Bug Fixes</h4>
              <ul className="space-y-1 text-green-800 text-sm">
                <li>• Fixed sidebar toggle button overlap issues</li>
                <li>• Fixed navigation path not displaying on map</li>
                <li>• Fixed mobile sidebar positioning</li>
                <li>• Fixed z-index conflicts between components</li>
                <li>• Fixed room color rendering (now fully colored)</li>
                <li>• Fixed rectangle tool message (2 points instead of 3)</li>
                <li>• Fixed loading screen progress bar animation</li>
                <li>• Fixed hallways API 404 error</li>
              </ul>
            </div>
            
            {/* Coming Soon */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
              <h4 className="text-lg font-bold text-purple-900 mb-3">Coming Soon</h4>
              <ul className="space-y-1 text-purple-800 text-sm">
                <li>• Event calendar with room booking</li>
                <li>• Analytics dashboard</li>
                <li>• Push notifications</li>
                <li>• QR code integration</li>
                <li>• 3D map view</li>
              </ul>
            </div>
            
            {/* Footer */}
            <div className="text-center pt-6 border-t-2 border-blue-200 dark:border-gray-700">
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 p-6 rounded-2xl border-2 border-blue-200 dark:border-gray-600 shadow-lg mb-6">
                <h4 className="font-black text-blue-900 dark:text-blue-300 mb-3 text-lg">📞 Need Help?</h4>
                <p className="text-blue-800 dark:text-blue-400 text-sm mb-4">
                  For support, feature requests, or bug reports:
                </p>
                <div className="space-y-2">
                  <a 
                    href="mailto:juuso.kaikula@ksyk.fi?subject=KSYK Maps Support (v2.0.1)"
                    className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold text-base transition-colors"
                  >
                    <span>📧</span>
                    <span>juuso.kaikula@ksyk.fi</span>
                  </a>
                  <br />
                  <a 
                    href="https://discord.gg/5ERZp9gUpr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold text-base transition-colors"
                  >
                    <span>💬</span>
                    <span>Join Discord Community</span>
                  </a>
                </div>
                <p className="text-blue-600 dark:text-blue-400 text-xs mt-4">
                  ⏱️ Response time: Usually within 24 hours
                </p>
              </div>
              
              <div className="text-gray-600 dark:text-gray-400 text-sm space-y-1">
                <p className="font-semibold">
                  Made with ❤️ by <strong className="text-blue-600 dark:text-blue-400">OWL Apps</strong> for KSYK
                </p>
                <p className="text-xs">
                  Originally released: {originalReleaseDate}
                </p>
                <p className="text-xs">
                  © 2025-2026 OWL Apps. All rights reserved.
                </p>
              </div>
            </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t-2 border-blue-200 dark:border-gray-700">
            <Button 
              onClick={() => setShowChangelog(false)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-8 py-2 shadow-lg"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
