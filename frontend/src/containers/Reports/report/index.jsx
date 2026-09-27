import { useState } from "react";
import { Typography } from "antd";
import { motion } from "framer-motion";

import DashboardNavbar from "../../../components/Navbar/DashboardNavbar";
import ReportChannels from "./ReportChannels";
import ReportsTree from "./ReportTree";
import { BarChartOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

// Theme colors
const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

const Reports = ({ user, setUser }) => {
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientType, setClientType] = useState(null);

  const handleClientSelect = (username, userType) => {
    setSelectedClient(username);
    setClientType(userType);
  };

  const handleBackToTree = () => {
    setSelectedClient(null);
    setClientType(null);
  };

  return (
    <div className="bg-gray-50 min-h-full">
      <DashboardNavbar user={user} setUser={setUser} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
      >
        {/* Header Section */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: THEME.gradient,
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
            }}
          >
            <BarChartOutlined style={{ fontSize: 24, color: "white" }} />
          </motion.div>
          <div>
            <Title level={3} style={{ marginBottom: 0, color: "#1f2937" }}>
              Reports & Analytics
            </Title>
            <Text className="text-xs text-gray-500">
              View detailed reports and analytics for all channels
            </Text>
          </div>
        </div>

        {selectedClient ? (
          <ReportChannels
            user={user}
            selectedClient={selectedClient}
            clientType={clientType}
            onBack={handleBackToTree}
          />
        ) : (
          <ReportsTree username={user.username} onSelect={handleClientSelect} />
        )}
      </motion.div>

      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Card styling */
        .ant-card {
          border-radius: 16px;
        }

        /* Smooth transitions */
        .ant-btn {
          transition: all 0.2s ease;
        }

        /* Primary button glow effect */
        .ant-btn-primary:hover {
          box-shadow: 0 6px 20px rgba(3, 207, 101, 0.35) !important;
        }
      `}} />
    </div>
  );
};

export default Reports;
