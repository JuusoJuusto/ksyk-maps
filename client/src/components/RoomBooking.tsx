/**
 * AALTO SPACE - Room Booking Component
 * Allows users to search, filter, and book available rooms
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Filter,
  X,
  Check,
  AlertCircle,
  Wifi,
  Monitor,
  Tv,
  Zap,
  ChevronRight,
  Star,
  History,
} from "lucide-react";

interface Room {
  id: string;
  roomNumber: string;
  name: string;
  floor: number;
  capacity: number;
  isBookable: boolean;
  amenities: string[];
  currentStatus: string;
  nextAvailableAt: string | null;
  buildingId: string;
  photos: string[];
}

interface Booking {
  id: string;
  roomId: string;
  startTime: string;
  endTime: string;
  purpose: string;
  attendees: number;
  status: string;
  room?: Room;
}

const AMENITY_ICONS: Record<string, any> = {
  wifi: Wifi,
  projector: Monitor,
  tv: Tv,
  whiteboard: Monitor,
  outlets: Zap,
  computers: Monitor,
};

const QUICK_DURATIONS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "4 hours", minutes: 240 },
];

const BOOKING_PURPOSES = [
  { value: "study", label: "Study", labelFi: "Opiskelu" },
  { value: "meeting", label: "Meeting", labelFi: "Kokous" },
  { value: "group_work", label: "Group Work", labelFi: "Ryhmätyö" },
  { value: "lecture", label: "Lecture", labelFi: "Luento" },
  { value: "exam", label: "Exam", labelFi: "Tentti" },
];

export default function RoomBooking() {
  const { t, i18n } = useTranslation();
  const { darkMode } = useDarkMode();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<"search" | "my-bookings" | "favorites">("search");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTime, setSelectedTime] = useState(
    new Date().toTimeString().slice(0, 5)
  );
  const [duration, setDuration] = useState(60);
  const [minCapacity, setMinCapacity] = useState(1);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingPurpose, setBookingPurpose] = useState("study");
  const [attendees, setAttendees] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch available rooms
  const { data: availableRooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["available-rooms", selectedDate, selectedTime, duration, minCapacity, selectedAmenities],
    queryFn: async () => {
      const params = new URLSearchParams({
        date: selectedDate,
        time: selectedTime,
        duration: duration.toString(),
        minCapacity: minCapacity.toString(),
        amenities: selectedAmenities.join(","),
      });
      const response = await fetch(`/api/rooms/available?${params}`);
      if (!response.ok) throw new Error("Failed to fetch available rooms");
      return response.json();
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  // Fetch user's bookings
  const { data: myBookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: async () => {
      const response = await fetch("/api/bookings/my");
      if (!response.ok) throw new Error("Failed to fetch bookings");
      return response.json();
    },
    enabled: activeTab === "my-bookings",
  });

  // Fetch favorites
  const { data: favorites = [], isLoading: favoritesLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const response = await fetch("/api/favorites");
      if (!response.ok) throw new Error("Failed to fetch favorites");
      return response.json();
    },
    enabled: activeTab === "favorites",
  });

  // Book room mutation
  const bookRoomMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const response = await fetch("/api/rooms/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to book room");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["available-rooms"] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      setSelectedRoom(null);
      toast({ title: "Room booked", description: "Your booking is confirmed." });
    },
    onError: (error: Error) => {
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
    },
  });

  // Cancel booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to cancel booking");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      toast({ title: "Booking cancelled" });
    },
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const response = await fetch("/api/favorites/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, type: "room" }),
      });
      if (!response.ok) throw new Error("Failed to toggle favorite");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  const handleBookRoom = () => {
    if (!selectedRoom) return;

    const startDateTime = new Date(`${selectedDate}T${selectedTime}`);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    bookRoomMutation.mutate({
      roomId: selectedRoom.id,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      purpose: bookingPurpose,
      attendees,
    });
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "free":
        return "bg-green-500";
      case "occupied":
        return "bg-red-500";
      case "reserved":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "free":
        return i18n.language === "fi" ? "Vapaa" : "Free";
      case "occupied":
        return i18n.language === "fi" ? "Varattu" : "Occupied";
      case "reserved":
        return i18n.language === "fi" ? "Varattu pian" : "Reserved Soon";
      default:
        return i18n.language === "fi" ? "Tuntematon" : "Unknown";
    }
  };

  return (
    <div className={`h-full flex flex-col ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* Header Tabs */}
      <div className={`border-b ${darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}>
        <div className="flex space-x-1 p-2">
          <Button
            variant={activeTab === "search" ? "default" : "ghost"}
            onClick={() => setActiveTab("search")}
            className="flex-1"
          >
            <Calendar className="h-4 w-4 mr-2" />
            {i18n.language === "fi" ? "Hae" : "Search"}
          </Button>
          <Button
            variant={activeTab === "my-bookings" ? "default" : "ghost"}
            onClick={() => setActiveTab("my-bookings")}
            className="flex-1"
          >
            <History className="h-4 w-4 mr-2" />
            {i18n.language === "fi" ? "Varaukset" : "My Bookings"}
          </Button>
          <Button
            variant={activeTab === "favorites" ? "default" : "ghost"}
            onClick={() => setActiveTab("favorites")}
            className="flex-1"
          >
            <Star className="h-4 w-4 mr-2" />
            {i18n.language === "fi" ? "Suosikit" : "Favorites"}
          </Button>
        </div>
      </div>

      {/* Search Tab */}
      {activeTab === "search" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Date & Time Selection */}
          <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                {i18n.language === "fi" ? "Päivä ja aika" : "Date & Time"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {i18n.language === "fi" ? "Päivämäärä" : "Date"}
                </label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className={darkMode ? "bg-gray-700 border-gray-600" : ""}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {i18n.language === "fi" ? "Aloitusaika" : "Start Time"}
                </label>
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className={darkMode ? "bg-gray-700 border-gray-600" : ""}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {i18n.language === "fi" ? "Kesto" : "Duration"}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_DURATIONS.map((d) => (
                    <Button
                      key={d.minutes}
                      variant={duration === d.minutes ? "default" : "outline"}
                      onClick={() => setDuration(d.minutes)}
                      className="text-xs"
                    >
                      {d.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  {i18n.language === "fi" ? "Suodattimet" : "Filters"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {showFilters ? <X className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            {showFilters && (
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    <Users className="h-4 w-4 inline mr-1" />
                    {i18n.language === "fi" ? "Vähimmäiskapasiteetti" : "Min Capacity"}
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={minCapacity}
                    onChange={(e) => setMinCapacity(parseInt(e.target.value) || 1)}
                    className={darkMode ? "bg-gray-700 border-gray-600" : ""}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {i18n.language === "fi" ? "Varusteet" : "Amenities"}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["wifi", "projector", "whiteboard", "tv", "computers", "outlets"].map((amenity) => {
                      const Icon = AMENITY_ICONS[amenity] || Monitor;
                      return (
                        <Button
                          key={amenity}
                          variant={selectedAmenities.includes(amenity) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleAmenity(amenity)}
                          className="text-xs"
                        >
                          <Icon className="h-3 w-3 mr-1" />
                          {amenity}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Available Rooms */}
          <div>
            <h3 className={`text-lg font-bold mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}>
              {i18n.language === "fi" ? "Saatavilla olevat tilat" : "Available Rooms"} ({availableRooms.length})
            </h3>
            {roomsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : availableRooms.length === 0 ? (
              <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
                <CardContent className="py-8 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
                    {i18n.language === "fi"
                      ? "Ei vapaita tiloja valitulle ajalle"
                      : "No rooms available for selected time"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {availableRooms.map((room: Room) => (
                  <Card
                    key={room.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      darkMode ? "bg-gray-800 border-gray-700 hover:border-blue-500" : "hover:border-blue-300"
                    }`}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className={`font-bold text-lg ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
                            {room.roomNumber}
                          </h4>
                          <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{room.name}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(room.currentStatus)}`}></div>
                          <span className="text-xs font-medium">{getStatusLabel(room.currentStatus)}</span>
                        </div>
                      </div>
                      <div className={`flex items-center space-x-4 text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                        <span className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          Floor {room.floor}
                        </span>
                        <span className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {room.capacity}
                        </span>
                      </div>
                      {room.amenities && room.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {room.amenities.slice(0, 4).map((amenity, idx) => {
                            const Icon = AMENITY_ICONS[amenity.toLowerCase()] || Monitor;
                            return (
                              <span
                                key={idx}
                                className={`px-2 py-1 text-xs rounded flex items-center ${
                                  darkMode ? "bg-gray-700 text-gray-300" : "bg-blue-50 text-blue-700"
                                }`}
                              >
                                <Icon className="h-3 w-3 mr-1" />
                                {amenity}
                              </span>
                            );
                          })}
                          {room.amenities.length > 4 && (
                            <span className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700">
                              +{room.amenities.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* My Bookings Tab */}
      {activeTab === "my-bookings" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {bookingsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : myBookings.length === 0 ? (
            <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
              <CardContent className="py-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
                  {i18n.language === "fi" ? "Ei varauksia" : "No bookings yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            myBookings.map((booking: Booking) => (
              <Card key={booking.id} className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className={`font-bold ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
                        {booking.room?.roomNumber || "Room"}
                      </h4>
                      <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        {booking.room?.name}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded font-medium ${
                        booking.status === "confirmed"
                          ? "bg-green-100 text-green-700"
                          : booking.status === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                  <div className={`text-sm space-y-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(booking.startTime).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      {new Date(booking.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                      {new Date(booking.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      {booking.attendees} {i18n.language === "fi" ? "henkilöä" : "people"}
                    </div>
                  </div>
                  {booking.status === "confirmed" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => cancelBookingMutation.mutate(booking.id)}
                      className="w-full mt-3"
                    >
                      {i18n.language === "fi" ? "Peruuta varaus" : "Cancel Booking"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Favorites Tab */}
      {activeTab === "favorites" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {favoritesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : favorites.length === 0 ? (
            <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
              <CardContent className="py-8 text-center">
                <Star className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
                  {i18n.language === "fi" ? "Ei suosikkeja" : "No favorites yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            favorites.map((fav: any) => (
              <Card key={fav.id} className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className={`font-bold ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
                        {fav.room?.roomNumber}
                      </h4>
                      <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{fav.room?.name}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavoriteMutation.mutate(fav.roomId)}
                    >
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Booking Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className={`max-w-md w-full ${darkMode ? "bg-gray-800 border-gray-700" : ""}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className={darkMode ? "text-blue-400" : "text-blue-600"}>
                    {selectedRoom.roomNumber}
                  </CardTitle>
                  <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{selectedRoom.name}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedRoom(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {i18n.language === "fi" ? "Tarkoitus" : "Purpose"}
                </label>
                <select
                  value={bookingPurpose}
                  onChange={(e) => setBookingPurpose(e.target.value)}
                  className={`w-full p-2 border rounded ${
                    darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                  }`}
                >
                  {BOOKING_PURPOSES.map((purpose) => (
                    <option key={purpose.value} value={purpose.value}>
                      {i18n.language === "fi" ? purpose.labelFi : purpose.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {i18n.language === "fi" ? "Osallistujat" : "Attendees"}
                </label>
                <Input
                  type="number"
                  min="1"
                  max={selectedRoom.capacity}
                  value={attendees}
                  onChange={(e) => setAttendees(parseInt(e.target.value) || 1)}
                  className={darkMode ? "bg-gray-700 border-gray-600" : ""}
                />
              </div>
              <div className={`p-3 rounded ${darkMode ? "bg-gray-700" : "bg-blue-50"}`}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
                    {i18n.language === "fi" ? "Päivämäärä" : "Date"}
                  </span>
                  <span className="font-medium">{selectedDate}</span>
                </div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
                    {i18n.language === "fi" ? "Aika" : "Time"}
                  </span>
                  <span className="font-medium">
                    {selectedTime} ({duration} min)
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
                    {i18n.language === "fi" ? "Tila" : "Room"}
                  </span>
                  <span className="font-medium">{selectedRoom.roomNumber}</span>
                </div>
              </div>
              <Button
                onClick={handleBookRoom}
                disabled={bookRoomMutation.isPending}
                className="w-full"
              >
                {bookRoomMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {i18n.language === "fi" ? "Varataan..." : "Booking..."}
                  </div>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {i18n.language === "fi" ? "Vahvista varaus" : "Confirm Booking"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
