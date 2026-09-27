import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHistory, faCog } from "@fortawesome/free-solid-svg-icons";

import DashboardNavbar from "../../components/Navbar/DashboardNavbar.jsx";
import "./index.css";
import LoginIntefration from "./LoginIntefration.jsx";

const FileManagerContainer = () => {
  const [activeMenuItem, setActiveMenuItem] = useState("Login History");

  const handleMenuClick = (menuItem) => {
    setActiveMenuItem(menuItem);
  };

  const renderPage = () => {
    switch (activeMenuItem) {
      case "Login History":
        return <LoginIntefration />;
      case "Reseller Settings":
        return <LoginIntefration />; // Replace with ResellersSettings component when available
      default:
        return <LoginIntefration />;
    }
  };

  return (
    <div className="flex bg-white min-h-screen">
      <aside className="sidebar w-16 md:w-64 bg-white text-indigo-600 rounded-r-xl py-8 shadow-lg p-2 fixed h-full overflow-y-auto transition-all duration-300 top: 60px">
        <nav>
          <ul className="flex flex-col gap-4">
            {[
              { name: "Login History", icon: faHistory },
              { name: "Reseller Settings", icon: faCog },
            ].map((item) => (
              <li key={item.name}>
                <button
                  onClick={() => handleMenuClick(item.name)}
                  className={`flex flex-col md:flex-row items-center text-blue font-bold p-2 rounded-lg hover:bg-indigo-100 w-full transition duration-300 ${
                    activeMenuItem === item.name ? "bg-blue-100" : ""
                  }`}
                  aria-label={`Go to ${item.name
                    .replace(/([A-Z])/g, " $1")
                    .trim()}`}
                >
                  <FontAwesomeIcon
                    icon={item.icon}
                    className="w-6 h-6 md:mr-2"
                  />
                  <span className="hidden md:inline text-sm">
                    {item.name.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className="flex-1 ml-16 md:ml-64">
        <DashboardNavbar />
        {renderPage()}
      </main>
    </div>
  );
};

export default FileManagerContainer;
