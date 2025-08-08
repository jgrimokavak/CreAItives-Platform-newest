import { createRoot } from "react-dom/client";

function App() {
  return (
    <div style={{padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh'}}>
      <h1 style={{color: '#333'}}>CreAItives Platform</h1>
      <p>Application loaded successfully. Ready to implement Presets feature.</p>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
