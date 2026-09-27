import EnhancedNavbar from "./EnhancedNavbar";
// Font Awesome Icons

import {
  faCode,
  faPlug,
  faLifeRing,
  faFileAlt,
} from "@fortawesome/free-solid-svg-icons";

const MENU_ITEMS = [
  { name: "API", icon: faCode, path: "/dashboard/api" },
  { name: "Support", icon: faLifeRing, path: "/dashboard/support" },
  {
    name: "Transaction Logs",
    icon: faFileAlt,
    path: "/dashboard/transaction-logs",
  },
];

const DROPDOWN_ITEMS = [
  {
    name: "API Documentation",
    icon: faCode,
    path: "/dashboard/api-docs",
  },
  {
    name: "Integration Guide",
    icon: faPlug,
    path: "/dashboard/integration-guide",
  },
];

const DashboardNavbar = ({ user, setUser }) => {
  return (
    <EnhancedNavbar
      user={user}
      setUser={setUser}
      menuItems={MENU_ITEMS}
      // dropdownItems={WHATSAPP_DROPDOWN_ITEMS}
      moduleName="WhatsApp"
    />
  );
};

export default DashboardNavbar;
