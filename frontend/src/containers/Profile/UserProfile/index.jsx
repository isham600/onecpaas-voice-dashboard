import { useState, Suspense, lazy, useEffect } from "react";
import { Spin, message } from "antd";
import {
  UserOutlined,
  HistoryOutlined,
  CreditCardOutlined,
  MessageOutlined,
  MobileOutlined,
  AudioOutlined,
  BgColorsOutlined,
  BellOutlined,
  SettingOutlined,
  ApiOutlined,
  LoginOutlined,
  SafetyCertificateOutlined,
  ContactsOutlined,
  ShopOutlined,
  UnorderedListOutlined,
  FormOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

import DashboardNavbar from "../../../components/Navbar/DashboardNavbar";
import UnifiedSidebar from "../../../components/Layout/UnifiedSidebar";
import WhiteLabelOptions from "../ResellerSettings/WhiteLabelOptions/index";
import NotificationsAlerts from "../ResellerSettings/NotificationsAlerts/index";
import Voice from "../YourIntegration/Voice/index";
import PaymentIntegration from "../YourIntegration/Payment integration/PaymentIntegration";
import handleApiError from "../../../utils/errorHandler";
import { getProfileMe } from "../../../services/api";

const Credentials = lazy(() => import("../LoginIntegration/Credentials"));
const BasicInfo = lazy(() => import("../LoginIntegration/BasicInfo"));
const ContactInfo = lazy(() => import("../LoginIntegration/ContactInfo"));
const BusinessDetails = lazy(() => import("../LoginIntegration/BusinessDetails"));
const AdditionalFields = lazy(() => import("../LoginIntegration/AdditionalFields"));
const LoginHistory = lazy(() => import("../LoginIntegration/LoginHistory"));

const THEME = {
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
};

const buildItemMeta = (user, setUser, permission, data) => ({
  credentials: {
    label: "Profile",
    description: "Your account profile",
    icon: UserOutlined,
    component: (
      <Credentials
        data={data.credentials}
        setData={data.setCredentials}
        user={user}
        setUser={setUser}
      />
    ),
  },
  basicinfo: {
    label: "Basic Information",
    description: "Your personal details",
    icon: UserOutlined,
    component: (
      <BasicInfo data={data.basicInfo} setData={data.setBasicInfo} user={user} />
    ),
  },
  contactinfo: {
    label: "Contact Information",
    description: "Phone, email and address",
    icon: ContactsOutlined,
    component: (
      <ContactInfo
        data={data.contactInfo}
        setData={data.setContactInfo}
        user={user}
      />
    ),
  },
  businessdetails: {
    label: "Business Details",
    description: "Company and business info",
    icon: ShopOutlined,
    component: (
      <BusinessDetails
        data={data.businessDetails}
        setData={data.setBusinessDetails}
        user={user}
      />
    ),
  },
  additionalfields: {
    label: "Additional Fields",
    description: "Custom profile fields",
    icon: FormOutlined,
    component: (
      <AdditionalFields
        data={data.additionalFields}
        setData={data.setAdditionalFields}
        user={user}
      />
    ),
  },
  loginhistory: {
    label: "Login History",
    description: "Recent login activity",
    icon: HistoryOutlined,
    component: <LoginHistory />,
  },
  paymentgateway: {
    label: "Payment Integration",
    description: "Connect payment gateways",
    icon: CreditCardOutlined,
    component: <PaymentIntegration username={user?.username} />,
  },
  voice: {
    label: "Voice",
    description: "Voice call integration",
    icon: AudioOutlined,
    component: <Voice />,
  },
  whitelabeloptions: {
    label: "White Label Options",
    description: "Branding and customization",
    icon: BgColorsOutlined,
    component: <WhiteLabelOptions user={user} permission={permission} />,
  },
  notificationsalerts: {
    label: "Notification Alert",
    description: "Alert and notification settings",
    icon: BellOutlined,
    component: <NotificationsAlerts />,
  },
});

const buildMenuItems = (activeKey, setActive, permission, meta) => {
  const child = (key) => ({
    key,
    label: meta[key].label,
    icon: meta[key].icon,
    isActive: activeKey === key,
    onClick: () => setActive(key),
  });

  const items = [
    {
      key: "loginintegration",
      label: "Login Integration",
      description: "Account & credentials",
      icon: LoginOutlined,
      defaultExpanded: true,
      children: [
        // child("credentials"),
        // child("basicinfo"),
        // child("contactinfo"),
        // child("businessdetails"),
        // child("additionalfields"),
        child("loginhistory"),
      ],
    },
  ];

  // if (permission?.your_integration === 1) {
  //   items.push({
  //     key: "yourintegration",
  //     label: "Your Integration",
  //     description: "Connected services",
  //     icon: ApiOutlined,
  //     defaultExpanded: true,
  //     children: [
  //       child("paymentgateway"),
  //       child("officialwhatsapp"),
  //       child("sms"),
  //       child("voice"),
  //     ],
  //   });
  // }

  if (permission?.reseller_setting === 1) {
    items.push({
      key: "resellersettings",
      label: "Reseller Settings",
      description: "Reseller configuration",
      icon: SettingOutlined,
      defaultExpanded: true,
      children: [
        child("whitelabeloptions"),
        child("notificationsalerts"),
      ],
    });
  }

  return items;
};

const UserProfile = ({ user, setUser }) => {
  const [activeSubSection, setActiveSubSection] = useState("credentials");
  const [permission, setPermission] = useState({});

  const [credentialsData, setCredentialsData] = useState({});
  const [basicInfoData, setBasicInfoData] = useState({});
  const [contactInfoData, setContactInfoData] = useState({});
  const [businessDetailsData, setBusinessDetailsData] = useState({});
  const [additionalFieldsData, setAdditionalFieldsData] = useState({});

  message.config({ top: 70, duration: 3, maxCount: 3 });

  useEffect(() => {
    getProfileMe()
      .then((res) => setPermission(res?.data?.data?.permissions || {}))
      .catch(handleApiError);
  }, []);

  const meta = buildItemMeta(user, setUser, permission, {
    credentials: credentialsData,
    setCredentials: setCredentialsData,
    basicInfo: basicInfoData,
    setBasicInfo: setBasicInfoData,
    contactInfo: contactInfoData,
    setContactInfo: setContactInfoData,
    businessDetails: businessDetailsData,
    setBusinessDetails: setBusinessDetailsData,
    additionalFields: additionalFieldsData,
    setAdditionalFields: setAdditionalFieldsData,
  });

  const menuItems = buildMenuItems(
    activeSubSection,
    setActiveSubSection,
    permission,
    meta,
  );
  const currentItem = meta[activeSubSection];
  const CurrentIcon = currentItem?.icon;

  return (
    <UnifiedSidebar
      user={user}
      menuItems={menuItems}
      title="Account Settings"
      titleIcon={UserOutlined}
      showUserSection={true}
      useOutlet={false}
    >
      <div className="-m-4 min-h-screen" style={{ background: "#F8F9FB" }}>
        <DashboardNavbar user={user} setUser={setUser} />

        <div className="px-6 pb-8">
          <motion.div
            key={`hdr-${activeSubSection}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mb-5 rounded-2xl border border-gray-100 px-6 py-5 flex items-center gap-4"
            style={{
              background: "linear-gradient(135deg, #f5f6ff 0%, #eef0ff 100%)",
              boxShadow: "0 1px 8px rgba(37,99,235,0.06)",
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: THEME.gradient,
                boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
              }}
            >
              {CurrentIcon && (
                <CurrentIcon style={{ color: "#fff", fontSize: 22 }} />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight mb-0">
                {currentItem?.label || "Settings"}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {currentItem?.description || ""}
              </p>
            </div>
          </motion.div>

          <motion.div
            key={`cnt-${activeSubSection}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="bg-white rounded-2xl border border-gray-100 p-6"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
          >
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center py-16">
                  <Spin size="large" />
                  <p className="mt-4 text-sm text-gray-400">Loading...</p>
                </div>
              }
            >
              {currentItem?.component}
            </Suspense>
          </motion.div>
        </div>
      </div>
    </UnifiedSidebar>
  );
};

export default UserProfile;
