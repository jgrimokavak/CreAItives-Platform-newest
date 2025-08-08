import { createRoot } from "react-dom/client";

function Test() {
  return <div>Hello React</div>;
}

createRoot(document.getElementById("root")!).render(<Test />);