import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, CheckCircle, XCircle, Clock, User, Mail, Monitor, Activity, AlertTriangle, Info } from 'lucide-react';

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
  type: 'login';
}

interface AppLog {
  id: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: string;
  userId?: string | null;
  userName?: string | null;
  action?: string;
  createdAt: any;
  type: 'app';
}

type LogEntry = LoginLog | AppLog;

export default function AppLogsManager() {
  const [activeTab, setActiveTab] = useState('all');

  const { data: loginLogs = [], isLoading: loginLogsLoading } = useQuery({
    queryKey: ['admin-login-logs'],
    queryFn: async () => {
      const response = await fetch('/api/admin-login-logs?limit=100', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch login logs');
      const data = await response.json();
      return data.map((log: any) => ({ ...log, type: 'login' as const }));
    },
    refetchInterval: 30000,
  });

  // Fetch app logs from API
  const { data: appLogs = [], isLoading: appLogsLoading } = useQuery({
    queryKey: ['app-logs'],
    queryFn: async () => {
      const response = await fetch('/api/logs', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch app logs');
      const data = await response.json();
      return data.map((log: any) => ({
        id: log.id,
        level: log.level as 'info' | 'warning' | 'error' | 'success',
        message: log.message,
        details: log.source,
        action: log.source.toUpperCase(),
        createdAt: log.timestamp,
        type: 'app' as const
      }));
    },
    refetchInterval: 30000,
  });

  const allLogs: LogEntry[] = [...loginLogs, ...appLogs].sort((a, b) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
    return dateB.getTime() - dateA.getTime();
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

  const loginSuccessCount = loginLogs.filter((log: LoginLog) => log.loginStatus === 'success').length;
  const loginFailedCount = loginLogs.filter((log: LoginLog) => log.loginStatus === 'failed').length;
  const appInfoCount = appLogs.filter(log => log.level === 'info' || log.level === 'success').length;
  const appWarningCount = appLogs.filter(log => log.level === 'warning' || log.level === 'error').length;

  const isLoading = loginLogsLoading || appLogsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading logs...</p>
        </CardContent>
      </Card>
    );
  }

  const renderLoginLog = (log: LoginLog) => (
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
              <Badge variant={log.loginStatus === 'success' ? 'default' : 'destructive'}>
                {log.loginStatus}
              </Badge>
              <Badge variant="outline">LOGIN</Badge>
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
  );

  const renderAppLog = (log: AppLog) => {
    const levelConfig = {
      info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
      success: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
      warning: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
      error: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    };

    const config = levelConfig[log.level];
    const Icon = config.icon;

    return (
      <div
        key={log.id}
        className={`border rounded-lg p-4 transition-all hover:shadow-md ${config.border} ${config.bg}`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-3">
            <Icon className={`h-6 w-6 ${config.color}`} />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-gray-900">{log.message}</span>
                <Badge variant="outline">{log.level.toUpperCase()}</Badge>
                {log.action && <Badge variant="secondary">{log.action}</Badge>}
              </div>
              {log.userName && (
                <div className="flex items-center space-x-2 mt-1">
                  <User className="h-3 w-3 text-gray-500" />
                  <span className="text-sm text-gray-600">{log.userName}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>{formatDate(log.createdAt)}</span>
          </div>
        </div>

        {log.details && (
          <div className="mt-2 text-sm text-gray-700 pl-9">
            {log.details}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Logs</p>
                <p className="text-3xl font-bold">{allLogs.length}</p>
              </div>
              <Activity className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Login Success</p>
                <p className="text-3xl font-bold text-green-600">{loginSuccessCount}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Login Failed</p>
                <p className="text-3xl font-bold text-red-600">{loginFailedCount}</p>
              </div>
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">App Events</p>
                <p className="text-3xl font-bold text-blue-600">{appLogs.length}</p>
              </div>
              <Info className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Application Logs</CardTitle>
          <CardDescription>
            Track all system activity, logins, and events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All Logs ({allLogs.length})</TabsTrigger>
              <TabsTrigger value="logins">Logins ({loginLogs.length})</TabsTrigger>
              <TabsTrigger value="app">App Events ({appLogs.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {allLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <Activity className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No Logs Yet</h3>
                      <p className="text-gray-500">Activity will appear here</p>
                    </div>
                  ) : (
                    allLogs.map((log) => 
                      log.type === 'login' ? renderLoginLog(log as LoginLog) : renderAppLog(log as AppLog)
                    )
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="logins" className="mt-4">
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {loginLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <Shield className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No Login Logs Yet</h3>
                      <p className="text-gray-500">Login activity will appear here</p>
                    </div>
                  ) : (
                    loginLogs.map((log: LoginLog) => renderLoginLog(log))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="app" className="mt-4">
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {appLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <Info className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No App Logs Yet</h3>
                      <p className="text-gray-500">Application events will appear here</p>
                    </div>
                  ) : (
                    appLogs.map((log: AppLog) => renderAppLog(log))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
