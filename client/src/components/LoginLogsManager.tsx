import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, CheckCircle, XCircle, Clock, User, Mail, Monitor } from 'lucide-react';

interface LoginLog {
  id: string;
  userId: string | null;
  email: string;
  userName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  loginStatus: 'success' | 'failed';
  failureReason: string | null;
  sessionId: string | null;
  createdAt: any;
}

export default function LoginLogsManager() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['admin-login-logs'],
    queryFn: async () => {
      const response = await fetch('/api/admin-login-logs?limit=100', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch login logs');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const successCount = logs.filter((log: LoginLog) => log.loginStatus === 'success').length;
  const failedCount = logs.filter((log: LoginLog) => log.loginStatus === 'failed').length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading login logs...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Attempts</p>
                <p className="text-3xl font-bold">{logs.length}</p>
              </div>
              <Shield className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Successful</p>
                <p className="text-3xl font-bold text-green-600">{successCount}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                <p className="text-3xl font-bold text-red-600">{failedCount}</p>
              </div>
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Login Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Login Activity</CardTitle>
          <CardDescription>
            Track all admin login attempts and security events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {logs.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Login Logs Yet</h3>
                  <p className="text-gray-500">Login activity will appear here</p>
                </div>
              ) : (
                logs.map((log: LoginLog) => (
                  <div
                    key={log.id}
                    className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                      log.loginStatus === 'success'
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {log.loginStatus === 'success' ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                          <XCircle className="h-6 w-6 text-red-600" />
                        )}
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-900">
                              {log.userName || 'Unknown User'}
                            </span>
                            <Badge
                              variant={log.loginStatus === 'success' ? 'default' : 'destructive'}
                            >
                              {log.loginStatus}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Mail className="h-3 w-3 text-gray-500" />
                            <span className="text-sm text-gray-600">{log.email}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>{formatDate(log.createdAt)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {log.ipAddress && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Monitor className="h-4 w-4" />
                          <span>IP: {log.ipAddress}</span>
                        </div>
                      )}
                      {log.sessionId && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <User className="h-4 w-4" />
                          <span className="truncate">Session: {log.sessionId.substring(0, 16)}...</span>
                        </div>
                      )}
                    </div>

                    {log.failureReason && (
                      <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-800">
                        <strong>Failure Reason:</strong> {log.failureReason}
                      </div>
                    )}

                    {log.userAgent && (
                      <div className="mt-2 text-xs text-gray-500 truncate">
                        {log.userAgent}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
