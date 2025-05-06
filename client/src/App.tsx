import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import SimpleGalleryPage from "@/pages/SimpleGalleryPage";
import UpscalePage from "./pages/UpscalePageNew";
import CarCreationPage from "./pages/CarCreationPage";
import { EditorProvider } from "@/context/EditorContext";
import Sidebar from "@/components/Sidebar";
import { useWebSocket } from "@/lib/websocket";

function Router() {
  // Set up WebSocket connection for real-time updates
  useWebSocket();

  return (
    <Sidebar>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/gallery" component={() => <SimpleGalleryPage mode="gallery" />} />
        <Route path="/trash" component={() => <SimpleGalleryPage mode="trash" />} />
        <Route path="/upscale" component={UpscalePage} />
        <Route path="/car" component={CarCreationPage} />
        <Route component={NotFound} />
      </Switch>
    </Sidebar>
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
