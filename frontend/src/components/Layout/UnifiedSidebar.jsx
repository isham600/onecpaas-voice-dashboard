import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Typography, Tooltip, Skeleton } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

const { Text } = Typography;

const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(29,78,216,0.04) 100%)",
};

const NAVBAR_HEIGHT = 96;

const HIGHLIGHT_STYLES = `
  @keyframes aurora {
    0%,100% { background-position: 0% 50%; }
    50%      { background-position: 100% 50%; }
  }

  @keyframes ping-ring {
    0%   { transform: scale(1);   opacity: 0.75; }
    100% { transform: scale(2.3); opacity: 0; }
  }

  @keyframes float-badge {
    0%,100% { transform: translateY(0px)  rotate(-2deg); }
    50%      { transform: translateY(-4px) rotate(2deg); }
  }

  @keyframes star-spin {
    0%   { transform: rotate(0deg)   scale(1);   }
    50%  { transform: rotate(180deg) scale(1.35); }
    100% { transform: rotate(360deg) scale(1);   }
  }

  @keyframes text-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }

  @keyframes subtle-bounce {
    0%,100% { transform: translateY(0);    }
    50%      { transform: translateY(-2px); }
  }

  /* ── outer aurora border shell ── */
  .hl-shell {
    background: linear-gradient(
      270deg,
      #ff6b35, #f7c59f, #efefd0, #a8dadc, #457b9d, #a8dadc, #ff6b35
    );
    background-size: 400% 400%;
    animation: aurora 3s ease infinite;
    border-radius: 13px;
    padding: 2px;
    cursor: pointer;
    position: relative;
  }

  /* ── inner frosted row ── */
  .hl-inner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 11px;
    background: rgba(255,255,255,0.84);
    position: relative;
    overflow: hidden;
    transition: background 0.2s;
    animation: subtle-bounce 2.6s ease-in-out infinite;
  }
  .hl-shell:hover .hl-inner {
    background: rgba(255,255,255,0.66);
  }

  /* ── ping wrap + rings ── */
  .hl-ping-wrap {
    position: relative;
    width: 34px;
    height: 34px;
    flex-shrink: 0;
  }
  .hl-ring {
    position: absolute;
    inset: 0;
    border-radius: 9px;
    border: 2px solid #f7431b;
    animation: ping-ring 1.5s cubic-bezier(0,0,0.2,1) infinite;
    z-index: 1;
  }
  .hl-ring-2 {
    animation-delay: 0.55s;
    border-color: #ff9f1c;
  }

  /* ── icon box ── */
  .hl-ico {
    position: absolute;
    inset: 0;
    border-radius: 9px;
    background: linear-gradient(135deg, #f7431b 0%, #ff9f1c 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
    color: #fff;
    z-index: 2;
  }

  /* ── spinning star corner ── */
  .hl-star {
    position: absolute;
    top: -3px;
    right: -3px;
    width: 15px;
    height: 15px;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    border-radius: 50%;
    color: #ff9f1c;
    animation: star-spin 3s linear infinite;
    z-index: 3;
    border: 1px solid rgba(247,67,27,0.22);
  }

  /* ── shimmer label ── */
  .hl-label {
    font-size: 13px;
    font-weight: 700;
    background: linear-gradient(
      90deg,
      #c0392b, #e67e22, #2980b9, #c0392b
    );
    background-size: 300% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: text-shimmer 2.5s linear infinite;
    letter-spacing: 0.25px;
    position: relative;
    z-index: 1;
  }
  .hl-sub {
    font-size: 11px;
    color: #e67e22;
    font-weight: 600;
    line-height: 1.3;
    position: relative;
    z-index: 1;
  }
  .hl-chevron {
    font-size: 14px;
    color: #e67e22;
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }
`;

