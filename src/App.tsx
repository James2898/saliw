import * as React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Library from "./pages/Library";
import Setlists from "./pages/Setlists";
import "./index.css";
import SongView from "./pages/SongView";

export default function App() {
  const [isDark, setIsDark] = React.useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDark]);
  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${isDark ? "dark" : ""}`}
    >
      <BrowserRouter>
        <Navbar
          isDark={isDark}
          setIsDark={setIsDark}
          setIsSidebarOpen={setIsSidebarOpen}
        />
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12">
          <div
            className={`main-card dark:bg-[var(--brand-card-bg)] rounded-3xl border-2 border-[var(--brand-brown)] dark:border-[var(--brand-tan)] shadow-2xl shadow-black/40 overflow-hidden`}
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/library" element={<Library />} />
              <Route path="/setlists" element={<Setlists />} />
              <Route path="/song/:id" element={<SongView />} />
              {/* <Route path="/setlist/:id" element={<SetlistView />} /> */}
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </div>
  );
}
