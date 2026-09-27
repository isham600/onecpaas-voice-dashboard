import {
  UserOutlined,
  PlusOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { UnifiedSidebar } from "../../components/Layout";

/**
 * SidebarLayoutNumber - Uses UnifiedSidebar with Numbers-specific configuration
 */
const SidebarLayoutNumber = ({ user }) => {
  // Menu items configuration
  const menuItems = [
    {
      key: "activeNumbers",
      path: "/dashboard/numbers/activeNumbers",
      icon: UserOutlined,
      label: "Active Number",
      description: "View active numbers",
    },
    {
      key: "buyNumbers",
      path: "/dashboard/numbers/buyNumbers",
      icon: PlusOutlined,
      label: "Buy Number",
      description: "Purchase new numbers",
    },
  ];

  return (
    <UnifiedSidebar
      user={user}
      menuItems={menuItems}
      title="Numbers"
      titleIcon={PhoneOutlined}
      showUserSection={true}
      statusConfig={null}
    />
  );
};

export default SidebarLayoutNumber;
