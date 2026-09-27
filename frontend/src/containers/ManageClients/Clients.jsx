import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Button, message } from "antd";
import {
  ArrowLeftOutlined,
  TeamOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

import Modal from "../../components/Modal";
import NewClientForm from "./NewClientForm.jsx";
import Overviews from "../../components/ManageClientsOverview/Overviews.jsx";
import DashboardNavbar from "../../components/Navbar/DashboardNavbar.jsx";

import { clientList, clientStats } from "../../services/api.js";
import { AppContext } from "../../utils/Context.jsx";
import handleApiError from "../../utils/errorHandler.js";


const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

const Clients = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [broadcastData, setBroadcastData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Server-side pagination + search + filters
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [serverTotals, setServerTotals] = useState({
    total: 0,
    totalReseller: 0,
    totalClient: 0,
    totalActive: 0,
    totalInactive: 0,
  });

  const { reload } = useContext(AppContext);

  useEffect(() => {
    const fetchBroadcasts = async () => {
      setLoading(true);
      try {
        const params = { page, limit: pageSize };
        if (search) params.search = search;
        if (userTypeFilter) params.user_type = userTypeFilter;
        if (statusFilter) params.status = statusFilter;

        const [mainRes, statsRes] = await Promise.all([
          clientList(params),
          clientStats(),
        ]);

        const list = Array.isArray(mainRes.data?.data) ? mainRes.data.data : [];
        const stats = statsRes.data?.data || {};
        const meta = mainRes.data?.meta || {};
        
        setBroadcastData(list);

        // Use filtered total from API response meta when searching/filtering
        // This ensures pagination shows correct page count for filtered results
        const filteredTotal = search || userTypeFilter || statusFilter 
          ? (meta.total ?? list.length)
          : (stats.total_users ?? meta.total ?? list.length);

        setServerTotals({
          total: filteredTotal,
          totalReseller: stats.total_resellers ?? 0,
          totalClient: stats.total_clients ?? 0,
          totalActive: stats.enabled_users ?? 0,
          totalInactive: stats.disabled_users ?? 0,
        });
      } catch (error) {
        handleApiError(error);
      } finally {
        setLoading(false);
      }
    };
    fetchBroadcasts();
  }, [reload, page, pageSize, search, userTypeFilter, statusFilter]);

  const handleModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const backlogic = () => {
    navigate("/dashboard");
  };

  return (
    <div className="-m-4 min-h-screen" style={{ background: "#F8F9FB" }}>
      <DashboardNavbar user={user} setUser={setUser} />

      {/* ── HEADER — sticky ── */}
      <div className="sticky top-0 z-40 pb-4" style={{ background: "#F8F9FB" }}>
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div
            className="rounded-2xl border border-gray-100 px-6 py-5 flex items-center justify-between gap-4 flex-wrap"
            style={{
              background: "linear-gradient(135deg, #f5f6ff 0%, #eef0ff 100%)",
              boxShadow: "0 1px 8px rgba(37,99,235,0.06)",
            }}
          >
            {/* Left: back + icon + title */}
            <div className="flex items-center gap-4">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={backlogic}
                className="h-9 w-9 rounded-lg border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 flex items-center justify-center"
              />
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: THEME.gradient, boxShadow: "0 4px 14px rgba(37,99,235,0.3)" }}
              >
                <TeamOutlined style={{ color: "#fff", fontSize: 20 }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">Manage Clients</h1>
                <p className="text-xs text-gray-400 mt-0.5">View, add, and manage all your clients</p>
              </div>
            </div>

            {/* Right: add button */}
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={handleModal}
              className="h-9 px-4 rounded-lg font-semibold"
              style={{ background: THEME.gradient, border: "none", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}
            >
              Add New Client
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Button hover effects */
        .ant-btn:hover {
          transform: translateY(-1px);
        }

        .ant-btn:active {
          transform: translateY(0);
        }

        /* Primary button glow effect */
        .ant-btn-primary:hover {
          box-shadow: 0 6px 20px rgba(3, 207, 101, 0.35) !important;
        }

        /* Smooth transitions */
        .ant-btn {
          transition: all 0.2s ease;
        }
      `}} />
      {/* ── CONTENT ── */}
      <div className="px-4 pb-4 space-y-4">
        <Overviews
          user={user.username}
          broadcastData={broadcastData}
          loading={loading}
          setBroadcastData={setBroadcastData}
          serverTotals={serverTotals}
          page={page}
          pageSize={pageSize}
          search={search}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          onSearch={(s) => { setSearch(s); setPage(1); }}
          onFilter={({ userType, status }) => {
            setUserTypeFilter(userType ?? "");
            setStatusFilter(status ?? "");
            setPage(1);
          }}
        />
      </div>

      {/* New Client Modal */}
      {isModalOpen && (
        <Modal isModalOpen={isModalOpen} closeModal={closeModal}>
          <NewClientForm closeModal={closeModal} user={user.username} />
        </Modal>
      )}
    </div>
  );
};

export default Clients;
