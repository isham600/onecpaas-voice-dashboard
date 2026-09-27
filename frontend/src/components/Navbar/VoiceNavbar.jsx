import EnhancedNavbar from "./EnhancedNavbar";
import {
  faAddressBook,
  faBroadcastTower,
  faCogs,
  faCode,
} from "@fortawesome/free-solid-svg-icons";

// Define Voice specific menu items
const VOICE_MENU_ITEMS = [
  {
    name: "Broadcast",
    icon: faBroadcastTower,
    path: "/dashboard/voice/broadcast",
  },
  { name: "Contacts", icon: faAddressBook, path: "/dashboard/voice/contacts" },
  { name: "API", icon: faCode, path: "/dashboard/voice/api" },
];

/**
 * Voice Navigation Component
 * Specialized navbar for Voice module using the enhanced navbar component
 */
const VoiceNavbar = ({ user, setUser }) => {
  return (
    <EnhancedNavbar
      user={user}
      setUser={setUser}
      menuItems={VOICE_MENU_ITEMS}
      dropdownItems={[]} // Voice doesn't have dropdown items
      moduleName="Voice"
    />
  );
};

export default VoiceNavbar;
