import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Create from "@/pages/Home";
import LandingPage from "@/pages/LandingPage";
import AccessDeniedPage from "@/pages/AccessDeniedPage";
import AuthenticatedHomePage from "@/pages/AuthenticatedHomePage";
import SimpleGalleryPage from "@/pages/SimpleGalleryPage";
import UpscalePage from "./pages/UpscalePageNew";
import CarCreationPage from "./pages/CarCreationPage";
import VideoCreationPage from "./pages/VideoCreationPage";
import EmailBuilderPage from "./pages/EmailBuilderPage";
import { EditorProvider } from "@/context/EditorContext";
import Sidebar from "@/components/Sidebar";
import { useWebSocket } from "@/lib/websocket";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Set up WebSocket connection for real-time updates
  useWebSocket();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/access-denied" component={AccessDeniedPage} />
          <Route path="/" component={LandingPage} />
        </>
      ) : (
        <Sidebar>
          <Route path="/" component={AuthenticatedHomePage} />
          <Route path="/home" component={AuthenticatedHomePage} />
          <Route path="/create" component={Create} />
          <Route path="/gallery" component={() => <SimpleGalleryPage mode="gallery" />} />
          <Route path="/upscale" component={UpscalePage} />
          <Route path="/email-builder" component={EmailBuilderPage} />
          <Route path="/trash" component={() => <SimpleGalleryPage mode="trash" />} />
          <Route path="/car" component={CarCreationPage} />
          <Route path="/video" component={VideoCreationPage} />
        </Sidebar>
      )}
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
