import {
  Menu,
  Music,
  Sun,
  Moon,
  LayoutDashboard,
  Library,
  ListMusic,
} from "lucide-react";
// import NavItem from "./NavItem";
import { Link } from "react-router-dom";

type Props = {
  isDark: boolean;
  setIsDark: (_: boolean) => void;
  setIsSidebarOpen: (_: boolean) => void;
};

const Navbar = ({ isDark, setIsDark, setIsSidebarOpen }: Props) => {
  const navItemClass =
    "flex items-center space-x-1 px-2 py-2 rounded-full font-bold text-sm transition-all text-[var(--brand-brown)] dark:text-[var(--brand-tan)] hover:bg-[var(--brand-tan-alpha)]";
  return (
    <nav className="sticky top-0 z-50 no-print border-b-2 border-[var(--brand-tan-alpha)] bg-white dark:bg-[var(--brand-background)] dark:border-[var(--brand-brown)] shadow-sm px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex justify-between items-center h-10">
        <div className="flex items-center space-x-6">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2 text-[var(--brand-brown)] dark:text-[var(--brand-tan)]"
          >
            <Menu size={24} />
          </button>
          <div
            onClick={() => {}}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-9 h-9 bg-[var(--brand-brown)] rounded-lg flex items-center justify-center shadow-lg shadow-brand-brown/20 group-hover:scale-105 transition-transform text-[var(--brand-cream)] ">
              <Music size={20} />
            </div>
            <span className="text-xl font-black tracking-tighter">Saliw</span>
          </div>
          <div className="hidden md:flex space-x-1">
            <Link className={navItemClass} to="/">
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </Link>
            <Link className={navItemClass} to="/library">
              <Library size={16} />
              <span>Library</span>
            </Link>
            <Link className={navItemClass} to="/setlists">
              <ListMusic size={16} />
              <span>Setlists</span>
            </Link>
            {/* <NavItem
              active={view === "dashboard"}
              onClick={goToDashboard}
              label="Dashboard"
              icon={LayoutDashboard}
            />
            <NavItem
              active={view === "setlists"}
              onClick={goToSetlists}
              label="Setlists"
              icon={ListMusic}
            />
            <NavItem
              active={view === "library"}
              onClick={goToLibrary}
              label="Library"
              icon={Library}
            /> */}
          </div>
        </div>
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2.5 rounded-xl hover:bg-[var(--brand-tan-alpha)] text-[var(--brand-brown)] dark:text-[var(--brand-tan)] transition-all"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
