import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import WilmaChess from "@/components/WilmaChess";

export default function ChessPage() {
  const [match, params] = useRoute('/wilma-admin/:adminId/chess');
  const [match2] = useRoute('/wilma/:userId/chess');
  const [, setLocation] = useLocation();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('wilma_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
      } catch (err) {
        console.error('Failed to parse user:', err);
        setLocation('/wilma');
      }
    } else {
      setLocation('/wilma');
    }
  }, [setLocation]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <WilmaChess 
      userId={currentUser.id} 
      userName={`${currentUser.firstName} ${currentUser.lastName}`}
    />
  );
}
