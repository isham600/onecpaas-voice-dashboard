import { useState, useEffect } from "react";
import {
  TeamOutlined,
  SettingOutlined,
  ApartmentOutlined,
  ApiOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";

import UnifiedSidebar from "../../components/Layout/UnifiedSidebar";
import { getProfileMe } from "../../services/api";

const Management = ({ user }) => {
  const [permissions, setPermissions] = useState(null);

  useEffect(() => {
    getProfileMe()
      .then((res) => setPermissions(res?.data?.data?.permissions || {}))
      .catch(() => setPermissions({}));
  }, []);

  const allMenuItems = [
    {
      key: "clients",
      label: "Manage Clients",
      description: "View and manage clients",
      icon: TeamOutlined,
      path: "/dashboard/management/clients",
      permissionKey: "manage_clients",
    },
    {
      key: "client-tree",
      label: "Client Tree",
      description: "View account hierarchy",
      icon: ApartmentOutlined,
      path: "/dashboard/management/client-tree",
      permissionKey: "manage_clients",
    },
    {
      key: "call-fallback-notify",
      label: "Call Fallback Notify",
      description: "Manage routes, assignments & logs",
      icon: ApiOutlined,
      path: "/dashboard/management/call-fallback-notify",
      permissionKey: "voice_call_fallback_notify",
    },
    {
      key: "voice-routes",
      label: "Voice Routes",
      description: "Choose the sending provider per user",
      icon: ThunderboltOutlined,
      path: "/dashboard/management/voice-routes",
      permissionKey: "voice_routes",
    },
  ];

  const menuItems = permissions === null
    ? []
    : allMenuItems.filter((item) => {
        if (item.permissionKey) return permissions[item.permissionKey] === 1;
        if (item.permissionKeys) return item.permissionKeys.some((k) => permissions[k] === 1);
        return true;
      });

  return (
    <UnifiedSidebar
      user={user}
      menuItems={menuItems}
      title="Management"
      titleIcon={SettingOutlined}
      showUserSection={true}
      useOutlet={true}
    />
  );
};

export default Management;
