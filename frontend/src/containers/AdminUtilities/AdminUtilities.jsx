import { Outlet, useNavigate, useLocation } from "react-router-dom"; // Import useLocation to get current route

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faFolder,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";

const AdminUtilities = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Get the current route

  // Menu items with routes
  const menuItems = [
    {
      name: "File Hosting",
      icon: faFolder,
      route: "/dashboard/admin/file-hosting",
      onClick: () => navigate("/dashboard/admin/file-hosting"),
    },
    {
      name: "Manage Client",
      icon: faUsers,
      route: "/dashboard/admin/manage-client",
      onClick: () => navigate("/dashboard/admin/manage-client"),
    },
    {
      name: "Admin",
      icon: faEnvelope,
      route: "/dashboard/admin/calldashboard",
      onClick: () => navigate("/dashboard/admin/calldashboard"),
    },
  ];

  return (
    <div className="flex">
      {/* Sidebar */}
      <aside className="w-16 md:w-64 bg-white text-gray-800 rounded-r-3xl py-7 shadow-xl fixed h-full transition-all duration-300">
        <nav className="px-2 md:px-4">
          <ul className="flex flex-col gap-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.route; // Check if the current route matches the menu item's route

              return (
                <li key={item.name}>
                  <button
                    onClick={item.onClick}
                    className={`flex flex-col md:flex-row items-center justify-center md:justify-start w-full p-3 rounded-xl transition-all duration-300
                      ${
                        isActive
                          ? "bg-indigo-100 text-indigo-600"
                          : "text-gray-600 hover:bg-gray-100 hover:text-indigo-600"
                      }`}
                    aria-label={`Go to ${item.name
                      .replace(/([A-Z])/g, " $1")
                      .trim()}`}
                  >
                    <FontAwesomeIcon
                      icon={item.icon}
                      className={`w-6 h-6 md:mr-3 ${
                        isActive ? "text-indigo-600" : "text-gray-400"
                      }`}
                    />

                    <span className="hidden md:inline text-sm font-medium mt-2 md:mt-0">
                      {item.name.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-16 md:ml-64 overflow-y-auto">
        <Outlet />{" "}
        {/* This will render the content based on the current route */}
      </main>
    </div>
  );
};

export default AdminUtilities;
