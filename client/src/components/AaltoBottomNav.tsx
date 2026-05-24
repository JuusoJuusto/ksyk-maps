/**
 * AALTO SPACE - Bottom Navigation Component
 * Mobile-first navigation bar matching Aalto Space design
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/contexts/DarkModeContext";
import {
  MapPin,
  Search,
  Calendar,
  List,
  User,
} from "lucide-react";

interface AaltoBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const NAV_ITEMS = [
  { id: "map", icon: MapPin, label: "Map", labelFi: "Kartta" },
  { id: "search", icon: Search, label: "Search", labelFi: "Haku" },
  { id: "book", icon: Calendar, label: "Book", labelFi: "Varaa" },
  { id: "services", icon: List, label: "Services", labelFi: "Palvelut" },
  { id: "profile", icon: User, label: "Profile", labelFi: "Profiili" },
];

export default function AaltoBottomNav({ activeTab, onTabChange }: AaltoBottomNavProps) {
  const { i18n } = useTranslation();
  const { darkMode } = useDarkMode();

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 flex border-t ${
        darkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
      }`}
      aria-label="Campus navigation"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const label = i18n.language === "fi" ? item.labelFi : item.label;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
                isActive
                  ? darkMode
                    ? "text-white"
                    : "text-black"
                  : darkMode
                  ? "text-gray-400 hover:text-gray-300"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="relative">
                <Icon
                  className={`h-6 w-6 transition-transform ${
                    isActive ? "scale-110" : "scale-100"
                  }`}
                />
                {isActive && (
                  <div
                    className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full ${
                      darkMode ? "bg-white" : "bg-black"
                    }`}
                  />
                )}
              </div>
              <span
                className={`text-xs mt-1 font-medium ${
                  isActive ? "font-semibold" : ""
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
