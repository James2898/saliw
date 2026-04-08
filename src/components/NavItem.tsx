import type { LucideIcon } from "lucide-react";

type Props = {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: LucideIcon;
  setIsSidebarOpen: (_: boolean) => void;
};

const NavItem = ({
  active,
  onClick,
  label,
  icon: Icon,
  setIsSidebarOpen,
}: Props) => (
  <button
    onClick={() => {
      onClick();
      setIsSidebarOpen(false);
    }}
    className={`flex items-center space-x-2 px-5 py-2 rounded-full font-bold text-sm transition-all ${
      active
        ? "bg-[var(--brand-brown)] text-[var(--brand-cream)] shadow-lg shadow-brand-brown/30 dark:bg-[var(--brand-tan)] dark:text-[var(--brand-darker)] dark:shadow-brand-tan/20"
        : "text-[var(--brand-brown)] dark:text-[var(--brand-tan)] hover:bg-[var(--brand-tan-alpha)]"
    }`}
  >
    <Icon size={16} />
    <span>{label}</span>
  </button>
);

export default NavItem;
