import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Create from "@/pages/Home";
import HomePage from "@/pages/HomePage";
import SimpleGalleryPage from "@/pages/SimpleGalleryPage";
import UpscalePage from "./pages/UpscalePageNew";
import CarCreationPage from "./pages/CarCreationPage";
import VideoPage from "./pages/VideoPage";
import EmailBuilderPage from "./pages/EmailBuilderPage";
import EnhancedUserManagementPage from "./pages/EnhancedUserManagementPage";
import AdminOverviewPage from "./pages/AdminOverviewPage";
import PageSettingsPage from "./pages/PageSettingsPage";
import StorageManagementPage from "./pages/StorageManagementPage";
import AdminRoute from "./components/AdminRoute";
import { EditorProvider } from "@/context/EditorContext";
import Sidebar from "@/components/Sidebar";
import { useWebSocket } from "@/lib/websocket";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Set up WebSocket connection for real-time updates
  useWebSocket();

  // If still loading authentication, don't render anything to prevent unwanted redirects
  if (isLoading) {
    return null; // or a loading spinner if you prefer
  }

  return (
    <Switch>
      {/* Public route - always accessible */}
      <Route path="/home" component={HomePage} />
      
      {/* Protected routes */}
      {!isAuthenticated ? (
        // If not authenticated, redirect all protected routes to home
        <>
          <Route path="/" component={() => <Redirect to="/home" />} />
          <Route path="/create" component={() => <Redirect to="/home" />} />
          <Route path="/gallery" component={() => <Redirect to="/home" />} />
          <Route path="/upscale" component={() => <Redirect to="/home" />} />
          <Route path="/email-builder" component={() => <Redirect to="/home" />} />
          <Route path="/trash" component={() => <Redirect to="/home" />} />
          <Route path="/car" component={() => <Redirect to="/home" />} />
          <Route path="/video" component={() => <Redirect to="/home" />} />
          <Route path="/admin/overview" component={() => <Redirect to="/home" />} />
          <Route path="/admin/users" component={() => <Redirect to="/home" />} />
          <Route path="/admin/page-settings" component={() => <Redirect to="/home" />} />
          <Route path="/admin/storage" component={() => <Redirect to="/home" />} />
        </>
      ) : (
        // If authenticated, show protected routes within sidebar layout
        <>
          <Route path="/" component={() => (
            <Sidebar>
              <Create />
            </Sidebar>
          )} />
          <Route path="/create" component={() => (
            <Sidebar>
              <Create />
            </Sidebar>
          )} />
          <Route path="/gallery" component={() => (
            <Sidebar>
              <SimpleGalleryPage />
            </Sidebar>
          )} />
          <Route path="/upscale" component={() => (
            <Sidebar>
              <UpscalePage />
            </Sidebar>
          )} />
          <Route path="/email-builder" component={() => (
            <Sidebar>
              <EmailBuilderPage />
            </Sidebar>
          )} />
          <Route path="/trash" component={() => (
            <Sidebar>
              <SimpleGalleryPage mode='trash' />
            </Sidebar>
          )} />
          <Route path="/car" component={() => (
            <Sidebar>
              <CarCreationPage />
            </Sidebar>
          )} />
          <Route path="/video" component={() => (
            <Sidebar>
              <VideoPage />
            </Sidebar>
          )} />

          {/* Admin routes - redirect non-admins to main page */}
          <Route path="/admin/overview" component={() => (
            <Sidebar>
              <AdminRoute>
                <AdminOverviewPage />
              </AdminRoute>
            </Sidebar>
          )} />
          <Route path="/admin/users" component={() => (
            <Sidebar>
              <AdminRoute>
                <EnhancedUserManagementPage />
              </AdminRoute>
            </Sidebar>
          )} />
          <Route path="/admin/page-settings" component={() => (
            <Sidebar>
              <AdminRoute>
                <PageSettingsPage />
              </AdminRoute>
            </Sidebar>
          )} />
          <Route path="/admin/storage" component={() => (
            <Sidebar>
              <AdminRoute>
                <StorageManagementPage />
              </AdminRoute>
            </Sidebar>
          )} />
        </>
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
