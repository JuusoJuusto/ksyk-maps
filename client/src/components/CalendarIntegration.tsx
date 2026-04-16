import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Download, Link as LinkIcon, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CalendarIntegrationProps {
  userId: string;
  userRole: string;
}

export default function CalendarIntegration({ userId, userRole }: CalendarIntegrationProps) {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const generateICalFeed = () => {
    const baseUrl = window.location.origin;
    const feedUrl = `${baseUrl}/api/wilma/calendar/${userId}/ical`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(feedUrl);
    
    toast({
      title: "📋 Calendar Feed URL Copied!",
      description: "Paste this URL into your calendar app to sync your schedule.",
    });
  };

  const downloadICalFile = async () => {
    try {
      const response = await fetch(`/api/wilma/calendar/${userId}/download`);
      if (!response.ok) throw new Error("Failed to download calendar");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wilma-schedule-${userId}.ics`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "✅ Calendar Downloaded!",
        description: "Import the .ics file into your calendar app.",
      });
    } catch (error) {
      toast({
        title: "❌ Download Failed",
        description: "Could not download calendar file.",
        variant: "destructive",
      });
    }
  };

  const syncWithGoogle = () => {
    const baseUrl = window.location.origin;
    const feedUrl = `${baseUrl}/api/wilma/calendar/${userId}/ical`;
    const googleCalUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`;
    window.open(googleCalUrl, '_blank');
    
    toast({
      title: "🔗 Opening Google Calendar",
      description: "Follow the prompts to add your Wilma schedule.",
    });
  };

  const getAppleCalendarInstructions = () => {
    const baseUrl = window.location.origin;
    const feedUrl = `${baseUrl}/api/wilma/calendar/${userId}/ical`;
    
    const instructions = `
Apple Calendar Integration:

1. Open Calendar app on your iPhone/iPad/Mac
2. Go to Settings → Accounts → Add Account
3. Select "Other" → "Add Subscribed Calendar"
4. Paste this URL:
   ${feedUrl}
5. Tap "Subscribe"

Your Wilma schedule will now sync automatically!
    `.trim();
    
    navigator.clipboard.writeText(feedUrl);
    
    alert(instructions);
    
    toast({
      title: "📱 Apple Calendar Instructions",
      description: "Feed URL copied! Follow the instructions shown.",
    });
  };

  const getOutlookInstructions = () => {
    const baseUrl = window.location.origin;
    const feedUrl = `${baseUrl}/api/wilma/calendar/${userId}/ical`;
    
    const instructions = `
Outlook Calendar Integration:

1. Open Outlook Calendar
2. Click "Add Calendar" → "Subscribe from web"
3. Paste this URL:
   ${feedUrl}
4. Name it "Wilma Schedule"
5. Click "Import"

Your schedule will sync automatically!
    `.trim();
    
    navigator.clipboard.writeText(feedUrl);
    
    alert(instructions);
    
    toast({
      title: "📧 Outlook Instructions",
      description: "Feed URL copied! Follow the instructions shown.",
    });
  };

  return (
    <Card className="border-2 border-purple-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-600" />
          Calendar Integration
        </CardTitle>
        <CardDescription>
          Sync your Wilma schedule with your favorite calendar app
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Google Calendar */}
          <div className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Google Calendar</h3>
                <p className="text-sm text-gray-600">Sync with Google Calendar</p>
              </div>
            </div>
            <Button onClick={syncWithGoogle} className="bg-blue-600 hover:bg-blue-700">
              <LinkIcon className="w-4 h-4 mr-2" />
              Connect
            </Button>
          </div>

          {/* Apple Calendar */}
          <div className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Apple Calendar</h3>
                <p className="text-sm text-gray-600">Sync with iPhone/iPad/Mac</p>
              </div>
            </div>
            <Button onClick={getAppleCalendarInstructions} variant="outline">
              <LinkIcon className="w-4 h-4 mr-2" />
              Instructions
            </Button>
          </div>

          {/* Outlook Calendar */}
          <div className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-200 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Outlook Calendar</h3>
                <p className="text-sm text-gray-600">Sync with Microsoft Outlook</p>
              </div>
            </div>
            <Button onClick={getOutlookInstructions} variant="outline">
              <LinkIcon className="w-4 h-4 mr-2" />
              Instructions
            </Button>
          </div>

          {/* Manual Options */}
          <div className="border-t-2 border-gray-200 pt-4 mt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Manual Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button onClick={generateICalFeed} variant="outline" className="w-full">
                <LinkIcon className="w-4 h-4 mr-2" />
                Copy Calendar Feed URL
              </Button>
              <Button onClick={downloadICalFile} variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download .ics File
              </Button>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              How it works
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Your schedule syncs automatically</li>
              <li>• Updates appear in real-time</li>
              <li>• Works on all your devices</li>
              <li>• No manual updates needed</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
