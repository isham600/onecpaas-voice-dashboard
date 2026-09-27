import { motion } from "framer-motion";
import { Segmented, Typography, Space } from "antd";
import {
  SettingOutlined,
  UserOutlined,
  PhoneOutlined,
  ContactsOutlined,
  BuildOutlined,
  PlusOutlined,
  CreditCardOutlined,
  WhatsAppOutlined,
  MessageOutlined,
  BellOutlined,
  DeleteOutlined,
  ExportOutlined,
  TagsOutlined,
  AppstoreOutlined,
  LockOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

// Theme colors
const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

const ToggleMenu = ({ menuItems, activeItem, setActiveItem, permission }) => {
  // Icon mapping for different menu items
  const iconMap = {
    credentials: UserOutlined,
    basicinfo: ContactsOutlined,
    contactinfo: PhoneOutlined,
    businessdetails: BuildOutlined,
    additionalfields: PlusOutlined,
    changepassword: LockOutlined,
    paymentgateway: CreditCardOutlined,
    officialwhatsapp: WhatsAppOutlined,
    sms: MessageOutlined,
    voice: PhoneOutlined,
    whitelabeloptions: SettingOutlined,
    notificationsalerts: BellOutlined,
    messagedeletion: DeleteOutlined,
    exportchats: ExportOutlined,
    tagsandattributes: TagsOutlined,
  };

  // Transform menu items for Segmented component
  const segmentedOptions = menuItems.map((item) => {
    const IconComponent = iconMap[item.id];

    return {
      label: (
        <Space size={8} align="center" style={{ padding: "8px 12px" }}>
          {IconComponent && <IconComponent style={{ fontSize: "16px" }} />}
          <Text style={{ fontSize: "13px", fontWeight: 500 }}>
            {item.label}
          </Text>
        </Space>
      ),
      value: item.id,
    };
  });

  const containerVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  const currentMenuItem = menuItems.find((item) => item.id === activeItem);
  const currentIndex = menuItems.findIndex((item) => item.id === activeItem);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <div
        className="rounded-xl"
        style={{
          background: "transparent",
        }}
      >
        {/* Header Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: THEME.gradient,
                boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
              }}
            >
              <AppstoreOutlined style={{ color: "white", fontSize: 16 }} />
            </motion.div>
            <div>
              <Text
                className="block text-xs font-semibold uppercase"
                style={{
                  letterSpacing: "0.5px",
                  color: "#9ca3af",
                }}
              >
                Navigation
              </Text>
              <span
                className="text-base font-bold block"
                style={{ color: "#1f2937", marginTop: 1 }}
              >
                {currentMenuItem?.label || "Select Option"}
              </span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(37,99,235,0.08)" }}
          >
            <span
              className="text-xs font-semibold"
              style={{ color: THEME.primaryDark }}
            >
              {currentIndex + 1}
            </span>
            <span className="text-xs text-gray-400">of</span>
            <span
              className="text-xs font-semibold"
              style={{ color: THEME.primaryDark }}
            >
              {menuItems.length}
            </span>
          </motion.div>
        </div>

        {/* Segmented Control */}
        <div
          className="rounded-xl p-1"
          style={{
            background: "white",
            border: "1px solid rgba(37,99,235,0.12)",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <Segmented
            options={segmentedOptions}
            value={activeItem}
            onChange={setActiveItem}
            size="large"
            style={{
              backgroundColor: "transparent",
              width: "100%",
            }}
          />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        /* Segmented container */
        .ant-segmented {
          background: transparent !important;
          padding: 0 !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          scrollbar-width: thin !important;
          scrollbar-color: rgba(37,99,235,0.2) rgba(37,99,235,0.05) !important;
          -webkit-overflow-scrolling: touch !important;
        }

        /* Webkit scrollbar styling */
        .ant-segmented::-webkit-scrollbar {
          height: 6px !important;
        }

        .ant-segmented::-webkit-scrollbar-track {
          background: rgba(37,99,235,0.05) !important;
          border-radius: 10px !important;
        }

        .ant-segmented::-webkit-scrollbar-thumb {
          background: rgba(37,99,235,0.2) !important;
          border-radius: 10px !important;
        }

        .ant-segmented::-webkit-scrollbar-thumb:hover {
          background: rgba(37,99,235,0.3) !important;
        }

        /* Individual segment items */
        .ant-segmented .ant-segmented-item {
          border-radius: 10px !important;
          font-weight: 500 !important;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
          margin: 2px !important;
          min-height: 46px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #6b7280 !important;
          border: none !important;
          flex-shrink: 0 !important;
          min-width: max-content !important;
          white-space: nowrap !important;
        }

        /* Selected/Active item - Green gradient theme */
        .ant-segmented .ant-segmented-item-selected {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%) !important;
          color: white !important;
          box-shadow: 0 4px 12px rgba(3, 207, 101, 0.3) !important;
          transform: translateY(-1px) !important;
        }

        /* Hover state for non-selected items */
        .ant-segmented
          .ant-segmented-item:hover:not(.ant-segmented-item-selected) {
          background: rgba(3, 207, 101, 0.06) !important;
          color: #1D4ED8 !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 2px 6px rgba(3, 207, 101, 0.1) !important;
        }

        /* Selected item text and icons */
        .ant-segmented .ant-segmented-item-selected .anticon,
        .ant-segmented .ant-segmented-item-selected span,
        .ant-segmented .ant-segmented-item-selected .ant-typography {
          color: white !important;
        }

        /* Hover item text and icons */
        .ant-segmented
          .ant-segmented-item:hover:not(.ant-segmented-item-selected)
          .anticon,
        .ant-segmented
          .ant-segmented-item:hover:not(.ant-segmented-item-selected)
          span,
        .ant-segmented
          .ant-segmented-item:hover:not(.ant-segmented-item-selected)
          .ant-typography {
          color: #1D4ED8 !important;
        }

        /* Segmented thumb/indicator */
        .ant-segmented .ant-segmented-thumb {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%) !important;
          border-radius: 10px !important;
          box-shadow: 0 4px 12px rgba(3, 207, 101, 0.3) !important;
        }

        /* Non-selected item icons default state */
        .ant-segmented .ant-segmented-item .anticon {
          color: #9ca3af !important;
          transition: color 0.2s ease !important;
        }

        .ant-segmented .ant-segmented-item-selected .anticon {
          color: white !important;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .ant-segmented .ant-segmented-item {
            min-width: 130px !important;
            flex-shrink: 0 !important;
            min-height: 42px !important;
          }
        }

        /* Extra small screens */
        @media (max-width: 480px) {
          .ant-segmented .ant-segmented-item {
            min-width: 110px !important;
            padding: 4px 8px !important;
          }
        }
      `}} />
    </motion.div>
  );
};

export default ToggleMenu;
