import { motion, AnimatePresence } from "framer-motion";
import { Button, Typography, Tooltip } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LoginOutlined,
  TeamOutlined,
  SettingOutlined,
  UserOutlined,
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

const UserProfileSidebar = ({
  setSection,
  selectedSection,
  user,
  permission,
  isCollapsed,
  setIsCollapsed,
}) => {
  // Icon mapping
  const iconMap = {
    loginintegration: LoginOutlined,
    yourintegration: TeamOutlined,
    resellersettings: SettingOutlined,
  };

  let sections;

  if (
    permission?.reseller_setting === 1 &&
    permission?.your_integration === 1
  ) {
    sections = [
      { id: "loginintegration", label: "Login Integration" },
      { id: "yourintegration", label: "Your Integration" },
      { id: "resellersettings", label: "Reseller Settings" },
    ];
  } else if (
    permission?.reseller_setting === 1 &&
    permission?.your_integration !== 1
  ) {
    sections = [
      { id: "loginintegration", label: "Login Integration" },
      { id: "resellersettings", label: "Reseller Settings" },
    ];
  } else if (
    permission?.reseller_setting !== 1 &&
    permission?.your_integration === 1
  ) {
    sections = [
      { id: "loginintegration", label: "Login Integration" },
      { id: "yourintegration", label: "Your Integration" },
    ];
  } else {
    sections = [{ id: "loginintegration", label: "Login Integration" }];
  }

  // Sidebar animations
  const sidebarVariants = {
    expanded: {
      width: 280,
      transition: { duration: 0.3, ease: "easeInOut" },
    },
    collapsed: {
      width: 80,
      transition: { duration: 0.3, ease: "easeInOut" },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <motion.div
      variants={sidebarVariants}
      animate={isCollapsed ? "collapsed" : "expanded"}
      className="bg-white flex flex-col border-r border-gray-100"
      style={{
        position: "fixed",
        marginTop: "8px",
        height: "100%",
        boxShadow: "2px 0 12px rgba(0,0,0,0.04)",
        zIndex: 10,
      }}
    >
      {/* Header */}
      <div
        className="p-4"
        style={{
          borderBottom: "1px solid rgba(37,99,235,0.1)",
          background: THEME.gradientLight,
        }}
      >
        <div className="flex items-center justify-between">
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center space-x-2"
              >
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: THEME.gradient,
                    boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                  }}
                >
                  <UserOutlined style={{ color: "white", fontSize: 16 }} />
                </motion.div>
                <div>
                  <Text
                    strong
                    className="text-sm block"
                    style={{ color: "#1f2937" }}
                  >
                    User Profile
                  </Text>
                  <span className="text-[10px] text-gray-400">
                    Account Settings
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              type="text"
              icon={isCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center justify-center"
              style={{
                color: THEME.primaryDark,
                width: 32,
                height: 32,
                borderRadius: 8,
                background: isCollapsed
                  ? "rgba(37,99,235,0.08)"
                  : "transparent",
              }}
              size="small"
            />
          </motion.div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {!isCollapsed && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-3 mb-3"
          >
            Navigation
          </motion.p>
        )}

        <motion.ul
          className="space-y-1.5"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.05,
              },
            },
          }}
        >
          {sections.map((section) => {
            const IconComponent = iconMap[section.id];
            const isActive = selectedSection === section.id;

            return (
              <motion.li key={section.id} variants={itemVariants}>
                <Tooltip
                  title={isCollapsed ? section.label : ""}
                  placement="right"
                  color={THEME.primaryDark}
                >
                  <motion.div
                    whileHover={{ x: isCollapsed ? 0 : 2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="text"
                      onClick={() => setSection(section.id)}
                      className="w-full flex items-center justify-start rounded-xl transition-all duration-200"
                      style={{
                        height: 48,
                        paddingLeft: isCollapsed ? 0 : 12,
                        paddingRight: isCollapsed ? 0 : 12,
                        justifyContent: isCollapsed ? "center" : "flex-start",
                        background: isActive
                          ? THEME.gradientLight
                          : "transparent",
                        border: isActive
                          ? "1px solid rgba(37,99,235,0.2)"
                          : "1px solid transparent",
                        boxShadow: isActive
                          ? "0 2px 8px rgba(37,99,235,0.08)"
                          : "none",
                      }}
                    >
                      <div
                        className="flex items-center gap-3 w-full"
                        style={{
                          justifyContent: isCollapsed ? "center" : "flex-start",
                        }}
                      >
                        <motion.div
                          whileHover={{ rotate: 5, scale: 1.1 }}
                          className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                          style={{
                            background: isActive
                              ? THEME.gradient
                              : "rgba(37,99,235,0.08)",
                            boxShadow: isActive
                              ? "0 4px 12px rgba(37,99,235,0.3)"
                              : "none",
                          }}
                        >
                          <IconComponent
                            style={{
                              fontSize: 16,
                              color: isActive ? "white" : THEME.primaryDark,
                            }}
                          />
                        </motion.div>

                        <AnimatePresence>
                          {!isCollapsed && (
                            <motion.div
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: "auto" }}
                              exit={{ opacity: 0, width: 0 }}
                              className="flex items-center justify-between flex-1 overflow-hidden"
                            >
                              <Text
                                className="text-sm font-medium whitespace-nowrap"
                                style={{
                                  color: isActive
                                    ? THEME.primaryDark
                                    : "#4b5563",
                                }}
                              >
                                {section.label}
                              </Text>

                              {isActive && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ background: THEME.primary }}
                                />
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </Button>
                  </motion.div>
                </Tooltip>
              </motion.li>
            );
          })}
        </motion.ul>
      </nav>

      {/* User Info Footer */}
      <div
        className="p-4"
        style={{ borderTop: "1px solid rgba(37,99,235,0.1)" }}
      >
        <AnimatePresence>
          {!isCollapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2.5"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(37,99,235,0.1)" }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: THEME.primary,
                    boxShadow: `0 0 8px #2563EB60`,
                  }}
                />
              </motion.div>
              <div className="flex-1 min-w-0">
                <Text
                  className="text-xs font-medium block truncate"
                  style={{ color: "#374151" }}
                >
                  {user?.username || "User"}
                </Text>
                <span className="text-[10px]" style={{ color: THEME.primary }}>
                  ● Online
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center"
            >
              <Tooltip
                title={user?.username || "User"}
                placement="right"
                color={THEME.primaryDark}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(37,99,235,0.1)" }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      background: THEME.primary,
                      boxShadow: `0 0 8px #2563EB60`,
                    }}
                  />
                </div>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sidebar Theme Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Sidebar scrollbar */
        nav::-webkit-scrollbar {
          width: 3px;
        }

        nav::-webkit-scrollbar-track {
          background: transparent;
        }

        nav::-webkit-scrollbar-thumb {
          background: rgba(37,99,235,0.2);
          border-radius: 10px;
        }

        nav::-webkit-scrollbar-thumb:hover {
          background: rgba(37,99,235,0.4);
        }

        /* Tooltip with green theme */
        .ant-tooltip-inner {
          border-radius: 8px !important;
          font-size: 12px !important;
          font-weight: 500 !important;
        }
      `}} />
    </motion.div>
  );
};

export default UserProfileSidebar;
