import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Info, Sparkles, Zap, Users, Map, Navigation } from "lucide-react";

export default function VersionInfo() {
  const [showChangelog, setShowChangelog] = useState(false);
  
  const version = "3.1.0";
  const releaseDate = "March 17, 2026";
  const originalReleaseDate = "August 20, 2025";
  
  return (
    <>
      <button
        onClick={() => setShowChangelog(true)}
        className="fixed bottom-4 right-4 md:bottom-4 md:right-4 z-30 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl hover:bg-blue-700 transition-all transform hover:scale-105 flex items-center space-x-2 text-sm font-semibold"
        title="View Version Info & Changelog"
      >
        <Info className="h-4 w-4" />
        <span>v{version}</span>
      </button>
      
      <Dialog open={showChangelog} onOpenChange={setShowChangelog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-gray-900">
          <DialogHeader className="pb-6 border-b-2 border-blue-200 dark:border-gray-700">
            <DialogTitle className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-xl">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-3xl font-black text-blue-600">
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
            {/* Version 3.1.0 Updates */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl border-2 border-purple-200">
              <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
                <Sparkles className="h-6 w-6" />
                Version 3.1.0 - Revolutionary AI & Enhanced Mobile Experience
              </h3>
              <div className="space-y-3 text-purple-800">
                <div>
                  <h4 className="font-bold mb-2">🤖 Ultra-Enhanced AI v3.1:</h4>
                  <ul className="space-y-1 text-sm ml-4">
                    <li>• Complete rewrite with advanced computer vision algorithms</li>
                    <li>• Advanced Canny Edge Detection with non-maximum suppression</li>
                    <li>• Enhanced Sobel Operators optimized for architectural features</li>
                    <li>• Hough Line Transform for precise wall detection</li>
                    <li>• Morphological Operations for contour analysis</li>
                    <li>• Multi-Algorithm Fusion combining multiple edge detection methods</li>
                    <li>• Real-time progress tracking with visual algorithm indicators</li>
                    <li>• Increased resolution to 1500px for better accuracy</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-2">📱 Perfect Mobile Experience:</h4>
                  <ul className="space-y-1 text-sm ml-4">
                    <li>• Complete mobile dropdown menu with organized sections</li>
                    <li>• Theme selector with visual preview buttons</li>
                    <li>• Language switcher with flag icons</li>
                    <li>• Quick actions for lunch, HSL, and admin access</li>
                    <li>• Fixed all mobile overlapping issues</li>
                    <li>• Proper z-index management and responsive design</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-2">🎨 Comprehensive Admin Settings:</h4>
                  <ul className="space-y-1 text-sm ml-4">
                    <li>• Complete admin settings panel with 6 comprehensive tabs</li>
                    <li>• Global theme management (Light, Dark, Blueprint)</li>
                    <li>• Color customization for all UI elements</li>
                    <li>• Performance controls and AI configuration</li>
                    <li>• All settings save to database and apply globally</li>
                    <li>• Real-time theme switching without page reload</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-2">⚡ Enhanced Blueprint Theme:</h4>
                  <ul className="space-y-1 text-sm ml-4">
                    <li>• Stunning blue and neon aesthetic with grid patterns</li>
                    <li>• Glowing circuit line overlays and radial gradients</li>
                    <li>• Enhanced glow effects and text shadows</li>
                    <li>• Perfect contrast and readability</li>
                    <li>• Futuristic design perfect for technical environments</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-2">🔧 Technical Improvements:</h4>
                  <ul className="space-y-1 text-sm ml-4">
                    <li>• Synced theme system with dark mode context</li>
                    <li>• Removed redundant dark mode toggle from settings</li>
                    <li>• Unified theme cycling: Light → Dark → Blueprint</li>
                    <li>• Database persistence for all theme changes</li>
                    <li>• Improved mobile menu positioning and animations</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Version 2.9.5 Updates */}
            <div className="bg-blue-50 p-6 rounded-xl border-2 border-blue-200">
              <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                <Sparkles className="h-6 w-6" />
                Version 2.9.5 - Latest Updates
              </h3>
              <div className="space-y-3 text-blue-800">
                <div>
                  <h4 className="font-bold mb-2">Fixed:</h4>
                  <ul className="space-y-1 text-sm ml-4">
                    <li>• Announcement dialog close button now works properly</li>
                    <li>• Dialog moved outside clickable area to prevent conflicts</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-2">Database Cleanup:</h4>
                  <ul className="space-y-1 text-sm ml-4">
                    <li>• Removed all rooms from database (75 rooms)</li>
                    <li>• Removed all hallways from database (1 hallway)</li>
                    <li>• Clean slate for fresh data</li>
                    <li>• Added cleanup script for future use</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Version 2.9.4 Updates */}
            <div className="bg-green-50 p-6 rounded-xl border-2 border-green-200">
              <h3 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
                <Zap className="h-6 w-6" />
                Version 2.9.4 - Recent Updates
              </h3>
              <div className="space-y-3 text-green-800">
                <div>
                  <h4 className="font-bold mb-2">Fixed:</h4>
                  <ul className="space-y-1 text-sm ml-4">
                    <li>• PC sidebar collapse button now properly positioned at right edge</li>
                    <li>• Mobile menu button fully functional</li>
                    <li>• Announcement banner no longer overlaps with header</li>
                    <li>• Removed duplicate announcement banners</li>
                    <li>• Single orange announcement banner on mobile and desktop</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-2">Enhanced:</h4>
                  <ul className="space-y-1 text-sm ml-4">
                    <li>• Advanced A* pathfinding algorithm with distance-based routing</li>
                    <li>• Smart route calculation through hallways, stairways, and elevators</li>
                    <li>• Accurate time estimates based on path complexity</li>
                    <li>• Distance calculation using map positions</li>
                    <li>• Better error messages with helpful suggestions</li>
                    <li>• Beautiful route preview with visual indicators</li>
                    <li>• Step-by-step directions with icons</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Version 2.9.0-2.9.3 Updates */}
            <div className="bg-orange-50 p-6 rounded-xl border-2 border-orange-200">
              <h3 className="text-xl font-bold text-orange-900 mb-4 flex items-center gap-2">
                <Zap className="h-6 w-6" />
                Version 2.9.0-2.9.3 - Earlier Updates
              </h3>
              <div className="space-y-3 text-orange-800">
                <div>
                  <h4 className="font-bold mb-2">Rebranding:</h4>
                  <ul className="space-y-1 text-sm ml-4">
                    <li>• Rebranded from OWL Apps to StudiOWL</li>
                    <li>• Updated all branding throughout the application</li>
                    <li>• New orange announcement banner design</li>
                    <li>• Auto-scrolling announcements every 10 seconds</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-2">Mobile UI:</h4>
                  <ul className="space-y-1 text-sm ml-4">
                    <li>• Perfect mobile sidebar at 55vh height</li>
                    <li>• Scrollable sidebar content</li>
                    <li>• Fixed z-index hierarchy for all components</li>
                    <li>• No overlapping elements on mobile or desktop</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Major Features from 2.0.0 */}
            <div className="bg-blue-50 p-6 rounded-xl border-2 border-blue-200">
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
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
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
              <div className="bg-blue-50 dark:bg-gray-800 p-6 rounded-2xl border-2 border-blue-200 dark:border-gray-600 shadow-lg mb-6">
                <h4 className="font-black text-blue-900 dark:text-blue-300 mb-3 text-lg">📞 Need Help?</h4>
                <p className="text-blue-800 dark:text-blue-400 text-sm mb-4">
                  For support, feature requests, or bug reports:
                </p>
                <div className="space-y-2">
                  <a 
                    href="mailto:juuso.kaikula@ksyk.fi?subject=KSYK Maps Support (v2.9.5)"
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
                  Made with ❤️ by <strong className="text-blue-600 dark:text-blue-400">StudiOWL</strong> for KSYK
                </p>
                <p className="text-xs">
                  Originally released: {originalReleaseDate}
                </p>
                <p className="text-xs">
                  © 2026 StudiOWL. All rights reserved.
                </p>
              </div>
            </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t-2 border-blue-200 dark:border-gray-700">
            <Button 
              onClick={() => setShowChangelog(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-2 shadow-lg"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
