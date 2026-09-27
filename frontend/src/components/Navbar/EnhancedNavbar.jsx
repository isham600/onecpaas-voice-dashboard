import { useState, useCallback, useEffect, useRef } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faBell,
  faUser,
  faTimes,
  faHome,
  faArrowRight,
  faCog,
  faChevronDown,
  faKeyboard,
  faCheck,
  faExclamationCircle,
  faInfoCircle,
  faSignOutAlt,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

import { Avatar, message, Badge, Input } from "antd";
import { UserOutlined, SearchOutlined, CloseOutlined } from "@ant-design/icons";

import { io as socketIo } from "socket.io-client";
import {
  getProfileMe,
  clearProfileMeCache,
  getNotifications as fetchNotificationsApi,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../../services/api";
import handleApiError from "../../utils/errorHandler";

// Theme colors
const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientHover: "linear-gradient(135deg, #1D4ED8 0%, #060e1a 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

/**
 * Reusable Avatar component with proper null/error fallback
 * Shows user icon when no profile picture is available
 */
const ProfileAvatar = ({
  profileSrc,
  username = "User",
  size = 40,
  showBorder = true,
  onError,
  hasError = false,
}) => {
  const hasValidSrc =
    profileSrc && typeof profileSrc === "string" && profileSrc.trim() !== "";

  const showFallback = hasError || !hasValidSrc;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="relative rounded-full flex-shrink-0"
      style={{
        padding: showBorder ? 2 : 0,
        background: showBorder ? THEME.gradient : "transparent",
      }}
    >
      {showFallback ? (
        <Avatar
          size={size}
          icon={<UserOutlined />}
          style={{
            color: THEME.primary,
            backgroundColor: "white",
            fontSize: Math.max(size / 2.5, 12),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid white",
          }}
        />
      ) : (
        <img
          src={profileSrc}
          alt={`${username}'s Avatar`}
          className="rounded-full object-cover border-2 border-white"
          style={{ width: size, height: size }}
          onError={() => {
            if (onError) onError();
          }}
        />
      )}

      {/* Online indicator - only on larger avatars */}
      {size >= 40 && (
        <div
          className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
          style={{ background: THEME.primary }}
        />
      )}
    </motion.div>
  );
};

/**
 * Small avatar for navbar/header usage
 */
const NavbarAvatar = ({ profileSrc, hasError, size = 32 }) => {
  const hasValidSrc =
    profileSrc && typeof profileSrc === "string" && profileSrc.trim() !== "";

  const showFallback = hasError || !hasValidSrc;

  if (showFallback) {
    return (
      <div
        className="rounded-lg flex items-center justify-center"
        style={{
          width: size,
          height: size,
          background: `rgba(37,99,235,0.12)`,
        }}
      >
        <UserOutlined
          style={{
            color: THEME.primary,
            fontSize: Math.max(size / 2.2, 12),
          }}
        />
      </div>
    );
  }

  return (
    <img
      src={profileSrc}
      alt="User"
      className="rounded-lg object-cover"
      style={{
        width: size,
        height: size,
        border: `2px solid rgba(37,99,235,0.2)`,
      }}
      onError={(e) => {
        e.target.style.display = "none";
      }}
    />
  );
};

/**
 * Enhanced Navbar Component
 */
