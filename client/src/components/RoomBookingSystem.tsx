import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin,
  CheckCircle,
  AlertCircle,
  Star,
  Wifi,
  Monitor,
  Coffee,
  Volume2,
  Car
} from 'lucide-react';

interface Booking {
  id: string;
  roomId: string;
  roomName: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  attendees: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  amenities: string[];
}

interface RoomDetails {
  id: string;
  name: string;
  capacity: number;
  floor: number;
  building: string;
  amenities: string[];
  rating: number;
  reviews: number;
  available: boolean;
  temperature: number;
  lighting: string;
  occupancy: number;
}

export function RoomBookingSystem() {
  const [selectedRoom, setSelectedRoom] = useState<RoomDetails | null>(null);
  const [bookingForm, setBookingForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    purpose: '',
    attendees: 1
  });
  const [bookings, setBookings] = useState<Booking[]>([
    {
      id: '1',
      roomId: 'M12',
      roomName: 'Music Room M12',
      date: '2024-03-15',
      startTime: '14:00',
      endTime: '16:00',
      purpose: 'Band Practice',
      attendees: 8,
      status: 'confirmed',
      amenities: ['Audio System', 'Piano']
    },
    {
      id: '2',
      roomId: 'K15',
      roomName: 'Classroom K15',
      date: '2024-03-15',
      startTime: '10:00',
      endTime: '12:00',
      purpose: 'Team Meeting',
      attendees: 15,
      status: 'pending',
      amenities: ['Projector', 'Whiteboard']
    }
  ]);

  const rooms: RoomDetails[] = [
    {
      id: 'M12',
      name: 'Music Room M12',
      capacity: 30,
      floor: 1,
      building: 'M',
      amenities: ['Piano', 'Audio System', 'Microphones', 'Recording Equipment'],
      rating: 4.8,
      reviews: 24,
      available: true,
      temperature: 22,
      lighting: 'Natural + LED',
      occupancy: 5
    },
    {
      id: 'K15',
      name: 'Classroom K15',
      capacity: 25,
      floor: 1,
      building: 'K',
      amenities: ['Projector', 'Whiteboard', 'WiFi', 'Air Conditioning'],
      rating: 4.6,
      reviews: 18,
      available: false,
      temperature: 21,
      lighting: 'LED',
      occupancy: 23
    },
    {
      id: 'L20',
      name: 'Library Study Room L20',
      capacity: 12,
      floor: 2,
      building: 'L',
      amenities: ['Quiet Zone', 'WiFi', 'Power Outlets', 'Books'],
      rating: 4.9,
      reviews: 31,
      available: true,
      temperature: 20,
      lighting: 'Natural',
      occupancy: 3
    }
  ];

  const getAmenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case 'wifi': return <Wifi className="w-4 h-4" />;
      case 'projector': case 'monitor': return <Monitor className="w-4 h-4" />;
      case 'coffee': return <Coffee className="w-4 h-4" />;
      case 'audio system': case 'microphones': return <Volume2 className="w-4 h-4" />;
      case 'parking': return <Car className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleBookRoom = () => {
    if (!selectedRoom || !bookingForm.date || !bookingForm.startTime || !bookingForm.endTime) {
      return;
    }

    const newBooking: Booking = {
      id: Date.now().toString(),
      roomId: selectedRoom.id,
      roomName: selectedRoom.name,
      date: bookingForm.date,
      startTime: bookingForm.startTime,
      endTime: bookingForm.endTime,
      purpose: bookingForm.purpose,
      attendees: bookingForm.attendees,
      status: 'pending',
      amenities: selectedRoom.amenities
    };

    setBookings([...bookings, newBooking]);
    setBookingForm({ date: '', startTime: '', endTime: '', purpose: '', attendees: 1 });
  };

  return (
    <div className="space-y-6">
      {/* Room Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Available Rooms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  selectedRoom?.id === room.id ? 'border-blue-500 bg-blue-50' : ''
                } ${!room.available ? 'opacity-60' : ''}`}
                onClick={() => room.available && setSelectedRoom(room)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold">{room.name}</h4>
                    <p className="text-sm text-gray-600">Floor {room.floor}, Building {room.building}</p>
                  </div>
                  <Badge className={room.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {room.available ? 'Available' : 'Occupied'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>{room.occupancy}/{room.capacity}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span>{room.rating} ({room.reviews})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>🌡️ {room.temperature}°C</span>
                    <span>💡 {room.lighting}</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {room.amenities.slice(0, 3).map((amenity, index) => (
                      <div key={index} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs">
                        {getAmenityIcon(amenity)}
                        <span>{amenity}</span>
                      </div>
                    ))}
                    {room.amenities.length > 3 && (
                      <Badge variant="secondary" className="text-xs">+{room.amenities.length - 3}</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Booking Form */}
      {selectedRoom && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Book {selectedRoom.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={bookingForm.date}
                  onChange={(e) => setBookingForm({...bookingForm, date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={bookingForm.startTime}
                  onChange={(e) => setBookingForm({...bookingForm, startTime: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={bookingForm.endTime}
                  onChange={(e) => setBookingForm({...bookingForm, endTime: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Attendees</Label>
                <Select value={bookingForm.attendees.toString()} onValueChange={(value) => setBookingForm({...bookingForm, attendees: parseInt(value)})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({length: selectedRoom.capacity}, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1} people</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Purpose</Label>
                <Input
                  placeholder="Meeting, Study Session, etc."
                  value={bookingForm.purpose}
                  onChange={(e) => setBookingForm({...bookingForm, purpose: e.target.value})}
                />
              </div>
            </div>

            <Button 
              onClick={handleBookRoom}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!bookingForm.date || !bookingForm.startTime || !bookingForm.endTime}
            >
              Book Room
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Current Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            My Bookings ({bookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{booking.roomName}</h4>
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>📅 {booking.date}</span>
                    <span>🕐 {booking.startTime} - {booking.endTime}</span>
                    <span>👥 {booking.attendees} people</span>
                  </div>
                  <p className="text-sm text-gray-600">{booking.purpose}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Edit</Button>
                  <Button variant="outline" size="sm" className="text-red-600">Cancel</Button>
                </div>
              </div>
            ))}
            {bookings.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No bookings yet. Select a room above to make your first booking!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}