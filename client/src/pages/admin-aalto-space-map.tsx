/**
 * ADMIN AALTO SPACE MAP - Full version with bottom navigation
 * Accessible only from admin panel at /admin-ksyk-management-portal/aalto-space-map
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/contexts/DarkModeContext";
import Header from "@/components/Header";
import AaltoMapView from "@/components/AaltoMapView";
import AaltoBottomNav from "@/components/AaltoBottomNav";
import RoomBooking from "@/components/RoomBooking";
import CampusServicesAalto from "@/components/CampusServicesAalto";
import Working3DBuilder from "@/components/Working3DBuilder";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Heart, 
  Clock, 
  Bell, 
  Settings,
  MapPin,
  Calendar,
  Coffee,
  Dumbbell,
  BookOpen,
  Box,
  Map as MapIcon,
} from "lucide-react";

export default function AdminAaltoSpaceMap() {
  const { t } = useTranslation();
  const { darkMode } = useDarkMode();
  const [activeTab, setActiveTab] = useState("map");
  const [mapMode, setMapMode] = useState<"2d" | "3d">("2d");

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header />
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Map Tab */}
        {activeTab === "map" && (
          <div className="h-full relative">
            {/* Map Mode Toggle - Floating Button */}
            <div className="absolute top-4 right-4 z-30 flex gap-2">
              <Button
                onClick={() => setMapMode("2d")}
                variant={mapMode === "2d" ? "default" : "outline"}
                size="sm"
                className={`shadow-lg ${mapMode === "2d" ? 'bg-blue-600 text-white' : ''}`}
              >
                <MapIcon className="h-4 w-4 mr-2" />
                2D Map
              </Button>
              <Button
                onClick={() => setMapMode("3d")}
                variant={mapMode === "3d" ? "default" : "outline"}
                size="sm"
                className={`shadow-lg ${mapMode === "3d" ? 'bg-blue-600 text-white' : ''}`}
              >
                <Box className="h-4 w-4 mr-2" />
                3D View
              </Button>
            </div>

            {/* Render 2D or 3D Map */}
            {mapMode === "2d" ? (
              <AaltoMapView />
            ) : (
              <Working3DBuilder />
            )}
          </div>
        )}

        {/* Search Tab */}
        {activeTab === "search" && (
          <div className={`h-full overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} p-4`}>
            <div className="max-w-4xl mx-auto space-y-4">
              <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {t('search.title') || 'Search Campus'}
              </h2>
              
              {/* Quick Access Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
                  <CardContent className="p-4 text-center">
                    <MapPin className={`h-8 w-8 mx-auto mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <p className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {t('search.rooms') || 'Rooms'}
                    </p>
                  </CardContent>
                </Card>

                <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
                  <CardContent className="p-4 text-center">
                    <Coffee className={`h-8 w-8 mx-auto mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <p className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {t('services.cafes') || 'Cafés'}
                    </p>
                  </CardContent>
                </Card>

                <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
                  <CardContent className="p-4 text-center">
                    <Dumbbell className={`h-8 w-8 mx-auto mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <p className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {t('services.gyms') || 'Gyms'}
                    </p>
                  </CardContent>
                </Card>

                <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
                  <CardContent className="p-4 text-center">
                    <BookOpen className={`h-8 w-8 mx-auto mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <p className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {t('services.libraries') || 'Libraries'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Book Tab */}
        {activeTab === "book" && (
          <div className={`h-full overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <RoomBooking />
          </div>
        )}

        {/* Services Tab */}
        {activeTab === "services" && (
          <div className={`h-full overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <CampusServicesAalto />
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className={`h-full overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} p-4`}>
            <div className="max-w-4xl mx-auto space-y-4">
              <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {t('profile.title') || 'Profile'}
              </h2>

              {/* Profile Card */}
              <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center ${darkMode ? 'bg-blue-600' : 'bg-blue-500'}`}>
                      <User className="h-10 w-10 text-white" />
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Admin User
                      </h3>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        admin@ksykmaps.fi
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Heart className="h-5 w-5 mr-3" />
                      {t('profile.favorites') || 'Favorites'}
                    </Button>

                    <Button variant="outline" className="w-full justify-start">
                      <Clock className="h-5 w-5 mr-3" />
                      {t('profile.history') || 'History'}
                    </Button>

                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-5 w-5 mr-3" />
                      {t('profile.bookings') || 'My Bookings'}
                    </Button>

                    <Button variant="outline" className="w-full justify-start">
                      <Bell className="h-5 w-5 mr-3" />
                      {t('profile.notifications') || 'Notifications'}
                    </Button>

                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="h-5 w-5 mr-3" />
                      {t('profile.settings') || 'Settings'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation (Mobile-First) */}
      <AaltoBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
