import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Plus, List } from "lucide-react";
import AddInvoice from "../../components/Invoice/AddInvoice";
import EditInvoice from "../../components/Invoice/EditInvoice";
import InvoiceList from "../../components/Invoice/InvoiceList";
import DashboardNavbar from "../../components/Navbar/DashboardNavbar.jsx";
import { getProfileMe } from "../../services/api";

const Invoice = ({ user, setUser }) => {
  const [selectedMenu, setSelectedMenu] = useState("InvoiceList");
  const [editInvoiceData, setEditInvoiceData] = useState(null);
  const [permission, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await getProfileMe();
        const perms = response?.data?.data?.permissions || {};
        setPermissions(perms.invoice_create ?? null);
      } catch {
        // permission fetch failure is non-critical; invoice list still renders
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user]);

  const menuItems = [
    {
      key: "InvoiceList",
      label: "Invoice List",
      icon: <List className="w-4 h-4" />,
      show: true,
    },
    {
      key: "AddInvoice",
      label: "Add Invoice",
      icon: <Plus className="w-4 h-4" />,
      show: permission === 1,
    },
  ].filter((item) => item.show);

  const renderContent = () => {
    switch (selectedMenu) {
      case "InvoiceList":
        return <InvoiceList user={user?.username} setSelectedMenu={setSelectedMenu} setEditInvoiceDataParent={setEditInvoiceData} />;
      case "AddInvoice":
        return (
          <AddInvoice user={user?.username} setSelectedMenu={setSelectedMenu} />
        );
      case "EditInvoice":
        return (
          <EditInvoice user={user?.username} setSelectedMenu={setSelectedMenu} EditInvoiceData={editInvoiceData} onClose={() => setSelectedMenu("InvoiceList")} />
        );
      default:
        return <InvoiceList user={user?.username} setSelectedMenu={setSelectedMenu} setEditInvoiceDataParent={setEditInvoiceData} />;
    }
  };

  return (
    <div className="-m-4 min-h-screen" style={{ background: "#F8F9FB" }}>
      <DashboardNavbar user={user} setUser={setUser} />

      {/* ── STICKY HEADER ── */}
      <div className="sticky top-0 z-40 pb-4" style={{ background: "#F8F9FB" }}>
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div
            className="rounded-2xl border border-gray-100 px-6 py-5 flex items-center justify-between gap-4 flex-wrap"
            style={{
              background: "linear-gradient(135deg, #f5f6ff 0%, #eef0ff 100%)",
              boxShadow: "0 1px 8px rgba(37,99,235,0.06)",
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)", boxShadow: "0 4px 14px rgba(37,99,235,0.3)" }}
              >
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">Invoice Management</h1>
                <p className="text-xs text-gray-400 mt-0.5">Create, manage and track your invoices</p>
              </div>
            </div>

            {/* Tab Navigation */}
            {!loading && (
              <div className="flex items-center gap-2">
                {menuItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setSelectedMenu(item.key)}
                    className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium transition-all"
                    style={selectedMenu === item.key ? {
                      background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                      color: "#fff", border: "none",
                      boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                    } : {
                      background: "#fff", color: "#6b7280", border: "1px solid #e5e7eb",
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="px-4 pb-4">
        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedMenu}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Invoice;