/* ─────────────────────────────────────────────────────────────
   HighlightedMenuItem – standalone component for isHighlighted items
   Renders the full aurora + ping + shimmer text effect.
───────────────────────────────────────────────── */
const HighlightedMenuItem = ({ item, isCollapsed }) => {
  const Icon = item.icon;

  if (isCollapsed) {
    return (
      <Tooltip title={item.label} placement="right">
        <div
          className="hl-shell"
          onClick={item.onClick}
          style={{ borderRadius: 11, padding: 2 }}
        >
          <div
            className="hl-inner"
            style={{
              justifyContent: "center",
              padding: "7px",
              borderRadius: 9,
            }}
          >
            <div className="hl-ping-wrap">
              <div className="hl-ring" />
              <div className="hl-ring hl-ring-2" />
              <div className="hl-ico">
                {Icon && <Icon style={{ fontSize: 16, color: "#fff" }} />}
              </div>
            </div>
          </div>
        </div>
      </Tooltip>
    );
  }

  return (
    <div className="hl-shell" onClick={item.onClick}>
      <div className="hl-inner">
        {/* ping icon */}
        <div className="hl-ping-wrap">
          <div className="hl-ring" />
          <div className="hl-ring hl-ring-2" />
          <div className="hl-ico">
            {Icon && <Icon style={{ fontSize: 17, color: "#fff" }} />}
          </div>
          <div className="hl-star" aria-hidden="true">
            ✦
          </div>
        </div>

        {/* text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="hl-label">{item.label}</div>
          {item.description && <div className="hl-sub">{item.description}</div>}
        </div>

        {/* chevron */}
        <RightOutlined className="hl-chevron" />
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   UnifiedSidebar
───────────────────────────────────────────────── */
const UnifiedSidebar = ({
  user,
  menuItems = [],
  title = "Dashboard",
  titleIcon: TitleIcon,
  statusConfig = null,
  showUserSection = true,
  onCollapseChange,
  defaultCollapsed = false,
  userRole = null,
  children,
  useOutlet = true,
  bottomContent = null,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const initial = {};
    menuItems.forEach((item) => {
      if (
        item.defaultExpanded ||
        item.children?.some((c) => c.isActive || location.pathname.startsWith(c.path || ''))
      ) {
        initial[item.key] = true;
      }
    });
    return initial;
  });

  const toggleGroup = (key) =>
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  const getEffectiveExpanded = (key) => !!expandedGroups[key];

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      onCollapseChange?.(next);
      return next;
    });
  }, [onCollapseChange]);

  const filteredMenuItems = menuItems.filter((item) => {
    if (!item.roles) return true;
    if (!userRole) return true;
    return item.roles.includes(userRole);
  });

  // Items whose path carries a query string (e.g. Voice 30's "?pulse30=1")
  // need the search compared too — otherwise every such item would either
  // never match, or always match, plain pathname-only items.
  const isActivePath = (path) => {
    if (!path) return false;
    return path.includes('?')
      ? path === `${location.pathname}${location.search}`
      : path === location.pathname;
  };
  const sidebarWidth = isCollapsed ? 72 : 280;

  return (
    <div className="min-h-screen flex bg-gray-50">
      <style>{HIGHLIGHT_STYLES}</style>

      {/* ── Sidebar ── */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="fixed left-0 bg-white border-r border-gray-100 flex flex-col z-40"
        style={{
          boxShadow: "2px 0 8px rgba(0,0,0,0.03)",
          top: `${NAVBAR_HEIGHT}px`,
          height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
        }}
      >
        {/* Header */}
        <div
          className="p-4 flex items-center justify-between border-b border-gray-100"
          style={{ background: THEME.gradientLight }}
        >
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-3"
              >
                {TitleIcon && (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: THEME.gradient,
                      boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                    }}
                  >
                    <TitleIcon style={{ fontSize: 20, color: "white" }} />
                  </div>
                )}
                <Text strong style={{ fontSize: 16, color: "#1f2937" }}>
                  {title}
                </Text>
              </motion.div>
            )}
          </AnimatePresence>

          <Tooltip
            title={isCollapsed ? "Expand" : "Collapse"}
            placement="right"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleCollapse}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: "rgba(37,99,235,0.1)" }}
            >
              {isCollapsed ? (
                <MenuUnfoldOutlined
                  style={{ color: THEME.primary, fontSize: 16 }}
                />
              ) : (
                <MenuFoldOutlined
                  style={{ color: THEME.primary, fontSize: 16 }}
                />
              )}
            </motion.button>
          </Tooltip>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {filteredMenuItems.map((item, index) => {
              /* ── highlighted item gets its own renderer ── */
              if (item.isHighlighted) {
                return (
                  <motion.li
                    key={item.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <HighlightedMenuItem
                      item={item}
                      isCollapsed={isCollapsed}
                    />
                  </motion.li>
                );
              }

              const isGroup =
                Array.isArray(item.children) && item.children.length > 0;
              const isExpanded = getEffectiveExpanded(item.key);
              const hasActiveChild =
                isGroup && item.children.some((c) => c.isActive ?? isActivePath(c.path));
              const isActive = !isGroup && isActivePath(item.path);
              const shouldHighlight = isActive || hasActiveChild;
              const Icon = item.icon;

              return (
                <motion.li
                  key={item.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Tooltip
                    title={isCollapsed ? item.label : ""}
                    placement="right"
                  >
                    <motion.button
                      whileHover={{ x: isCollapsed ? 0 : 3 }}
                      whileTap={{ scale: 0.98 }}
                      onMouseEnter={() => setHoveredItem(item.key)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={() => {
                        if (isGroup) {
                          if (!isCollapsed) toggleGroup(item.key);
                        } else if (item.onClick) {
                          item.onClick();
                        } else {
                          navigate(item.path);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                        isCollapsed ? "justify-center" : ""
                      }`}
                      style={{
                        background: shouldHighlight
                          ? THEME.gradient
                          : hoveredItem === item.key
                            ? "rgba(37,99,235,0.07)"
                            : "transparent",
                        boxShadow: shouldHighlight
                          ? "0 4px 12px rgba(37,99,235,0.25)"
                          : "none",
                        borderLeft: shouldHighlight
                          ? "3px solid rgba(255,255,255,0.4)"
                          : "3px solid transparent",
                      }}
                    >
                      {/* Icon */}
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: shouldHighlight
                            ? "rgba(255,255,255,0.2)"
                            : "rgba(37,99,235,0.1)",
                        }}
                      >
                        {Icon && (
                          <Icon
                            style={{
                              fontSize: 18,
                              color: shouldHighlight ? "white" : THEME.primary,
                            }}
                          />
                        )}
                      </div>

                      {/* Label + description */}
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.div
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            className="flex-1 text-left min-w-0 flex items-center justify-between"
                          >
                            <div className="min-w-0">
                              <p
                                className="text-sm font-semibold truncate"
                                style={{
                                  color: shouldHighlight ? "white" : "#374151",
                                }}
                              >
                                {item.label}
                              </p>
                              {item.description && (
                                <p
                                  className="text-[11px] truncate"
                                  style={{
                                    color: shouldHighlight
                                      ? "rgba(255,255,255,0.8)"
                                      : "#9ca3af",
                                  }}
                                >
                                  {item.description}
                                </p>
                              )}
                            </div>
                            {isGroup && (
                              <motion.span
                                animate={{ rotate: isExpanded ? 90 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <RightOutlined
                                  style={{
                                    fontSize: 10,
                                    color: shouldHighlight
                                      ? "rgba(255,255,255,0.7)"
                                      : "#9ca3af",
                                  }}
                                />
                              </motion.span>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </Tooltip>

                  {/* Group children */}
                  {isGroup && !isCollapsed && (
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: "easeInOut" }}
                          className="overflow-hidden ml-3 mt-1 space-y-0.5 pl-3 border-l-2"
                          style={{ borderColor: "rgba(37,99,235,0.15)" }}
                        >
                          {item.children.map((child) => {
                            const childActive = child.isActive ?? isActivePath(child.path);
                            const ChildIcon = child.icon;
                            return (
                              <li key={child.key}>
                                <motion.button
                                  whileHover={{ x: 3 }}
                                  whileTap={{ scale: 0.98 }}
                                  onMouseEnter={() => setHoveredItem(child.key)}
                                  onMouseLeave={() => setHoveredItem(null)}
                                  onClick={() => child.onClick ? child.onClick() : navigate(child.path)}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all"
                                  style={{
                                    background: childActive
                                      ? THEME.gradient
                                      : hoveredItem === child.key
                                        ? "rgba(37,99,235,0.06)"
                                        : "transparent",
                                    boxShadow: childActive
                                      ? "0 2px 8px rgba(37,99,235,0.2)"
                                      : "none",
                                  }}
                                >
                                  <div
                                    className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                                    style={{
                                      background: childActive
                                        ? "rgba(255,255,255,0.2)"
                                        : "rgba(37,99,235,0.08)",
                                    }}
                                  >
                                    {ChildIcon && (
                                      <ChildIcon
                                        style={{
                                          fontSize: 13,
                                          color: childActive
                                            ? "white"
                                            : THEME.primary,
                                        }}
                                      />
                                    )}
                                  </div>
                                  <span
                                    className="text-xs font-medium truncate"
                                    style={{
                                      color: childActive ? "white" : "#4b5563",
                                    }}
                                  >
                                    {child.label}
                                  </span>
                                </motion.button>
                              </li>
                            );
                          })}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  )}
                </motion.li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Content */}
        {bottomContent && !isCollapsed && (
          <div className="px-3 pb-2">{bottomContent}</div>
        )}

        {/* Status Section */}
        {/* {statusConfig?.show && (
          <div className="px-3 pb-2">
            <StatusSection config={statusConfig} isCollapsed={isCollapsed} />
          </div>
        )} */}

        {/* User Section */}
        {showUserSection && user && (
          <div className="p-3 border-t border-gray-100">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer ${
                isCollapsed ? "justify-center" : ""
              }`}
              style={{ background: "rgba(37,99,235,0.06)" }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ background: THEME.gradient }}
              >
                {user?.username?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 min-w-0"
                  >
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {user?.username || "User"}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {userRole || "Active"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </motion.aside>

      {/* Main Content */}
      <div
        className="bg-gray-50 transition-all duration-300"
        style={{
          marginLeft: `${sidebarWidth}px`,
          width: `calc(100% - ${sidebarWidth}px)`,
          maxWidth: `calc(100vw - ${sidebarWidth}px)`,
        }}
      >
        <div className="p-4">{useOutlet ? <Outlet /> : children}</div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   StatusSection
───────────────────────────────────────────────── */
const StatusSection = ({ config, isCollapsed }) => {
  const { status, label, sublabel, loading } = config;

  const statusStyles = {
    complete: {
      bg: "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
      border: "1px solid rgba(37,99,235,0.2)",
      iconBg: THEME.gradient,
      shadow: "0 4px 12px rgba(37,99,235,0.3)",
      icon: CheckCircleOutlined,
      color: "#2563EB",
      text: "Connected",
    },
    pending: {
      bg: "linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(251,191,36,0.05) 100%)",
      border: "1px solid rgba(245,158,11,0.2)",
      iconBg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      shadow: "0 4px 12px rgba(245,158,11,0.3)",
      icon: LoadingOutlined,
      color: "#f59e0b",
      text: "Pending",
    },
    error: {
      bg: "#ffffff",
      border: "1px solid rgba(239,68,68,0.25)",
      iconBg: "linear-gradient(135deg, #f87171 0%, #ef4444 100%)",
      shadow: "none",
      icon: ExclamationCircleOutlined,
      color: "#ef4444",
      text: "Setup Required",
    },
  };

  const s = statusStyles[status] || statusStyles.error;
  const StatusIcon = s.icon;

  if (loading) {
    return (
      <div
        className={`p-3 rounded-xl ${isCollapsed ? "flex justify-center" : ""}`}
        style={{ background: "rgba(0,0,0,0.02)" }}
      >
        {isCollapsed ? (
          <Skeleton.Avatar active size="small" shape="circle" />
        ) : (
          <div className="flex items-center gap-3">
            <Skeleton.Avatar active size="small" shape="circle" />
            <div className="flex-1">
              <Skeleton.Input
                active
                size="small"
                style={{ width: 80, height: 14 }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Tooltip title={isCollapsed ? s.text : ""} placement="right">
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={`p-3 rounded-xl cursor-pointer transition-all ${
          isCollapsed ? "flex justify-center" : ""
        }`}
        style={{ background: s.bg, border: s.border }}
      >
        <div
          className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: s.iconBg, boxShadow: s.shadow }}
          >
            <StatusIcon style={{ fontSize: 18, color: "white" }} />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-xs font-bold text-gray-800 truncate">
                  {label || "Status"}
                </p>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      status === "complete" ? "animate-pulse" : ""
                    }`}
                    style={{ background: s.color }}
                  />
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: s.color }}
                  >
                    {s.text}
                  </span>
                </div>
                {sublabel && (
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                    {sublabel}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </Tooltip>
  );
};

export default UnifiedSidebar;
