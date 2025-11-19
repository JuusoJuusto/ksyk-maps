import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wifi, 
  WifiOff, 
  Users, 
  Activity,
  Zap,
  RefreshCw
} from 'lucide-react';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: Date;
}

export function WebSocketStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [activeUsers, setActiveUsers] = useState(0);
  const [messagesReceived, setMessagesReceived] = useState(0);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const connectWebSocket = () => {
    try {
      // Use the same port as the main application
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      
      const newWs = new WebSocket(wsUrl);
      
      newWs.onopen = () => {
        setIsConnected(true);
        setConnectionAttempts(0);
        console.log('WebSocket connected');
      };

      newWs.onmessage = (event) => {
        try {
          const message: WebSocketMessage = {
            type: 'message',
            data: JSON.parse(event.data),
            timestamp: new Date()
          };
          setLastMessage(message);
          setMessagesReceived(prev => prev + 1);
          
          // Handle different message types
          if (message.data.type === 'user_count') {
            setActiveUsers(message.data.count);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      newWs.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
        
        // Auto-reconnect after 3 seconds
        setTimeout(() => {
          if (connectionAttempts < 5) {
            setConnectionAttempts(prev => prev + 1);
            connectWebSocket();
          }
        }, 3000);
      };

      newWs.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      setWs(newWs);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  };

  const disconnectWebSocket = () => {
    if (ws) {
      ws.close();
      setWs(null);
    }
  };

  const sendTestMessage = () => {
    if (ws && isConnected) {
      const testMessage = {
        type: 'test',
        data: { message: 'Hello from KSYK Map!', timestamp: new Date() }
      };
      ws.send(JSON.stringify(testMessage));
    }
  };

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      if (isConnected) {
        // Simulate receiving messages
        const mockMessages = [
          { type: 'user_activity', data: { action: 'navigation_started', room: 'M12' } },
          { type: 'room_update', data: { room: 'K15', capacity: '28/30' } },
          { type: 'system_alert', data: { message: 'Peak usage detected in L-wing' } }
        ];
        
        if (Math.random() > 0.7) {
          const randomMessage = mockMessages[Math.floor(Math.random() * mockMessages.length)];
          setLastMessage({
            type: randomMessage.type,
            data: randomMessage.data,
            timestamp: new Date()
          });
          setMessagesReceived(prev => prev + 1);
        }
        
        // Simulate user count changes
        if (Math.random() > 0.8) {
          setActiveUsers(prev => Math.max(1, prev + (Math.random() > 0.5 ? 1 : -1)));
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected]);

  useEffect(() => {
    connectWebSocket();
    
    return () => {
      disconnectWebSocket();
    };
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Real-time Connection
          </div>
          <Badge 
            className={isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
          >
            {isConnected ? (
              <>
                <Wifi className="w-3 h-3 mr-1" />
                Connected
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 mr-1" />
                Disconnected
              </>
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className={`p-3 rounded-lg border ${isConnected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {isConnected ? 'Real-time updates active' : 'Connection lost'}
            </span>
            {!isConnected && connectionAttempts > 0 && (
              <span className="text-xs text-gray-500">
                Retry {connectionAttempts}/5
              </span>
            )}
          </div>
          {!isConnected && (
            <p className="text-xs text-gray-600 mt-1">
              Attempting to reconnect automatically...
            </p>
          )}
        </div>

        {/* Real-time Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-lg text-blue-600">{activeUsers}</span>
            </div>
            <p className="text-xs text-gray-600">Active Users</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-lg text-green-600">{messagesReceived}</span>
            </div>
            <p className="text-xs text-gray-600">Messages</p>
          </div>
        </div>

        {/* Last Message */}
        {lastMessage && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Latest Activity</h4>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start mb-1">
                <Badge variant="secondary" className="text-xs">
                  {lastMessage.type}
                </Badge>
                <span className="text-xs text-gray-500">
                  {formatTime(lastMessage.timestamp)}
                </span>
              </div>
              <p className="text-sm">
                {typeof lastMessage.data === 'string' 
                  ? lastMessage.data 
                  : JSON.stringify(lastMessage.data, null, 2)
                }
              </p>
            </div>
          </div>
        )}

        {/* Connection Controls */}
        <div className="flex gap-2">
          <Button
            onClick={isConnected ? disconnectWebSocket : connectWebSocket}
            variant={isConnected ? "outline" : "default"}
            size="sm"
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {isConnected ? 'Disconnect' : 'Reconnect'}
          </Button>
          <Button
            onClick={sendTestMessage}
            disabled={!isConnected}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Zap className="w-4 h-4 mr-2" />
            Test
          </Button>
        </div>

        {/* Real-time Features */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Real-time Features</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`p-2 rounded text-center ${isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              Live User Count
            </div>
            <div className={`p-2 rounded text-center ${isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              Room Updates
            </div>
            <div className={`p-2 rounded text-center ${isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              Navigation Sync
            </div>
            <div className={`p-2 rounded text-center ${isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              System Alerts
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}