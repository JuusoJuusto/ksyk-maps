/**
 * ADMIN AALTO SPACE MAP - Preserves bottom-tab campus map for admins
 * Accessible at /admin-ksyk-management-portal/aalto-space-map
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
    <div className={`aalto-app h-screen flex flex-col ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <Header />

      <div className="flex-1 overflow-hidden relative pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {activeTab === "map" && (
          <div className="h-full relative">
            <div className="absolute top-4 right-4 z-30 flex gap-2">
              <Button
                onClick={() => setMapMode("2d")}
                variant={mapMode === "2d" ? "default" : "outline"}
                size="sm"
                className={`shadow-lg ${mapMode === "2d" ? "bg-black text-white hover:bg-gray-900" : ""}`}
              >
                <MapIcon className="h-4 w-4 mr-2" />
                2D Map
              </Button>
              <Button
                onClick={() => setMapMode("3d")}
                variant={mapMode === "3d" ? "default" : "outline"}
                size="sm"
                className={`shadow-lg ${mapMode === "3d" ? "bg-black text-white hover:bg-gray-900" : ""}`}
              >
                <Box className="h-4 w-4 mr-2" />
                3D View
              </Button>
            </div>

            {mapMode === "2d" ? <AaltoMapView /> : <Working3DBuilder />}
          </div>
        )}

        {activeTab === "search" && (
          <div className={`h-full overflow-y-auto ${darkMode ? "bg-gray-900" : "bg-gray-50"} p-4`}>
            <div className="max-w-4xl mx-auto space-y-4">
              <h2 className={`text-2xl font-bold mb-6 ${darkMode ? "text-white" : "text-gray-900"}`}>
                {t("search.title") || "Search Campus"}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: MapPin, label: t("search.rooms") || "Rooms" },
                  { icon: Coffee, label: t("services.cafes") || "Cafés" },
                  { icon: Dumbbell, label: t("services.gyms") || "Gyms" },
                  { icon: BookOpen, label: t("services.libraries") || "Libraries" },
                ].map(({ icon: Icon, label }) => (
                  <Card
                    key={label}
                    className={`cursor-pointer hover:shadow-lg transition-shadow ${
                      darkMode ? "bg-gray-800 border-gray-700" : "bg-white"
                    }`}
                  >
                    <CardContent className="p-4 text-center">
                      <Icon className={`h-8 w-8 mx-auto mb-2 ${darkMode ? "text-white" : "text-black"}`} />
                      <p className={`text-sm font-semibold ${darkMode ? "text-gray-200" : "text-gray-900"}`}>
                        {label}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "book" && (
          <div className={`h-full overflow-y-auto ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
            <RoomBooking />
          </div>
        )}

        {activeTab === "services" && (
          <div className={`h-full overflow-y-auto ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
            <CampusServicesAalto />
          </div>
        )}

        {activeTab === "profile" && (
          <div className={`h-full overflow-y-auto ${darkMode ? "bg-gray-900" : "bg-gray-50"} p-4`}>
            <div className="max-w-4xl mx-auto space-y-4">
              <h2 className={`text-2xl font-bold mb-6 ${darkMode ? "text-white" : "text-gray-900"}`}>
                {t("profile.title") || "Profile"}
              </h2>
              <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center ${darkMode ? "bg-white text-black" : "bg-black text-white"}`}>
                      <User className="h-10 w-10" />
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                        Admin User
                      </h3>
                      <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                        admin@ksykmaps.fi
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Heart className="h-5 w-5 mr-3" />
                      {t("profile.favorites") || "Favorites"}
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Clock className="h-5 w-5 mr-3" />
                      {t("profile.history") || "History"}
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-5 w-5 mr-3" />
                      {t("profile.bookings") || "My Bookings"}
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Bell className="h-5 w-5 mr-3" />
                      {t("profile.notifications") || "Notifications"}
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="h-5 w-5 mr-3" />
                      {t("profile.settings") || "Settings"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <AaltoBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
