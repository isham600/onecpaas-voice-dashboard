import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AudioOutlined,
  DashboardOutlined,
  HistoryOutlined,
  SendOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import { UnifiedSidebar } from "../../components/Layout";
import Modal from "../../components/Modal";
import NewBroadcastVoice from "./NewBroadcastVoice";

/**
 * Voice SidebarLayout - Uses UnifiedSidebar with Voice-specific configuration
 */
const SidebarLayoutVoice = ({ user }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchParams] = useSearchParams();
  // Captured once on entry to the Voice section — sidebar navigation below
  // uses plain paths (no query string), so without this the channel context
  // (Voice vs Voice 30) would be lost the moment you click any sidebar item.
  const [isPulse30] = useState(() => searchParams.get("pulse30") === "1");
  const pulse30Suffix = isPulse30 ? "?pulse30=1" : "";

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleBroadcastSuccess = () => {
    window.dispatchEvent(new CustomEvent("broadcastSuccess"));
    window.dispatchEvent(new CustomEvent("refreshCredits"));
  };

  // Menu items configuration
  const menuItems = [
    {
      key: "dashboard",
      path: `/dashboard/voice/dashboard${pulse30Suffix}`,
      icon: DashboardOutlined,
      label: isPulse30 ? "Voice 30 Dashboard" : "Voice 15 Dashboard",
      description: "Campaign overview",
    },
    {
      key: "broadcast",
      path: `/dashboard/voice/broadcast${pulse30Suffix}`,
      icon: HistoryOutlined,
      label: isPulse30 ? "Voice 30 Reports" : "Voice 15 Reports",
      description: "View voice broadcasts",
    },
    {
      key: "send-voice",
      icon: SendOutlined,
      label: isPulse30 ? "Send Voice 30" : "Send Voice 15",
      description: "Create a new voice broadcast",
      onClick: openModal,
    },
    {
      key: "ivr",
      path: `/dashboard/voice/ivr${pulse30Suffix}`,
      icon: ApartmentOutlined,
      label: "IVR",
      description: "Build call-flow menus",
    },
  ];

  return (
    <>
      <UnifiedSidebar
        user={user}
        menuItems={menuItems}
        title={isPulse30 ? "Voice 30" : "Voice 15"}
        titleIcon={AudioOutlined}
        showUserSection={true}
      />

      {isModalOpen && (
        <Modal
          isModalOpen={isModalOpen}
          closeModal={closeModal}
          height="80vh"
          className="voice-broadcast-modal"
        >
          <NewBroadcastVoice
            closeModal={closeModal}
            user={user?.username}
            onBroadcastSuccess={handleBroadcastSuccess}
            pulse30={isPulse30}
          />
        </Modal>
      )}
    </>
  );
};

export default SidebarLayoutVoice;
