import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "@/components/ui/custom-tabs.css";
import "@/components/customStyles.css";
import { Toaster } from "@/components/ui/toaster";

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Toaster />
  </>
);
