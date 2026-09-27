import { lazy, Suspense, useEffect, useContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { ConfigProvider } from "antd";

// Always eager — these must be ready before any route renders
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute/index.jsx";
import VersionCheckBanner from "./components/VersionCheckBanner";

// Permission-gated route — redirects to /dashboard when the user lacks a permission key
const ChannelRoute = ({ permissionKey, user }) => {
  const perms = user?.permissions || {};
  return perms[permissionKey] > 0 ? <Outlet /> : <Navigate to="/dashboard" replace />;
};
import SessionExpiredModal from "./components/Modal/SessionExpiredModal.jsx";
import Loader from "./components/Loader";
import ChannelDashboardSkeleton from "./components/Layout/ChannelDashboardSkeleton.jsx";
import { AppContext } from "../src/utils/Context.jsx";

import "@fontsource/mulish/400.css";
import "@fontsource/mulish/600.css";
import "@fontsource/mulish/700.css";

// ─── Lazy page/container imports ─────────────────────────────────────────────
const Home = lazy(() => import("./pages/Home"));
const DashboardPage = lazy(() => import("./pages/dashboard"));
const DirectSupport = lazy(() => import("./components/DirectSupport/index"));
const UserProfile = lazy(() => import("./containers/Profile/UserProfile"));
const UnderDevelopment = lazy(
  () => import("./components/UnderDevelopment/UnderDevelopment.jsx"),
);
const FileManager = lazy(
  () => import("./containers/FileManagerContainer/index.jsx"),
);
const ProfileSettings = lazy(
  () => import("./containers/ProfileSetting/index.jsx"),
);

const SidebarLayoutVoice = lazy(() => import("./containers/Voice/index.jsx"));

const BroadcastVoice = lazy(
  () => import("./containers/Voice/Broadcastvoice.jsx"),
);
const VoiceDashboard = lazy(
  () => import("./containers/Voice/VoiceDashboard.jsx"),
);

const VoiceNavbar = lazy(() => import("./components/Navbar/VoiceNavbar.jsx"));
const DashboardNavbar = lazy(
  () => import("./components/Navbar/DashboardNavbar.jsx"),
);

const TransactionLog = lazy(() => import("./containers/TransactionLogs"));
const ContactTable = lazy(
  () => import("./containers/Contacts/ContactTable.jsx"),
);
const GroupList = lazy(() => import("./containers/Contacts"));
const IvrList = lazy(() => import("./containers/Voice/Ivr/IvrList.jsx"));
const IvrBuilderPage = lazy(() => import("./containers/Voice/Ivr/IvrBuilderPage.jsx"));
const Clients = lazy(() => import("./containers/ManageClients/Clients.jsx"));
const InvoiceList = lazy(() => import("./components/Invoice/InvoiceList"));
const AddInvoice = lazy(() => import("./components/Invoice/AddInvoice"));

const Management = lazy(() => import("./containers/ManageClients/index.jsx"));
const ClientTree = lazy(() => import("./containers/ManageClients/ClientTree.jsx"));
const CallFallbackNotify = lazy(() => import("./containers/ManageClients/CallFallbackNotify.jsx"));
const VoiceRoutes = lazy(() => import("./containers/ManageClients/VoiceRoutes.jsx"));

const SidebarLayoutNumber = lazy(() => import("./containers/Number/index.jsx"));
const NumberBuyInbox = lazy(() => import("./containers/Number/BuyNumber.jsx"));
const ActiveNumberInbox = lazy(
  () => import("./containers/Number/ActiveNumber.jsx"),
);

const Support = lazy(() => import("./containers/Support"));
const ApiDocs = lazy(() => import("./containers/ApiDocs"));
const PaymentSuccess = lazy(
  () => import("./containers/Add Funds/PaymentSuccess.jsx"),
);
const PaymentFailed = lazy(
  () => import("./containers/Add Funds/PaymentFailed.jsx"),
);

const AdminUtilities = lazy(
  () => import("./containers/AdminUtilities/AdminUtilities.jsx"),
);

const Webhook = lazy(() => import("./containers/Webhooks/Webhook.jsx"));
const VoiceOverview = lazy(
  () => import("./components/Voice/VoiceOverview.jsx"),
);

const IndexReportVoice = lazy(
  () => import("./containers/Reports/voice/IndexReportVoice.jsx"),
);
const ReportVoiceCampaign = lazy(
  () => import("./containers/Reports/voice/ReportVoiceCampaign.jsx"),
);
const ReportVoiceUsage = lazy(
  () => import("./containers/Reports/voice/ReportVoiceUsage.jsx"),
);
const ReportVoiceLive = lazy(
  () => import("./containers/Reports/voice/ReportVoiceLive.jsx"),
);
const ReportVoiceLog = lazy(
  () => import("./containers/Reports/voice/ReportVoiceLog.jsx"),
);

// ─────────────────────────────────────────────────────────────────────────────

const validateToken = () => !!localStorage.getItem("token");

const App = () => {
  const { user, updateUser } = useContext(AppContext);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser && validateToken()) {
        updateUser(JSON.parse(storedUser));
      } else {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("_admin_token");
        localStorage.removeItem("_admin_user");
        localStorage.removeItem("_impersonating");
      }
    } catch {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("_admin_token");
      localStorage.removeItem("_admin_user");
      localStorage.removeItem("_impersonating");
    }
  }, []);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#4F46E5",
          colorInfo: "#4F46E5",
          fontFamily: "'Mulish', sans-serif",
        },
      }}
    >
      <VersionCheckBanner />
      <SessionExpiredModal />

      <ErrorBoundary>
        <Router>
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route
                path="/"
                element={
                  user ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <Home setUser={updateUser} />
                  )
                }
              />

              <Route element={<ProtectedRoute />}>
                <Route
                  path="/dashboard"
                  element={<DashboardPage user={user} setUser={updateUser} />}
                />

                {/* Voice */}
                <Route
                  path="/dashboard/voice"
                  element={<VoiceNavbar user={user} setUser={updateUser} />}
                >
                  <Route
                    path="/dashboard/voice"
                    element={<SidebarLayoutVoice user={user} />}
                  >
                    <Route
                      index
                      element={
                        <Navigate to="/dashboard/voice/dashboard" replace />
                      }
                    />
                    <Route
                      path="dashboard"
                      element={
                        <Suspense fallback={<ChannelDashboardSkeleton />}>
                          <VoiceDashboard user={user} />
                        </Suspense>
                      }
                    />
                    <Route
                      path="broadcast"
                      element={
                        <Suspense fallback={<ChannelDashboardSkeleton />}>
                          <BroadcastVoice user={user} setUser={updateUser} />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/dashboard/voice/contacts"
                      element={<GroupList user={user?.username} />}
                    />
                    <Route
                      path="ivr"
                      element={
                        <Suspense fallback={<ChannelDashboardSkeleton />}>
                          <IvrList />
                        </Suspense>
                      }
                    />
                    <Route
                      path="dtmf-flows"
                      element={<Navigate to="/dashboard/voice/ivr" replace />}
                    />
                    <Route
                      path=":requestId/details"
                      element={<VoiceOverview user={user} />}
                    />
                  </Route>
                  {/* IVR builder — Voice navbar, no sidebar, so the canvas
                      gets the full width. */}
                  <Route
                    path="ivr/:ivrId/edit"
                    element={
                      <Suspense fallback={<ChannelDashboardSkeleton />}>
                        <IvrBuilderPage />
                      </Suspense>
                    }
                  />
                </Route>
                <Route
                  path="/dashboard/voice/dtmf-flows/*"
                  element={<Navigate to="/dashboard/voice/ivr" replace />}
                />

                {/* Admin Utilities */}
                <Route
                  path="/dashboard/admin"
                  element={<DashboardNavbar user={user} setUser={updateUser} />}
                >
                  <Route path="/dashboard/admin" element={<AdminUtilities />}>
                    <Route
                      index
                      element={
                        <Navigate to="/dashboard/admin/file-hosting" replace />
                      }
                    />
                    <Route
                      path="/dashboard/admin/file-hosting"
                      element={<FileManager user={user} />}
                    />
                    <Route
                      path="/dashboard/admin/manage-client"
                      element={<Management user={user} />}
                    />
                  </Route>
                </Route>

                {/* Utility - Contacts */}
                <Route
                  path="/dashboard/utility/contacts"
                  element={<DashboardNavbar user={user} setUser={updateUser} />}
                >
                  <Route
                    index
                    element={<GroupList user={user?.username} />}
                  />
                  <Route
                    path=":groupId/:groupName"
                    element={<ContactTable user={user?.username} />}
                  />
                </Route>

                <Route
                  path="/dashboard/support"
                  element={<DashboardNavbar user={user} setUser={updateUser} />}
                >
                  <Route
                    index
                    element={<DirectSupport user={user} setUser={updateUser} />}
                  />
                </Route>
                <Route
                  path="dashboard/userprofile/settings"
                  element={<UserProfile user={user} setUser={updateUser} />}
                />

                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/payment-failed" element={<PaymentFailed />} />

                <Route
                  path="dashboard/userprofile/ProfileSettings"
                  element={<ProfileSettings user={user} setUser={updateUser} />}
                />
                <Route
                  path="/dashboard/file-hosting"
                  element={<DashboardNavbar user={user} setUser={updateUser} />}
                >
                  <Route
                    index
                    element={<FileManager user={user} setUser={updateUser} />}
                  />
                  <Route
                    path="userprofile/settings"
                    element={<UserProfile user={user} setUser={updateUser} />}
                  />
                </Route>
                <Route element={<DashboardNavbar user={user} setUser={updateUser} />}>
                  <Route element={<ChannelRoute permissionKey="manage_clients" user={user} />}>
                    <Route
                      path="/dashboard/management"
                      element={<Management user={user} />}
                    >
                      <Route index element={<Clients user={user} />} />
                      <Route
                        path="clients"
                        element={<Clients user={user} setUser={updateUser} />}
                      />
                      <Route path="client-tree" element={<ClientTree user={user} setUser={updateUser} />} />
                      <Route path="call-fallback-notify" element={<CallFallbackNotify />} />
                      <Route path="voice-routes" element={<VoiceRoutes />} />
                    </Route>
                  </Route>
                </Route>

                <Route
                  path="dashboard/ManageClients/userprofile/settings"
                  element={<UserProfile user={user} setUser={updateUser} />}
                />
                <Route
                  path="/dashboard/transaction-logs"
                  element={<DashboardNavbar user={user} setUser={updateUser} />}
                >
                  <Route
                    index
                    element={<TransactionLog user={user} setUser={updateUser} />}
                  />
                </Route>
                <Route
                  path="dashboard/invoice/userprofile/settings"
                  element={<UserProfile user={user} setUser={updateUser} />}
                />
                <Route
                  path="/dashboard/invoicelist"
                  element={<InvoiceList setUser={updateUser} />}
                />
                <Route
                  path="/dashboard/addinvoice"
                  element={<AddInvoice setUser={updateUser} />}
                />

                {/* Numbers */}
                <Route
                  path="/dashboard/numbers"
                  element={<DashboardNavbar user={user} setUser={updateUser} />}
                >
                  <Route
                    path="/dashboard/numbers"
                    element={<SidebarLayoutNumber />}
                  >
                    <Route
                      path="/dashboard/numbers/buyNumbers"
                      element={<NumberBuyInbox />}
                    />
                    <Route
                      path="/dashboard/numbers/activeNumbers"
                      element={<ActiveNumberInbox />}
                    />
                  </Route>
                </Route>

                {/* Voice Reports */}
                <Route
                  path="/dashboard/management/reports/voice"
                  element={<DashboardNavbar user={user} setUser={updateUser} />}
                >
                  <Route
                    path="/dashboard/management/reports/voice"
                    element={
                      <IndexReportVoice user={user} setUser={updateUser} />
                    }
                  >
                    <Route
                      index
                      element={
                        <ReportVoiceCampaign user={user} setUser={updateUser} />
                      }
                    />
                    <Route
                      path="/dashboard/management/reports/voice/usage"
                      element={
                        <ReportVoiceUsage user={user} setUser={updateUser} />
                      }
                    />
                    <Route
                      path="/dashboard/management/reports/voice/live"
                      element={
                        <ReportVoiceLive user={user} setUser={updateUser} />
                      }
                    />
                    <Route
                      path="/dashboard/management/reports/voice/logs"
                      element={
                        <ReportVoiceLog user={user} setUser={updateUser} />
                      }
                    />
                  </Route>
                </Route>

                {/* Support */}
                <Route
                  path="/dashboard/clientSupport"
                  element={<DashboardNavbar user={user} setUser={updateUser} />}
                >
                  <Route
                    path="/dashboard/clientSupport"
                    element={<Support user={user} setUser={updateUser} />}
                  />
                </Route>

                <Route
                  path="/dashboard/api"
                  element={<DashboardNavbar user={user} setUser={updateUser} />}
                >
                  <Route
                    path="/dashboard/api"
                    element={<ApiDocs user={user} />}
                  />
                </Route>

                <Route path="*" element={<UnderDevelopment />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </ErrorBoundary>
    </ConfigProvider>
  );
};

export default App;
