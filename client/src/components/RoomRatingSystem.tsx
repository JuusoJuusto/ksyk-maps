import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown,
  MessageCircle,
  TrendingUp,
  Award,
  Users,
  Calendar
} from 'lucide-react';

interface Review {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: Date;
  likes: number;
  dislikes: number;
  categories: {
    cleanliness: number;
    acoustics: number;
    lighting: number;
    equipment: number;
    accessibility: number;
  };
}

interface RoomRating {
  roomId: string;
  roomName: string;
  overallRating: number;
  totalReviews: number;
  categoryRatings: {
    cleanliness: number;
    acoustics: number;
    lighting: number;
    equipment: number;
    accessibility: number;
  };
  recentTrend: 'up' | 'down' | 'stable';
  topFeatures: string[];
  improvements: string[];
}

export function RoomRatingSystem() {
  const [selectedRoom, setSelectedRoom] = useState<string>('M12');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: '',
    categories: {
      cleanliness: 5,
      acoustics: 5,
      lighting: 5,
      equipment: 5,
      accessibility: 5
    }
  });

  const roomRatings: RoomRating[] = [
    {
      roomId: 'M12',
      roomName: 'Music Room M12',
      overallRating: 4.8,
      totalReviews: 24,
      categoryRatings: {
        cleanliness: 4.7,
        acoustics: 4.9,
        lighting: 4.6,
        equipment: 4.9,
        accessibility: 4.5
      },
      recentTrend: 'up',
      topFeatures: ['Excellent acoustics', 'High-quality instruments', 'Spacious layout'],
      improvements: ['Better lighting control', 'More power outlets']
    },
    {
      roomId: 'K15',
      roomName: 'Classroom K15',
      overallRating: 4.2,
      totalReviews: 18,
      categoryRatings: {
        cleanliness: 4.4,
        acoustics: 3.8,
        lighting: 4.5,
        equipment: 4.1,
        accessibility: 4.6
      },
      recentTrend: 'stable',
      topFeatures: ['Modern projector', 'Good lighting', 'Accessible entrance'],
      improvements: ['Sound isolation', 'More comfortable chairs']
    },
    {
      roomId: 'L20',
      roomName: 'Library Study Room L20',
      overallRating: 4.9,
      totalReviews: 31,
      categoryRatings: {
        cleanliness: 4.9,
        acoustics: 4.8,
        lighting: 5.0,
        equipment: 4.7,
        accessibility: 4.9
      },
      recentTrend: 'up',
      topFeatures: ['Perfect for studying', 'Natural lighting', 'Very quiet'],
      improvements: ['More power outlets', 'Better Wi-Fi']
    }
  ];

  const reviews: Review[] = [
    {
      id: '1',
      roomId: 'M12',
      userId: 'user1',
      userName: 'Anna M.',
      rating: 5,
      comment: 'Amazing acoustics! Perfect for our choir practice. The piano is well-maintained.',
      date: new Date('2024-03-10'),
      likes: 8,
      dislikes: 0,
      categories: {
        cleanliness: 5,
        acoustics: 5,
        lighting: 4,
        equipment: 5,
        accessibility: 4
      }
    },
    {
      id: '2',
      roomId: 'M12',
      userId: 'user2',
      userName: 'Erik J.',
      rating: 4,
      comment: 'Great room overall, but could use better lighting controls for evening sessions.',
      date: new Date('2024-03-08'),
      likes: 5,
      dislikes: 1,
      categories: {
        cleanliness: 4,
        acoustics: 5,
        lighting: 3,
        equipment: 5,
        accessibility: 4
      }
    },
    {
      id: '3',
      roomId: 'L20',
      userId: 'user3',
      userName: 'Maria K.',
      rating: 5,
      comment: 'Perfect study environment. Very quiet and comfortable. Love the natural light!',
      date: new Date('2024-03-12'),
      likes: 12,
      dislikes: 0,
      categories: {
        cleanliness: 5,
        acoustics: 5,
        lighting: 5,
        equipment: 4,
        accessibility: 5
      }
    }
  ];

  const selectedRoomData = roomRatings.find(r => r.roomId === selectedRoom);
  const roomReviews = reviews.filter(r => r.roomId === selectedRoom);

  const renderStars = (rating: number, size: 'sm' | 'lg' = 'sm') => {
    const starSize = size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const renderCategoryRating = (category: string, rating: number) => {
    const categoryIcons: Record<string, string> = {
      cleanliness: '🧹',
      acoustics: '🔊',
      lighting: '💡',
      equipment: '⚙️',
      accessibility: '♿'
    };

    return (
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
        <div className="flex items-center gap-2">
          <span>{categoryIcons[category] || '📊'}</span>
          <span className="capitalize text-sm">{category}</span>
        </div>
        <div className="flex items-center gap-2">
          {renderStars(rating)}
          <span className="text-sm font-medium">{rating.toFixed(1)}</span>
        </div>
      </div>
    );
  };

  const submitReview = () => {
    // In a real app, this would submit to the backend
    console.log('Submitting review:', newReview);
    setShowReviewForm(false);
    setNewReview({
      rating: 5,
      comment: '',
      categories: {
        cleanliness: 5,
        acoustics: 5,
        lighting: 5,
        equipment: 5,
        accessibility: 5
      }
    });
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />;
      default: return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Room Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-blue-600" />
            Room Ratings & Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {roomRatings.map((room) => (
              <Button
                key={room.roomId}
                variant={selectedRoom === room.roomId ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRoom(room.roomId)}
                className="flex items-center gap-2"
              >
                {room.roomName}
                <Badge variant="secondary">{room.overallRating}</Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Room Rating Overview */}
      {selectedRoomData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                {selectedRoomData.roomName}
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(selectedRoomData.recentTrend)}
                <span className="text-sm text-gray-600">Recent trend</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Rating */}
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {selectedRoomData.overallRating}
              </div>
              {renderStars(selectedRoomData.overallRating, 'lg')}
              <p className="text-gray-600 mt-2">
                Based on {selectedRoomData.totalReviews} reviews
              </p>
            </div>

            {/* Category Ratings */}
            <div className="space-y-3">
              <h4 className="font-semibold">Category Ratings</h4>
              {Object.entries(selectedRoomData.categoryRatings).map(([category, rating]) => (
                <div key={category}>
                  {renderCategoryRating(category, rating)}
                </div>
              ))}
            </div>

            {/* Top Features & Improvements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-green-600 mb-2">Top Features</h4>
                <div className="space-y-1">
                  {selectedRoomData.topFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <ThumbsUp className="w-3 h-3 text-green-600" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-orange-600 mb-2">Suggested Improvements</h4>
                <div className="space-y-1">
                  {selectedRoomData.improvements.map((improvement, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-3 h-3 text-orange-600" />
                      {improvement}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              Reviews ({roomReviews.length})
            </div>
            <Button onClick={() => setShowReviewForm(true)}>
              Write Review
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {roomReviews.map((review) => (
            <div key={review.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <span className="font-medium">{review.userName}</span>
                    <div className="flex items-center gap-2">
                      {renderStars(review.rating)}
                      <span className="text-sm text-gray-600">
                        {review.date.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-700 mb-3">{review.comment}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex gap-4 text-sm">
                  <button className="flex items-center gap-1 text-green-600 hover:bg-green-50 px-2 py-1 rounded">
                    <ThumbsUp className="w-3 h-3" />
                    {review.likes}
                  </button>
                  <button className="flex items-center gap-1 text-red-600 hover:bg-red-50 px-2 py-1 rounded">
                    <ThumbsDown className="w-3 h-3" />
                    {review.dislikes}
                  </button>
                </div>
                <Badge variant="secondary">Verified User</Badge>
              </div>
            </div>
          ))}

          {roomReviews.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No reviews yet. Be the first to review this room!
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Form Modal */}
      {showReviewForm && (
        <Card className="fixed inset-0 z-50 m-4 max-h-[90vh] overflow-y-auto">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Write a Review for {selectedRoomData?.roomName}</span>
              <Button variant="ghost" onClick={() => setShowReviewForm(false)}>
                ✕
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Overall Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setNewReview({...newReview, rating: star})}
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= newReview.rating 
                          ? 'text-yellow-400 fill-yellow-400' 
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Category Ratings</Label>
              {Object.entries(newReview.categories).map(([category, rating]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="capitalize">{category}</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setNewReview({
                          ...newReview,
                          categories: { ...newReview.categories, [category]: star }
                        })}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            star <= rating 
                              ? 'text-yellow-400 fill-yellow-400' 
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Comment</Label>
              <Textarea
                placeholder="Share your experience with this room..."
                value={newReview.comment}
                onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                rows={4}
              />
            </div>

            <Button onClick={submitReview} className="w-full">
              Submit Review
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}