const EnhancedNavbar = ({
  user,
  setUser,
  menuItems,
  dropdownItems,
  moduleName = "Dashboard",
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userSidebarOpen, setUserSidebarOpen] = useState(false);
  const [impersonating, setImpersonating] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("_impersonating"));
    } catch {
      return null;
    }
  });
  // Initialize as null, not {} — important for falsy checks
  const [profileUser, setProfileUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [resellerLogo, setResellerLogo] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const searchInputRef = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (isMounted.current) {
        setScrolled(window.scrollY > 10);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const storedResellerData = localStorage.getItem("resellerData");
    if (storedResellerData && isMounted.current) {
      try {
        const parsedData = JSON.parse(storedResellerData);
        setResellerLogo(parsedData.logo);
      } catch (error) {
        message.error("Error parsing reseller data:", error);
      }
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        isMounted.current
      ) {
        setDropdownOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target) &&
        isMounted.current
      ) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setSearchOpen((prev) => !prev);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  // closeSearch not needed here — inline state setters are stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExitImpersonation = useCallback(() => {
    const adminToken = localStorage.getItem("_admin_token");
    const adminUser = localStorage.getItem("_admin_user");

    if (adminToken) {
      localStorage.setItem("token", adminToken);
    }
    localStorage.removeItem("_admin_token");
    localStorage.removeItem("_impersonating");

    clearProfileMeCache();
    setImpersonating(null);

    try {
      const parsed = adminUser ? JSON.parse(adminUser) : null;
      if (typeof setUser === "function") setUser(parsed);
    } catch {
      /* ignore */
    }

    localStorage.removeItem("_admin_user");
    navigate("/dashboard");
    message.success("Returned to admin account");
  }, [navigate, setUser]);

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);
  const toggleUserSidebar = useCallback(
    () => setUserSidebarOpen((prev) => !prev),
    [],
  );
  const toggleDropdown = useCallback(
    () => setDropdownOpen((prev) => !prev),
    [],
  );
  const toggleNotifications = useCallback(
    () => setNotificationsOpen((prev) => !prev),
    [],
  );
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

  const toggleSearch = useCallback(() => {
    if (searchOpen) {
      closeSearch();
    } else {
      setSearchOpen(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [searchOpen, closeSearch]);

  // Fetch profile once on mount — no dependency on user object reference to avoid reset loops
  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!user?.username) return;
      setProfileLoading(true);
      try {
        const response = await getProfileMe();
        if (cancelled) return;
        const data = response?.data?.data;
        setProfileData(data || null);
        const pic = data?.profile?.profile_picture;
        if (pic && typeof pic === "string" && pic.trim() !== "") {
          setProfileUser(pic);
          setProfileImageError(false);
        } else {
          setProfileUser(null);
        }
      } catch {
        if (cancelled) return;
        setProfileImageError(true);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };

    loadProfile();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Notifications helpers ──────────────────────────────────────────────────

  const timeAgo = (date) => {
    if (!date) return "";
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const loadNotifications = useCallback(async () => {
    if (!user?.username) return;
    try {
      const res = await fetchNotificationsApi();
      if (isMounted.current) {
        setNotifications(res?.data?.notifications ?? []);
      }
    } catch {
      /* silently ignore — bell stays empty */
    }
  }, [user?.username]);

  // Fetch existing notifications once on mount, then live-update via WebSocket
  useEffect(() => {
    if (!user?.username) return;

    loadNotifications(); // initial HTTP load

    const socket = socketIo(
      import.meta.env.VITE_BASE_URL || "http://localhost:3005",
      { query: { username: user.username }, transports: ["websocket"] },
    );

    socket.on("notification:new", (notif) => {
      if (isMounted.current) {
        setNotifications((prev) => [notif, ...prev]);
      }
    });

    return () => { socket.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username]);

  const handleMarkOneRead = useCallback(async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)),
      );
    } catch { /* ignore */ }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch { /* ignore */ }
  }, []);

  const handleDeleteNotification = useCallback(async (e, id) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch { /* ignore */ }
  }, []);

  const handleMenuItemClick = useCallback(
    (path) => {
      navigate(path);
      setSidebarOpen(false);
    },
    [navigate],
  );

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      // Skip API call - just clear local data
      clearProfileMeCache();
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      // Clear any leftover impersonation state so the next login on this
      // browser doesn't inherit a stale "viewing as X" badge in the navbar.
      localStorage.removeItem("_admin_token");
      localStorage.removeItem("_admin_user");
      localStorage.removeItem("_impersonating");
      setImpersonating(null);

      if (typeof setUser === "function") {
        setUser(null);
      }

      navigate("/", { replace: true });

      if (isMounted.current) {
        message.success({
          content: "Logged out successfully",
          key: "logoutMessage",
          duration: 3,
        });
        setIsLoggingOut(false);
      } else {
        message.destroy("logoutMessage");
      }
    } catch {
      // Still proceed with logout even if there's an error
      clearProfileMeCache();
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("_admin_token");
      localStorage.removeItem("_admin_user");
      localStorage.removeItem("_impersonating");
      setImpersonating(null);

      if (typeof setUser === "function") {
        setUser(null);
      }

      navigate("/", { replace: true });
      setIsLoggingOut(false);
    }
  }, [navigate, setUser, isLoggingOut]);

  const renderBreadcrumb = useCallback(() => {
    const paths = location.pathname.split("/").filter(Boolean);
    return (
      <nav
        className="text-sm font-medium text-gray-500"
        aria-label="Breadcrumb"
      >
        <ol className="list-none p-0 inline-flex items-center">
          <li className="flex items-center">
            <Link
              to="/dashboard"
              className="text-gray-600 hover:text-[#2563EB] transition-colors flex items-center"
            >
              <FontAwesomeIcon
                icon={faHome}
                className="mr-1"
                style={{ color: THEME.primary }}
              />
              <span className="font-bold">Dashboard</span>
            </Link>
          </li>
          {paths.slice(1).map((path, index) => (
            <li key={path} className="flex items-center">
              <FontAwesomeIcon
                icon={faArrowRight}
                className="mx-2 text-gray-400 text-xs"
              />
              <Link
                to={`/${paths.slice(0, index + 2).join("/")}`}
                className={`capitalize text-gray-600 hover:text-[#2563EB] transition-colors ${
                  index === paths.length - 2 ? "font-bold" : ""
                }`}
                style={
                  index === paths.length - 2 ? { color: THEME.primary } : {}
                }
              >
                {path.replace(/-/g, " ")}
              </Link>
            </li>
          ))}
        </ol>
      </nav>
    );
  }, [location.pathname]);

  // Sidebar menu item
  const SidebarMenuItem = ({ item, index }) => {
    const isActive = item.activeMatch
      ? item.activeMatch(location.pathname)
      : location.pathname === item.path;
    return (
      <motion.li
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <motion.button
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleMenuItemClick(item.path)}
          className="flex items-center w-full px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200 group"
          style={{
            background: isActive ? THEME.gradient : "transparent",
            color: isActive ? "white" : "#374151",
            boxShadow: isActive ? "0 4px 12px rgba(37,99,235,0.3)" : "none",
          }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center mr-3 transition-all"
            style={{
              background: isActive
                ? "rgba(255,255,255,0.2)"
                : `${THEME.primary}10`,
            }}
          >
            {item.icon && typeof item.icon === "string" ? (
              <i
                className={`fas fa-${item.icon} text-base`}
                style={{ color: isActive ? "white" : THEME.primary }}
              />
            ) : (
              <FontAwesomeIcon
                icon={item.icon}
                className="text-base"
                style={{ color: isActive ? "white" : THEME.primary }}
              />
            )}
          </div>
          <span className="flex-1 text-left">{item.name}</span>
          <FontAwesomeIcon
            icon={faChevronRight}
            className={`text-xs transition-all ${
              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50"
            }`}
            style={{ color: isActive ? "white" : "#9ca3af" }}
          />
        </motion.button>
      </motion.li>
    );
  };

  // Desktop menu item
  const MenuItem = ({ item }) => {
    const isActive = item.activeMatch
      ? item.activeMatch(location.pathname)
      : location.pathname === item.path;
    return (
      <motion.li whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <button
          onClick={() => handleMenuItemClick(item.path)}
          className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200"
          style={{
            background: isActive ? THEME.gradientLight : "transparent",
            color: isActive ? THEME.primary : "#374151",
            border: isActive
              ? "1px solid rgba(37,99,235,0.2)"
              : "1px solid transparent",
          }}
        >
          {item.icon && typeof item.icon === "string" ? (
            <i
              className={`fas fa-${item.icon} mr-3 text-lg`}
              style={{ color: isActive ? THEME.primary : "#6b7280" }}
            />
          ) : (
            <FontAwesomeIcon
              icon={item.icon}
              className="mr-3 text-lg"
              style={{ color: isActive ? THEME.primary : "#6b7280" }}
            />
          )}
          <span>{item.name}</span>
          {isActive && (
            <div
              className="ml-auto w-2 h-2 rounded-full"
              style={{ background: THEME.primary }}
            />
          )}
        </button>
      </motion.li>
    );
  };

  const getSettingsLink = useCallback(() => {
    const basePath = location.pathname.split("/")[1];
    return `/${basePath}/userprofile/settings`;
  }, [location.pathname]);

  // Helper to get display name
  const displayName =
    profileData?.user?.username ||
    user?.username ||
    "User";
  const displayEmail = profileData?.user?.email || user?.email || "—";
  const displayPhone = profileData?.user?.mobile_no || user?.mobile_no || null;

  return (
    <div className="flex flex-col bg-gray-50">
      {/* ==================== TOP NAVIGATION BAR ==================== */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ease-out
        ${scrolled ? "py-2 backdrop-blur-xl" : "py-3 backdrop-blur-sm"}`}
        style={{
          background: scrolled ? "rgba(255,255,255,0.98)" : "#ffffff",
          borderBottom: "1px solid rgba(37,99,235,0.12)",
          boxShadow: scrolled
            ? "0 4px 24px rgba(37,99,235,0.08)"
            : "0 1px 4px rgba(37,99,235,0.06)",
        }}
      >
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Mobile menu toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleSidebar}
              className="lg:hidden p-2.5 rounded-xl text-gray-600 hover:text-[#2563EB] transition-colors"
              style={{ background: "rgba(37,99,235,0.08)" }}
              aria-label="Open menu"
            >
              <FontAwesomeIcon icon={faBars} className="text-lg" />
            </motion.button>

            {/* Logo */}
            <div className="flex-shrink-0">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2"
              >
                {resellerLogo ? (
                  <img
                    src={resellerLogo}
                    alt="Logo"
                    className="h-10 w-auto object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{
                        background: THEME.gradient,
                        boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                      >
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-lg font-bold text-gray-900 tracking-tight">
                        Admin
                      </span>
                      <span
                        className="text-xs font-medium tracking-wide"
                        style={{ color: THEME.primary }}
                      >
                        {moduleName}
                      </span>
                    </div>
                  </div>
                )}
              </motion.button>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {menuItems.map((item) => {
                const isActive = item.activeMatch
                  ? item.activeMatch(location.pathname)
                  : location.pathname === item.path;
                return (
                  <motion.button
                    key={item.name}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleMenuItemClick(item.path)}
                    className="flex items-center text-sm font-medium transition-all py-2 px-4 rounded-xl relative group"
                    style={{
                      color: isActive ? THEME.primary : "#4b5563",
                      background: isActive
                        ? "rgba(37,99,235,0.08)"
                        : "transparent",
                      fontWeight: isActive ? 600 : 500,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive)
                        e.currentTarget.style.background =
                          "rgba(37,99,235,0.05)";
                      if (!isActive)
                        e.currentTarget.style.color = THEME.primary;
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        e.currentTarget.style.background = "transparent";
                      if (!isActive) e.currentTarget.style.color = "#4b5563";
                    }}
                  >
                    {item.icon && typeof item.icon === "string" ? (
                      <i
                        className={`fas fa-${item.icon} mr-2`}
                        style={{ color: isActive ? THEME.primary : "#6b7280" }}
                      />
                    ) : (
                      <FontAwesomeIcon
                        icon={item.icon}
                        className="mr-2"
                        style={{ color: isActive ? THEME.primary : "#6b7280" }}
                      />
                    )}
                    {item.name}
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute -bottom-px left-3 right-3 h-0.5 rounded-full"
                        style={{ background: THEME.primary }}
                      />
                    )}
                  </motion.button>
                );
              })}

              {/* More dropdown */}
              {dropdownItems && dropdownItems.length > 0 && (
                <div className="relative" ref={dropdownRef}>
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={toggleDropdown}
                    className="flex items-center text-sm font-medium text-gray-600 hover:text-[#2563EB] py-2 px-4 rounded-xl transition-colors"
                  >
                    <span>More</span>
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className={`ml-1.5 text-xs transition-transform ${
                        dropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </motion.button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 py-2 overflow-hidden"
                        style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.1)" }}
                      >
                        {dropdownItems.map((item) => (
                          <motion.button
                            key={item.name}
                            whileHover={{ x: 4 }}
                            onClick={() => {
                              handleMenuItemClick(item.path);
                              setDropdownOpen(false);
                            }}
                            className="flex items-center w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-[rgba(37,99,235,0.06)] transition-colors"
                          >
                            {item.icon && typeof item.icon === "string" ? (
                              <i
                                className={`fas fa-${item.icon} mr-3`}
                                style={{ color: THEME.primary }}
                              />
                            ) : (
                              <FontAwesomeIcon
                                icon={item.icon}
                                className="mr-3"
                                style={{ color: THEME.primary }}
                              />
                            )}
                            {item.name}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </nav>

            {/* Right side icons */}
            <div className="flex items-center space-x-2">
              {/* Impersonation indicator (replaces top banner) */}
              {impersonating && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleExitImpersonation}
                  className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(180,83,9,0.14) 0%, rgba(146,64,14,0.14) 100%)",
                    border: "1px solid rgba(180,83,9,0.25)",
                    color: "#92400e",
                  }}
                  title={`Viewing as ${impersonating.name || impersonating.username}`}
                  aria-label="Exit impersonation"
                >
                  <span className="truncate max-w-[160px] font-bold">
                    {impersonating.username}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg"
                    style={{
                      background: "rgba(146,64,14,0.18)",
                      color: "#92400e",
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faSignOutAlt}
                      className="text-[10px]"
                    />
                    Exit
                  </span>
                </motion.button>
              )}

              {/* Search Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleSearch}
                className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl text-gray-500 hover:text-[#2563EB] transition-colors"
                style={{
                  background: "rgba(37,99,235,0.06)",
                  border: "1px solid rgba(37,99,235,0.1)",
                }}
                aria-label="Search"
              >
                <SearchOutlined className="text-sm" />
                <span className="text-xs text-gray-400">Search...</span>
                <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 rounded">
                  <FontAwesomeIcon icon={faKeyboard} className="text-[8px]" />
                  <span>K</span>
                </kbd>
              </motion.button>

              {/* Notification Button */}
              <div className="relative" ref={notificationRef}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleNotifications}
                  className="relative p-2.5 rounded-xl text-gray-500 hover:text-[#2563EB] transition-colors"
                  style={{ background: "rgba(37,99,235,0.06)" }}
                  aria-label="Notifications"
                >
                  <FontAwesomeIcon icon={faBell} className="text-lg" />
                  {notifications.filter((n) => n.is_read === 0).length > 0 && (
                    <span
                      className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ background: THEME.primary }}
                    >
                      {notifications.filter((n) => n.is_read === 0).length}
                    </span>
                  )}
                </motion.button>

                {/* Notifications Dropdown */}
                <AnimatePresence>
                  {notificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                      style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
                    >
                      <div
                        className="px-4 py-3 flex items-center justify-between"
                        style={{
                          background: THEME.gradientLight,
                          borderBottom: "1px solid rgba(37,99,235,0.1)",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ background: THEME.gradient }}
                          >
                            <FontAwesomeIcon
                              icon={faBell}
                              className="text-white text-xs"
                            />
                          </div>
                          <span className="font-bold text-gray-800">
                            Notifications
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            count={notifications.filter((n) => n.is_read === 0).length}
                            style={{ backgroundColor: THEME.primary }}
                          />
                          {notifications.some((n) => n.is_read === 0) && (
                            <button
                              onClick={handleMarkAllRead}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-lg transition-colors"
                              style={{ color: THEME.primary, background: "rgba(37,99,235,0.1)" }}
                            >
                              Mark all read
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((notif, index) => (
                            <motion.div
                              key={notif.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              onClick={() => notif.is_read === 0 && handleMarkOneRead(notif.id)}
                              className={`px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                                notif.is_read === 0 ? "bg-blue-50/40" : ""
                              }`}
                              style={{
                                borderBottom: "1px solid rgba(0,0,0,0.04)",
                              }}
                            >
                              <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{
                                  background:
                                    notif.type === "success"
                                      ? "rgba(16,185,129,0.1)"
                                      : notif.type === "warning"
                                        ? "rgba(245,158,11,0.1)"
                                        : notif.type === "error"
                                          ? "rgba(239,68,68,0.1)"
                                          : "rgba(37,99,235,0.1)",
                                }}
                              >
                                <FontAwesomeIcon
                                  icon={
                                    notif.type === "success"
                                      ? faCheck
                                      : notif.type === "warning"
                                        ? faExclamationCircle
                                        : faInfoCircle
                                  }
                                  style={{
                                    color:
                                      notif.type === "success"
                                        ? "#10b981"
                                        : notif.type === "warning"
                                          ? "#f59e0b"
                                          : notif.type === "error"
                                            ? "#ef4444"
                                            : THEME.primary,
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">
                                  {notif.title}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {notif.message}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-1">
                                  {timeAgo(notif.created_at)}
                                </p>
                              </div>
                              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                {notif.is_read === 0 && (
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ background: THEME.primary }}
                                  />
                                )}
                                <button
                                  onClick={(e) => handleDeleteNotification(e, notif.id)}
                                  className="text-gray-300 hover:text-red-400 transition-colors text-xs leading-none"
                                  title="Dismiss"
                                >
                                  ×
                                </button>
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center">
                            <FontAwesomeIcon
                              icon={faBell}
                              className="text-3xl text-gray-300 mb-2"
                            />
                            <p className="text-sm text-gray-500">
                              No notifications
                            </p>
                          </div>
                        )}
                      </div>

                      <div
                        className="px-4 py-2.5 flex items-center justify-between"
                        style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
                      >
                        <button
                          onClick={loadNotifications}
                          className="text-xs font-medium transition-colors"
                          style={{ color: THEME.primary }}
                        >
                          Refresh
                        </button>
                        {notifications.length > 0 && (
                          <button
                            onClick={() => {
                              setNotifications([]);
                              notifications.forEach((n) => deleteNotification(n.id).catch(() => {}));
                            }}
                            className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ===== USER MENU BUTTON (FIXED AVATAR) ===== */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleUserSidebar}
                className="relative flex items-center gap-2 p-1.5 pr-3 rounded-xl transition-colors"
                style={{ background: "rgba(37,99,235,0.06)" }}
                aria-label="User menu"
              >
                <NavbarAvatar
                  profileSrc={profileUser}
                  hasError={profileImageError}
                  size={28}
                />
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  {displayName}
                </span>
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className="text-[10px] text-gray-400"
                />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Breadcrumb */}
        <div
          className="mt-2"
          style={{ borderTop: "1px solid rgba(37,99,235,0.08)" }}
        >
          <div className="max-w-screen-2xl mx-auto px-8 py-2">
            {renderBreadcrumb()}
          </div>
        </div>
      </header>

      {/* ==================== SEARCH MODAL ==================== */}
      <AnimatePresence>
        {searchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]"
              onClick={closeSearch}
            />

            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{
                duration: 0.2,
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
              className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-xl z-[90]"
            >
              <div
                className="bg-white rounded-2xl shadow-2xl overflow-hidden mx-4"
                style={{ boxShadow: "0 25px 80px rgba(0,0,0,0.25)" }}
              >
                <div
                  className="flex items-center gap-3 px-4 py-4"
                  style={{ borderBottom: "1px solid rgba(37,99,235,0.1)" }}
                >
                  <SearchOutlined
                    className="text-xl"
                    style={{ color: THEME.primary }}
                  />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search broadcasts, templates, settings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") closeSearch(); }}
                    className="flex-1 border-none shadow-none text-base focus:ring-0"
                    style={{ outline: "none", boxShadow: "none" }}
                    autoFocus
                  />
                  <kbd className="px-2 py-1 text-xs font-medium text-gray-400 bg-gray-100 rounded">
                    ESC
                  </kbd>
                </div>

                <div className="p-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
                    Quick Links
                  </p>
                  <div className="space-y-1">
                    {[
                      {
                        name: "New Broadcast",
                        path: "/dashboard/voice/broadcast",
                        icon: faArrowRight,
                      },
                      {
                        name: "Reports",
                        path: "/dashboard/management/reports",
                        icon: faArrowRight,
                      },
                      {
                        name: "Settings",
                        path: "/dashboard/userprofile/settings",
                        icon: faCog,
                      },
                    ]
                      .filter(
                        (item) =>
                          searchQuery === "" ||
                          item.name
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()),
                      )
                      .map((item, index) => (
                        <motion.button
                          key={item.name}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => {
                            navigate(item.path);
                            closeSearch();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-[rgba(37,99,235,0.06)] transition-colors group"
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: "rgba(37,99,235,0.1)" }}
                          >
                            <FontAwesomeIcon
                              icon={item.icon}
                              className="text-sm"
                              style={{ color: THEME.primary }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 group-hover:text-[#2563EB] transition-colors">
                            {item.name}
                          </span>
                          <FontAwesomeIcon
                            icon={faArrowRight}
                            className="ml-auto text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </motion.button>
                      ))}
                  </div>
                </div>

                <div
                  className="px-4 py-3 flex items-center justify-between"
                  style={{
                    background: "rgba(37,99,235,0.03)",
                    borderTop: "1px solid rgba(37,99,235,0.08)",
                  }}
                >
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">
                        ↑↓
                      </kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">
                        ↵
                      </kbd>
                      Select
                    </span>
                  </div>
                  <button
                    onClick={closeSearch}
                    className="text-xs font-medium flex items-center gap-1"
                    style={{ color: THEME.primary }}
                  >
                    <CloseOutlined className="text-[10px]" />
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ==================== MAIN CONTENT ==================== */}
      <main className="flex-grow pt-28 bg-gray-50">
        <Outlet />
      </main>

      {/* ==================== MOBILE SIDEBAR ==================== */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
              onClick={toggleSidebar}
            />

            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 w-full max-w-sm bg-white shadow-2xl z-[70] flex flex-col"
              style={{
                background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    navigate("/dashboard");
                    setSidebarOpen(false);
                  }}
                  className="flex items-center gap-3"
                >
                  {resellerLogo ? (
                    <img
                      src={resellerLogo}
                      alt="Logo"
                      className="h-12 w-auto"
                    />
                  ) : (
                    <>
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
                        style={{ background: THEME.gradient }}
                      >
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="2.5"
                        >
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="text-xl font-extrabold tracking-tight text-gray-900">
                          Admin
                        </div>
                        <div
                          className="text-xs font-medium"
                          style={{ color: THEME.primary }}
                        >
                          {moduleName}
                        </div>
                      </div>
                    </>
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleSidebar}
                  className="p-3 rounded-xl text-gray-500 hover:text-[#2563EB] transition-colors"
                  style={{ background: "rgba(37,99,235,0.08)" }}
                >
                  <FontAwesomeIcon icon={faTimes} className="text-lg" />
                </motion.button>
              </div>

              {/* Navigation */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
                  Main Menu
                </p>
                <ul className="space-y-1.5">
                  {menuItems.map((item) => (
                    <MenuItem key={item.name} item={item} />
                  ))}
                </ul>

                {dropdownItems && dropdownItems.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
                      More
                    </p>
                    <ul className="space-y-1.5">
                      {dropdownItems.map((item) => (
                        <MenuItem key={item.name} item={item} />
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Footer - Clickable user card with proper avatar */}
              <div className="px-6 pb-6">
                <button
                  onClick={() => {
                    setSidebarOpen(false);
                    setUserSidebarOpen(true);
                  }}
                  className="flex items-center gap-4 w-full p-4 rounded-2xl hover:bg-gray-50 transition-colors"
                  style={{
                    background: THEME.gradientLight,
                    border: "1px solid rgba(37,99,235,0.1)",
                  }}
                >
                  <ProfileAvatar
                    profileSrc={profileUser}
                    username={displayName}
                    size={46}
                    hasError={profileImageError}
                    onError={() => setProfileImageError(true)}
                  />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {displayEmail}
                    </p>
                  </div>
                  <FontAwesomeIcon
                    icon={faChevronRight}
                    className="text-gray-400 text-sm"
                  />
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ==================== USER PROFILE SIDEBAR ==================== */}
      <AnimatePresence>
        {userSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
              onClick={toggleUserSidebar}
            />

            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-[70] flex flex-col"
              style={{
                background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
              }}
            >
              <div className="p-8 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: THEME.gradient }}
                    >
                      <FontAwesomeIcon icon={faUser} className="text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Profile</h2>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleUserSidebar}
                    className="p-3 rounded-xl text-gray-500 hover:text-[#2563EB] transition-colors"
                    style={{ background: "rgba(37,99,235,0.08)" }}
                  >
                    <FontAwesomeIcon icon={faTimes} className="text-lg" />
                  </motion.button>
                </div>

                {/* Profile Card with proper avatar fallback */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 p-6 rounded-2xl text-center"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(29,78,216,0.03) 100%)",
                    border: "1px solid rgba(37,99,235,0.15)",
                  }}
                >
                  <div className="flex justify-center mb-4">
                    <ProfileAvatar
                      profileSrc={profileUser}
                      username={displayName}
                      size={96}
                      showBorder={true}
                      hasError={profileImageError}
                      onError={() => setProfileImageError(true)}
                    />
                  </div>

                  <h3 className="text-xl font-bold text-gray-900">
                    {displayName}
                  </h3>

                  {profileLoading ? (
                    <div className="mt-2 space-y-1.5 flex flex-col items-center">
                      <div className="h-3.5 w-44 rounded-full bg-gray-200 animate-pulse" />
                      <div className="h-3 w-32 rounded-full bg-gray-200 animate-pulse" />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500 mt-1">
                        {displayEmail}
                      </p>
                      {displayPhone && (
                        <p className="text-sm text-gray-400 mt-0.5">
                          +{displayPhone}
                        </p>
                      )}
                    </>
                  )}

                  <div className="flex items-center justify-center gap-2 mt-4">
                    <div
                      className="w-2.5 h-2.5 rounded-full animate-pulse"
                      style={{ background: THEME.primary }}
                    />
                    <span
                      className="text-sm font-medium"
                      style={{ color: THEME.primary }}
                    >
                      Online
                    </span>
                  </div>
                </motion.div>

                {/* Actions */}
                <div className="space-y-3 mt-auto">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      navigate(getSettingsLink());
                      toggleUserSidebar();
                    }}
                    className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl text-sm font-medium text-gray-700 transition-all"
                    style={{
                      background: "rgba(37,99,235,0.08)",
                      border: "1px solid rgba(37,99,235,0.15)",
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faCog}
                      style={{ color: THEME.primary }}
                    />
                    Settings
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      toggleUserSidebar();
                      setTimeout(() => handleLogout(), 150);
                    }}
                    disabled={isLoggingOut}
                    className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-75"
                    style={{
                      background: THEME.gradient,
                      boxShadow: "0 4px 20px rgba(37,99,235,0.3)",
                    }}
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} />
                    {isLoggingOut ? "Signing out..." : "Sign out"}
                  </motion.button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedNavbar;
