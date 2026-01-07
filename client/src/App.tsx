import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { HelpProvider } from "@/contexts/HelpContext";
import { HelpBubble } from "@/components/HelpBubble";
import ErrorBoundary from "@/components/ErrorBoundary";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Admin from "@/pages/admin";
import AdminLogin from "@/pages/admin-login";
import Builder from "@/pages/builder";
import HSL from "@/pages/hsl";
import Features from "@/pages/features";
import EasterEgg from "@/pages/easter-egg";
import NotFound from "@/pages/not-found";
import "./lib/i18n";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/admin-ksyk-management-portal" component={Admin} />
      <Route path="/builder" component={Builder} />
      <Route path="/hsl" component={HSL} />
      <Route path="/features" component={Features} />
      <Route path="/landing" component={Landing} />
      <Route path="/secret-easter-egg" component={EasterEgg} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <HelpProvider>
            <HelpBubble>
              <Toaster />
              <Router />
            </HelpBubble>
          </HelpProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
