import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
// import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Create from "@/pages/Home";
import HomePage from "@/pages/HomePage";
import SimpleGalleryPage from "@/pages/SimpleGalleryPage";
import UpscalePage from "./pages/UpscalePageNew";
import CarCreationPage from "./pages/CarCreationPage";
import VideoCreationPage from "./pages/VideoCreationPage";
import EmailBuilderPage from "./pages/EmailBuilderPage";
import MockLoginPage from "./pages/MockLoginPage";
import { EditorProvider } from "@/context/EditorContext";
import Sidebar from "@/components/Sidebar";
import { useWebSocket } from "@/lib/websocket";

function Router() {
  // Set up WebSocket connection for real-time updates
  useWebSocket();

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/home" component={HomePage} />
      <Route path="/mock-login" component={MockLoginPage} />
      <Route path="/" component={() => <Redirect to="/home" />} />
      
      {/* Protected routes - temporarily redirect to home for testing */}
      <Route path="/create" component={() => <Redirect to="/home" />} />
      <Route path="/gallery" component={() => <Redirect to="/home" />} />
      <Route path="/upscale" component={() => <Redirect to="/home" />} />
      <Route path="/email-builder" component={() => <Redirect to="/home" />} />
      <Route path="/trash" component={() => <Redirect to="/home" />} />
      <Route path="/car" component={() => <Redirect to="/home" />} />
      <Route path="/video" component={() => <Redirect to="/home" />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <EditorProvider>
          <WouterRouter>
            <Router />
          </WouterRouter>
        </EditorProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
