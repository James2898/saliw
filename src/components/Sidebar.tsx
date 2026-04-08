import { LayoutDashboard, Library, ListMusic, Music, X } from "lucide-react";
import { Link } from "react-router-dom";
type Props = {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (_: boolean) => void;
};

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }: Props) => {
  return (
    <div
      className={`fixed inset-0 z-[60] no-print transition-all duration-300 md:hidden ${isSidebarOpen ? "visible" : "invisible opacity-0"}`}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsSidebarOpen(false)}
      />
      <aside
        className={`absolute left-0 top-0 h-full w-4/5 max-w-xs bg-[var(--brand-cream)] dark:bg-[var(--brand-background)] p-6 transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[var(--brand-brown)] rounded-lg flex items-center justify-center">
              <Music className="text-[var(--brand-cream)]" size={16} />
            </div>
            <span className="font-bold text-lg">Saliw</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-[var(--brand-tan)]"
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex flex-col space-y-5 text-lg">
          <Link to="/" className="flex items-center justify-start gap-3">
            <LayoutDashboard size={24} className="text-[var(--brand-tan)]" />
            Dashboard
          </Link>
          <Link to="/library" className="flex items-center justify-start gap-3">
            <Library size={24} className="text-[var(--brand-tan)]" />
            Library
          </Link>
          <Link
            to="/setlists"
            className="flex items-center justify-start gap-3"
          >
            <ListMusic size={24} className="text-[var(--brand-tan)]" />
            Setlists
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
      </aside>
    </div>
  );
};

export default Sidebar;
