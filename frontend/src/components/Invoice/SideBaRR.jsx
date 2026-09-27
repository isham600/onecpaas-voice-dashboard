import { useState, useEffect } from "react";
import { getProfileMe } from "../../services/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHistory, faCalendarAlt } from "@fortawesome/free-solid-svg-icons";
import AddInvoice from "./AddInvoice";
import InvoiceList from "./InvoiceList";

const SidebarLayout = ({ user }) => {
  const [selectedMenu, setSelectedMenu] = useState("InvoiceList");

  const [permission, setPermissions] = useState(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await getProfileMe();
        const perms = response?.data?.data?.permissions || {};
        setPermissions(perms.invoice_create ?? null);
      } catch (error) {
        console.error("Error fetching permissions:", error);
      }
    };

    fetchPermissions();
  }, [user]);
  let menuItems;
  if (permission === 1) {
    menuItems = [
      { name: "InvoiceList", icon: faHistory },
      { name: "AddInvoice", icon: faCalendarAlt },
    ];
  } else {
    menuItems = [{ name: "InvoiceList", icon: faHistory }];
  }

  const renderContent = () => {
    switch (selectedMenu) {
      case "InvoiceList":
        return <InvoiceList user={user.username} />;
      case "AddInvoice":
      default:
        return (
          <AddInvoice user={user.username} setSelectedMenu={setSelectedMenu} />
        );
    }
  };

  return (
    <div className="flex">
      {/* Sidebar */}
      <aside className="w-16 md:w-64 bg-white text-gray-800 rounded-r-3xl py-7 shadow-xl fixed h-full overflow-y-auto transition-all duration-300">
        <nav className="px-2 md:px-4">
          <ul className="flex flex-col gap-2">
            {menuItems.map((item) => (
              <li key={item.name}>
                <button
                  onClick={() => setSelectedMenu(item.name)} // Set selected menu item
                  className={`flex flex-col md:flex-row items-center justify-center md:justify-start w-full p-3 rounded-xl transition-all duration-300 ${
                    selectedMenu === item.name
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
                      selectedMenu === item.name
                        ? "text-indigo-600"
                        : "text-gray-400"
                    }`}
                  />
                  <span className="hidden md:inline text-sm font-medium mt-2 md:mt-0">
                    {item.name.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-6 ml-16 md:ml-64">
        {renderContent()} {/* Render content based on selected menu */}
      </main>
    </div>
  );
};

export default SidebarLayout;
