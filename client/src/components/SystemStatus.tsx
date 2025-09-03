import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Database,
  Zap,
  Wifi,
  Server,
  HardDrive,
  RefreshCw
} from 'lucide-react';
import { healthMonitor, type SystemHealth } from '@/utils/healthCheck';

export function SystemStatus() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    // Initial health check
    performHealthCheck();

    // Subscribe to health changes
    const unsubscribe = healthMonitor.onHealthChange((newHealth) => {
      setHealth(newHealth);
      setLastCheck(new Date());
    });

    // Start monitoring
    healthMonitor.startMonitoring(30000); // Check every 30 seconds

    return () => {
      unsubscribe();
      healthMonitor.stopMonitoring();
    };
  }, []);

  const performHealthCheck = async () => {
    setIsLoading(true);
    try {
      const result = await healthMonitor.performFullHealthCheck();
      setHealth(result);
      setLastCheck(new Date());
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const healthChecks = health ? [
    { name: 'API Endpoints', status: health.api, icon: Server },
    { name: 'Database', status: health.database, icon: Database },
    { name: 'Features', status: health.features, icon: Zap },
    { name: 'Performance', status: health.performance, icon: Activity },
    { name: 'Memory', status: health.memory, icon: HardDrive },
    { name: 'Network', status: health.network, icon: Wifi }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              System Status
            </CardTitle>
            <div className="flex items-center gap-2">
              {health && (
                <Badge className={getStatusColor(health.overall)}>
                  {getStatusIcon(health.overall)}
                  <span className="ml-1 capitalize">{health.overall}</span>
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={performHealthCheck}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Checking...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {lastCheck && (
            <p className="text-sm text-gray-600 mb-4">
              Last checked: {lastCheck.toLocaleTimeString()}
            </p>
          )}
          
          {!health ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Running system diagnostics...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {healthChecks.map((check, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <check.icon className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-sm">{check.name}</span>
                    </div>
                    {getStatusIcon(check.status.status)}
                  </div>
                  
                  <p className="text-xs text-gray-600 mb-2">{check.status.message}</p>
                  
                  {check.status.details && (
                    <div className="text-xs text-gray-500">
                      {Object.entries(check.status.details).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span>{key}:</span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      {health?.performance.details && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Compute Performance */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Compute Time</span>
                  <span className="text-sm">{health.performance.details.computeTime}ms</span>
                </div>
                <Progress 
                  value={Math.min((health.performance.details.computeTime / 100) * 100, 100)} 
                  className="h-2"
                />
              </div>

              {/* FPS */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Frame Rate</span>
                  <span className="text-sm">{health.performance.details.fps} FPS</span>
                </div>
                <Progress 
                  value={(health.performance.details.fps / 60) * 100} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Memory Usage */}
      {health?.memory.details && (
        <Card>
          <CardHeader>
            <CardTitle>Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Used Memory</span>
                  <span className="text-sm">
                    {health.memory.details.usedMB}MB / {health.memory.details.totalMB}MB
                  </span>
                </div>
                <Progress value={health.memory.details.usage} className="h-2" />
                <p className="text-xs text-gray-600">
                  {health.memory.details.usage}% of available memory used
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Network Information */}
      {health?.network.details && (
        <Card>
          <CardHeader>
            <CardTitle>Network Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="font-bold text-lg text-blue-600">
                  {health.network.details.effectiveType?.toUpperCase() || 'Unknown'}
                </div>
                <div className="text-gray-600">Connection Type</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="font-bold text-lg text-green-600">
                  {health.network.details.downlink || 'N/A'} Mbps
                </div>
                <div className="text-gray-600">Download Speed</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="font-bold text-lg text-purple-600">
                  {health.network.details.rtt || 'N/A'}ms
                </div>
                <div className="text-gray-600">Latency</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Support */}
      {health?.features.details && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Support</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Browser Compatibility</span>
                <Badge className={getStatusColor(health.features.status)}>
                  {health.features.details.percentage}% supported
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {health.features.details.supported.map((feature: string, index: number) => (
                  <div key={index} className="flex items-center gap-1 p-2 bg-green-50 rounded">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}