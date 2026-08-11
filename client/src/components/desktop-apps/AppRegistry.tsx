/**
 * Desktop App Component Registry
 * Dynamically loads app components based on componentName
 */

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load all desktop app components
const ZoomApp = lazy(() => import('./ZoomApp'));
const GitHubApp = lazy(() => import('./GitHubApp'));
const SlackApp = lazy(() => import('./SlackApp'));
const TeamsApp = lazy(() => import('./TeamsApp'));
const OneDriveApp = lazy(() => import('./OneDriveApp'));
const GoogleDriveApp = lazy(() => import('./GoogleDriveApp'));
const GoogleMeetApp = lazy(() => import('./GoogleMeetApp'));
const DropboxApp = lazy(() => import('./DropboxApp'));
const NotionApp = lazy(() => import('./NotionApp'));
const TrelloApp = lazy(() => import('./TrelloApp'));
const FigmaApp = lazy(() => import('./FigmaApp'));
const CanvaApp = lazy(() => import('./CanvaApp'));
const CourseraApp = lazy(() => import('./CourseraApp'));
const UdemyApp = lazy(() => import('./UdemyApp'));
const KhanAcademyApp = lazy(() => import('./KhanAcademyApp'));
const QuizletApp = lazy(() => import('./QuizletApp'));

// Calculator and other existing apps
const CalculatorApp = lazy(() => import('./CalculatorApp'));
const NotepadApp = lazy(() => import('./NotepadApp'));
const ClockApp = lazy(() => import('./ClockApp'));
const CalendarApp = lazy(() => import('./CalendarApp'));
const ExcelApp = lazy(() => import('./ExcelApp'));
const WordApp = lazy(() => import('./WordApp'));
const PowerPointApp = lazy(() => import('./PowerPointApp'));
const OutlookApp = lazy(() => import('./OutlookApp'));
const SpotifyApp = lazy(() => import('./SpotifyApp'));
const YouTubeApp = lazy(() => import('./YouTubeApp'));
const DiscordApp = lazy(() => import('./DiscordApp'));
const VSCodeApp = lazy(() => import('./VSCodeApp'));
const MessengerApp = lazy(() => import('./MessengerApp'));
const DuolingoApp = lazy(() => import('./DuolingoApp'));

// App registry mapping componentName to actual component
const APP_REGISTRY: Record<string, React.ComponentType<{ onClose: () => void }>> = {
  'ZoomApp': ZoomApp,
  'GitHubApp': GitHubApp,
  'SlackApp': SlackApp,
  'TeamsApp': TeamsApp,
  'OneDriveApp': OneDriveApp,
  'GoogleDriveApp': GoogleDriveApp,
  'GoogleMeetApp': GoogleMeetApp,
  'DropboxApp': DropboxApp,
  'NotionApp': NotionApp,
  'TrelloApp': TrelloApp,
  'FigmaApp': FigmaApp,
  'CanvaApp': CanvaApp,
  'CourseraApp': CourseraApp,
  'UdemyApp': UdemyApp,
  'KhanAcademyApp': KhanAcademyApp,
  'QuizletApp': QuizletApp,
  
  // Existing apps
  'CalculatorApp': CalculatorApp,
  'NotepadApp': NotepadApp,
  'ClockApp': ClockApp,
  'CalendarApp': CalendarApp,
  'ExcelApp': ExcelApp,
  'WordApp': WordApp,
  'PowerPointApp': PowerPointApp,
  'OutlookApp': OutlookApp,
  'SpotifyApp': SpotifyApp,
  'YouTubeApp': YouTubeApp,
  'DiscordApp': DiscordApp,
  'VSCodeApp': VSCodeApp,
  'MessengerApp': MessengerApp,
  'DuolingoApp': DuolingoApp,
};

interface AppRendererProps {
  componentName: string;
  onClose: () => void;
}

/**
 * Renders a desktop app component by name with lazy loading
 */
export function AppRenderer({ componentName, onClose }: AppRendererProps) {
  const AppComponent = APP_REGISTRY[componentName];

  if (!AppComponent) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div>
          <p className="text-gray-600 font-medium mb-2">Sovellusta ei löytynyt</p>
          <p className="text-sm text-gray-500">Komponentti: {componentName}</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Ladataan sovellusta...</p>
          </div>
        </div>
      }
    >
      <AppComponent onClose={onClose} />
    </Suspense>
  );
}

/**
 * Check if a component exists in the registry
 */
export function hasAppComponent(componentName: string): boolean {
  return componentName in APP_REGISTRY;
}

/**
 * Get all registered app component names
 */
export function getRegisteredApps(): string[] {
  return Object.keys(APP_REGISTRY);
}

export default APP_REGISTRY;
