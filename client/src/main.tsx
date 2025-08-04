import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "@/components/ui/custom-tabs.css";
import "@/components/customStyles.css";
import { Toaster } from "@/components/ui/toaster";

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Toaster />
  </>
);
