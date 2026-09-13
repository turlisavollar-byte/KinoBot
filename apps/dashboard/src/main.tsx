import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/auth-token"; // Import auth-token to initialize token getter

createRoot(document.getElementById("root")!).render(<App />);
