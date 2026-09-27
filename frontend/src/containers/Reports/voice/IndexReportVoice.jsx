import {
  UserOutlined,
  CalendarOutlined,
  TeamOutlined,
  FileTextOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { UnifiedSidebar } from "../../../components/Layout";

/**
 * IndexReportVoice - Uses UnifiedSidebar with Voice Reports configuration
 */
const IndexReportVoice = ({ user }) => {
  // Menu items configuration
  const menuItems = [
    {
      key: "campaign",
      path: "/dashboard/management/reports/voice",
      icon: UserOutlined,
      label: "User Campaign",
      description: "Campaign reports",
    },
    {
      key: "usage",
      path: "/dashboard/management/reports/voice/usage",
      icon: CalendarOutlined,
      label: "Usage Reports",
      description: "Usage statistics",
    },
    {
      key: "live",
      path: "/dashboard/management/reports/voice/live",
      icon: TeamOutlined,
      label: "User Live Reports",
      description: "Real-time reports",
    },
    {
      key: "logs",
      path: "/dashboard/management/reports/voice/logs",
      icon: FileTextOutlined,
      label: "Logs",
      description: "View call logs",
    },
  ];

  return (
    <UnifiedSidebar
      user={user}
      menuItems={menuItems}
      title="Voice Reports"
      titleIcon={PhoneOutlined}
      showUserSection={true}
      statusConfig={null}
    />
  );
};

export default IndexReportVoice;
