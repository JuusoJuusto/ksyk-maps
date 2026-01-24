import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Info, Sparkles, Zap, Users, Map, Navigation } from "lucide-react";

export default function VersionInfo() {
  const [showChangelog, setShowChangelog] = useState(false);
  
  const version = "2.0.1";
  const releaseDate = "January 24, 2026";
  
  return (
    <>
      <button
        onClick={() => setShowChangelog(true)}
        className="fixed bottom-4 right-4 z-40 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center space-x-2 text-sm font-semibold"
        title="View Version Info & Changelog"
      >
        <Info className="h-4 w-4" />
        <span>v{version}</span>
      </button>
      
      <Dialog open={showChangelog} onOpenChange={setShowChangelog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-blue-600" />
              KSYK Maps v{version}
            </DialogTitle>
            <DialogDescription className="text-base">
              Released on {releaseDate}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
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
            <div className="text-center pt-4 border-t">
              <p className="text-gray-600 text-sm mb-3">
                Made with love by <strong>OWL Apps</strong> for KSYK
              </p>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-bold text-blue-900 mb-2">Need Help?</h4>
                <p className="text-blue-800 text-sm mb-2">
                  For support, feature requests, or bug reports:
                </p>
                <a 
                  href="mailto:juuso.kaikula@ksyk.fi?subject=KSYK Maps Support (v2.0.1)"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-sm"
                >
                  <span>📧</span>
                  <span>juuso.kaikula@ksyk.fi</span>
                </a>
                <p className="text-blue-600 text-xs mt-2">
                  Response time: Usually within 24 hours
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <Button onClick={() => setShowChangelog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
