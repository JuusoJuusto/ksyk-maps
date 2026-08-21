/**
 * KSYK Maps - Campus Services Component
 * Displays restaurants, cafes, gyms, libraries, and other campus services
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Coffee,
  Utensils,
  Dumbbell,
  BookOpen,
  Zap,
  Recycle,
  CreditCard,
  Printer,
  Heart,
  MapPin,
  Clock,
  Phone,
  Globe,
  Navigation,
  Search,
  Filter,
  X,
  ChevronRight,
} from "lucide-react";

interface CampusService {
  id: string;
  name: string;
  nameEn: string;
  nameFi: string;
  type: string;
  description: string;
  floor: number;
  buildingId: string;
  openingHours: any;
  currentlyOpen: boolean;
  amenities: string[];
  dietaryOptions: string[];
  paymentMethods: string[];
  phone: string;
  website: string;
  mapPositionX: number;
  mapPositionY: number;
}

const SERVICE_TYPES = [
  { value: "all", label: "All", labelFi: "Kaikki", icon: MapPin },
  { value: "restaurant", label: "Restaurants", labelFi: "Ravintolat", icon: Utensils },
  { value: "cafe", label: "Cafés", labelFi: "Kahvilat", icon: Coffee },
  { value: "gym", label: "Gyms", labelFi: "Kuntosalit", icon: Dumbbell },
  { value: "library", label: "Libraries", labelFi: "Kirjastot", icon: BookOpen },
  { value: "charging", label: "Charging", labelFi: "Lataus", icon: Zap },
  { value: "recycling", label: "Recycling", labelFi: "Kierrätys", icon: Recycle },
  { value: "atm", label: "ATMs", labelFi: "Pankkiautomaatit", icon: CreditCard },
  { value: "printer", label: "Printers", labelFi: "Tulostimet", icon: Printer },
  { value: "health", label: "Health", labelFi: "Terveys", icon: Heart },
];

const DIETARY_ICONS: Record<string, string> = {
  vegetarian: "🥗",
  vegan: "🌱",
  gluten_free: "🌾",
  halal: "☪️",
  lactose_free: "🥛",
};

export default function CampusServices() {
  const { t, i18n } = useTranslation();
  const { darkMode } = useDarkMode();
  
  const [selectedType, setSelectedType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState<CampusService | null>(null);
  const [showOpenOnly, setShowOpenOnly] = useState(false);

  // Fetch campus services
  const { data: services = [], isLoading } = useQuery({
    queryKey: ["campus-services", selectedType, showOpenOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedType !== "all") params.append("type", selectedType);
      if (showOpenOnly) params.append("openOnly", "true");
      
      const response = await fetch(`/api/services?${params}`);
      if (!response.ok) throw new Error("Failed to fetch services");
      return response.json();
    },
    staleTime: 60000, // Cache for 1 minute
  });

  // Filter services by search query
  const filteredServices = services.filter((service: CampusService) => {
    const name = i18n.language === "fi" ? service.nameFi : service.nameEn || service.name;
    const description = i18n.language === "fi" ? service.description : service.description;
    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getServiceIcon = (type: string) => {
    const serviceType = SERVICE_TYPES.find((t) => t.value === type);
    return serviceType?.icon || MapPin;
  };

  const formatOpeningHours = (hours: any) => {
    if (!hours) return i18n.language === "fi" ? "Ei tietoa" : "No info";
    
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const todayHours = hours[today];
    
    if (!todayHours) return i18n.language === "fi" ? "Suljettu" : "Closed";
    if (todayHours.closed) return i18n.language === "fi" ? "Suljettu" : "Closed";
    
    return `${todayHours.open} - ${todayHours.close}`;
  };

  const handleNavigate = (service: CampusService) => {
    // Trigger navigation to service location
    window.dispatchEvent(
      new CustomEvent("navigate-to-service", {
        detail: { serviceId: service.id, x: service.mapPositionX, y: service.mapPositionY },
      })
    );
    setSelectedService(null);
  };

  return (
    <div className={`h-full flex flex-col ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* Header */}
      <div className={`border-b ${darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"} p-4`}>
        <h2 className={`text-2xl font-bold mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}>
          {i18n.language === "fi" ? "Kampuspalvelut" : "Campus Services"}
        </h2>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder={i18n.language === "fi" ? "Etsi palveluita..." : "Search services..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`pl-10 ${darkMode ? "bg-gray-700 border-gray-600" : ""}`}
          />
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <Button
            variant={showOpenOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowOpenOnly(!showOpenOnly)}
          >
            <Clock className="h-4 w-4 mr-2" />
            {i18n.language === "fi" ? "Vain avoinna" : "Open Now"}
          </Button>
          <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            {filteredServices.length} {i18n.language === "fi" ? "palvelua" : "services"}
          </span>
        </div>
      </div>

      {/* Service Type Tabs */}
      <div className={`border-b ${darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"} overflow-x-auto`}>
        <div className="flex space-x-1 p-2 min-w-max">
          {SERVICE_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <Button
                key={type.value}
                variant={selectedType === type.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedType(type.value)}
                className="flex-shrink-0"
              >
                <Icon className="h-4 w-4 mr-2" />
                {i18n.language === "fi" ? type.labelFi : type.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Services List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredServices.length === 0 ? (
          <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
            <CardContent className="py-8 text-center">
              <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
                {i18n.language === "fi" ? "Ei palveluita löytynyt" : "No services found"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredServices.map((service: CampusService) => {
            const Icon = getServiceIcon(service.type);
            const name = i18n.language === "fi" ? service.nameFi : service.nameEn || service.name;
            const description = i18n.language === "fi" ? service.description : service.description;

            return (
              <Card
                key={service.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  darkMode ? "bg-gray-800 border-gray-700 hover:border-blue-500" : "hover:border-blue-300"
                }`}
                onClick={() => setSelectedService(service)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-2 rounded-lg ${darkMode ? "bg-gray-700" : "bg-blue-50"}`}>
                        <Icon className={`h-5 w-5 ${darkMode ? "text-blue-400" : "text-blue-600"}`} />
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>{name}</h4>
                        {description && (
                          <p className={`text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                            {description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        service.currentlyOpen
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {service.currentlyOpen
                        ? i18n.language === "fi"
                          ? "Avoinna"
                          : "Open"
                        : i18n.language === "fi"
                        ? "Suljettu"
                        : "Closed"}
                    </div>
                  </div>

                  <div className={`flex items-center space-x-4 text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatOpeningHours(service.openingHours)}
                    </span>
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {i18n.language === "fi" ? "Kerros" : "Floor"} {service.floor}
                    </span>
                  </div>

                  {/* Dietary Options (for restaurants/cafes) */}
                  {(service.type === "restaurant" || service.type === "cafe") &&
                    service.dietaryOptions &&
                    service.dietaryOptions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {service.dietaryOptions.map((option, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 text-xs rounded ${
                              darkMode ? "bg-gray-700 text-gray-300" : "bg-green-50 text-green-700"
                            }`}
                          >
                            {DIETARY_ICONS[option] || "🍽️"} {option.replace("_", " ")}
                          </span>
                        ))}
                      </div>
                    )}

                  {/* Amenities */}
                  {service.amenities && service.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {service.amenities.slice(0, 3).map((amenity, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-1 text-xs rounded ${
                            darkMode ? "bg-gray-700 text-gray-300" : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {amenity}
                        </span>
                      ))}
                      {service.amenities.length > 3 && (
                        <span className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700">
                          +{service.amenities.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Service Detail Modal */}
      {selectedService && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className={`max-w-md w-full max-h-[80vh] overflow-y-auto ${darkMode ? "bg-gray-800 border-gray-700" : ""}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${darkMode ? "bg-gray-700" : "bg-blue-50"}`}>
                    {(() => {
                      const Icon = getServiceIcon(selectedService.type);
                      return <Icon className={`h-6 w-6 ${darkMode ? "text-blue-400" : "text-blue-600"}`} />;
                    })()}
                  </div>
                  <div>
                    <CardTitle className={darkMode ? "text-white" : "text-gray-900"}>
                      {i18n.language === "fi" ? selectedService.nameFi : selectedService.nameEn || selectedService.name}
                    </CardTitle>
                    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                      {selectedService.type.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedService(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div
                className={`p-3 rounded-lg text-center ${
                  selectedService.currentlyOpen
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                <Clock className="h-5 w-5 inline mr-2" />
                <span className="font-bold">
                  {selectedService.currentlyOpen
                    ? i18n.language === "fi"
                      ? "Avoinna nyt"
                      : "Open Now"
                    : i18n.language === "fi"
                    ? "Suljettu"
                    : "Closed"}
                </span>
                <div className="text-sm mt-1">{formatOpeningHours(selectedService.openingHours)}</div>
              </div>

              {/* Description */}
              {selectedService.description && (
                <div>
                  <h4 className={`font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                    {i18n.language === "fi" ? "Kuvaus" : "Description"}
                  </h4>
                  <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                    {i18n.language === "fi" ? selectedService.description : selectedService.description}
                  </p>
                </div>
              )}

              {/* Location */}
              <div>
                <h4 className={`font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                  {i18n.language === "fi" ? "Sijainti" : "Location"}
                </h4>
                <div className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  <div className="flex items-center mb-1">
                    <MapPin className="h-4 w-4 mr-2" />
                    {i18n.language === "fi" ? "Kerros" : "Floor"} {selectedService.floor}
                  </div>
                </div>
              </div>

              {/* Dietary Options */}
              {(selectedService.type === "restaurant" || selectedService.type === "cafe") &&
                selectedService.dietaryOptions &&
                selectedService.dietaryOptions.length > 0 && (
                  <div>
                    <h4 className={`font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                      {i18n.language === "fi" ? "Ruokavalio" : "Dietary Options"}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedService.dietaryOptions.map((option, idx) => (
                        <span
                          key={idx}
                          className={`px-3 py-1 text-sm rounded ${
                            darkMode ? "bg-gray-700 text-gray-300" : "bg-green-50 text-green-700"
                          }`}
                        >
                          {DIETARY_ICONS[option] || "🍽️"} {option.replace("_", " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Payment Methods */}
              {selectedService.paymentMethods && selectedService.paymentMethods.length > 0 && (
                <div>
                  <h4 className={`font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                    {i18n.language === "fi" ? "Maksutavat" : "Payment Methods"}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedService.paymentMethods.map((method, idx) => (
                      <span
                        key={idx}
                        className={`px-3 py-1 text-sm rounded ${
                          darkMode ? "bg-gray-700 text-gray-300" : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {method.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact */}
              {(selectedService.phone || selectedService.website) && (
                <div>
                  <h4 className={`font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                    {i18n.language === "fi" ? "Yhteystiedot" : "Contact"}
                  </h4>
                  <div className="space-y-2">
                    {selectedService.phone && (
                      <a
                        href={`tel:${selectedService.phone}`}
                        className={`flex items-center text-sm ${darkMode ? "text-blue-400" : "text-blue-600"} hover:underline`}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        {selectedService.phone}
                      </a>
                    )}
                    {selectedService.website && (
                      <a
                        href={selectedService.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center text-sm ${darkMode ? "text-blue-400" : "text-blue-600"} hover:underline`}
                      >
                        <Globe className="h-4 w-4 mr-2" />
                        {i18n.language === "fi" ? "Verkkosivusto" : "Website"}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Navigate Button */}
              <Button onClick={() => handleNavigate(selectedService)} className="w-full">
                <Navigation className="h-4 w-4 mr-2" />
                {i18n.language === "fi" ? "Navigoi tänne" : "Navigate Here"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
