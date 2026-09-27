import { Skeleton } from "antd";

// Full-page shimmer shown while a channel's dashboard chunk/data is loading.
// Deliberately mirrors the real markup/skeleton pieces already used by
// BrandedWhatsapp/index.jsx (header + chart card), WhatsAppCreditsCard.jsx
// (its own `loading` branch) and OverviewComponent.jsx (StatusCardSkeleton +
// header) so the shimmer is shaped like — and animates like — the page that
// follows it, instead of a generic unrelated spinner.
const THEME = {
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

const StatTileSkeleton = ({ index }) => (
  <div
    className="h-[130px] rounded-xl p-4 bg-white border border-gray-100"
    style={{ animationDelay: `${index * 40}ms` }}
  >
    <div className="flex items-center justify-between mb-3">
      <Skeleton.Avatar active size={36} shape="square" style={{ borderRadius: 8 }} />
      <Skeleton.Button active size="small" style={{ width: 40, height: 18, borderRadius: 20 }} />
    </div>
    <Skeleton.Input active size="small" style={{ width: 70, height: 28, marginBottom: 6, display: "block" }} />
    <Skeleton.Input active size="small" style={{ width: 55, height: 12, display: "block" }} />
    <Skeleton.Input active size="small" style={{ width: "100%", height: 5, marginTop: 10, display: "block" }} />
  </div>
);

const ChannelDashboardSkeleton = () => (
  <div className="-m-4 min-h-screen" style={{ background: "#F8F9FB" }}>
    {/* Header card */}
    <div className="px-4 pt-4 pb-4">
      <div
        className="rounded-2xl border border-gray-100 px-6 py-5 flex items-center justify-between gap-4 flex-wrap"
        style={{
          background: "linear-gradient(135deg, #f5f6ff 0%, #eef0ff 100%)",
          boxShadow: "0 1px 8px rgba(37,99,235,0.06)",
        }}
      >
        <div className="flex items-center gap-4">
          <Skeleton.Button active shape="square" style={{ width: 36, height: 36, borderRadius: 8 }} />
          <Skeleton.Avatar active shape="square" size={48} style={{ borderRadius: 12 }} />
          <div>
            <Skeleton.Input active size="small" style={{ width: 170, height: 22, marginBottom: 8, display: "block" }} />
            <Skeleton.Input active size="small" style={{ width: 210, height: 12, display: "block" }} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton.Button active style={{ width: 240, height: 36, borderRadius: 8 }} />
          <Skeleton.Button active style={{ width: 96, height: 36, borderRadius: 8 }} />
          <Skeleton.Button active style={{ width: 150, height: 36, borderRadius: 8 }} />
          <Skeleton.Button active shape="square" style={{ width: 36, height: 36, borderRadius: 8 }} />
        </div>
      </div>
    </div>

    <div className="px-4 pb-4 space-y-4">
      {/* Chart + Credits */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Chart card — same shell as the real "Campaign Health" card */}
        <div
          className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-50">
            <div>
              <Skeleton.Input active size="small" style={{ width: 120, height: 16, marginBottom: 6, display: "block" }} />
              <Skeleton.Input active size="small" style={{ width: 160, height: 12, display: "block" }} />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton.Button active size="small" style={{ width: 100, height: 22, borderRadius: 20 }} />
              <Skeleton.Button active size="small" style={{ width: 70, height: 22, borderRadius: 20 }} />
            </div>
          </div>
          <div className="px-4 pt-2 pb-4">
            {/* identical to the real chart's own loading placeholder */}
            <div className="h-52 bg-gray-50 rounded-xl animate-pulse" />
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 pt-3 border-t border-gray-50">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton.Input key={i} active size="small" style={{ width: 70, height: 12 }} />
              ))}
            </div>
          </div>
        </div>

        {/* Credits card — copies WhatsAppCreditsCard's own `loading` branch */}
        <div
          className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
        >
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ background: THEME.gradientLight, borderBottom: "1px solid rgba(37,99,235,0.1)" }}
          >
            <div className="flex items-center gap-3">
              <Skeleton.Avatar active shape="square" size={44} style={{ borderRadius: 12 }} />
              <div>
                <Skeleton.Input active size="small" style={{ width: 120, height: 14, marginBottom: 6, display: "block" }} />
                <Skeleton.Input active size="small" style={{ width: 90, height: 11, display: "block" }} />
              </div>
            </div>
            <Skeleton.Button active shape="square" style={{ width: 36, height: 36, borderRadius: 8 }} />
          </div>
          <div className="p-5">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton.Avatar active size={48} shape="square" />
              <div className="flex-1">
                <Skeleton.Input active size="small" style={{ width: 100, marginBottom: 8, display: "block" }} />
                <Skeleton.Input active size="large" style={{ width: 150, display: "block" }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Skeleton.Button active style={{ width: "100%", height: 100 }} />
              <Skeleton.Button active style={{ width: "100%", height: 100 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Message overview — copies OverviewComponent's header + StatusCardSkeleton grid */}
      <div
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden p-4"
        style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center gap-3 mb-6 px-2 pt-2">
          <Skeleton.Avatar active shape="square" size={40} style={{ borderRadius: 12 }} />
          <div>
            <Skeleton.Input active size="small" style={{ width: 150, height: 18, marginBottom: 6, display: "block" }} />
            <Skeleton.Input active size="small" style={{ width: 170, height: 12, display: "block" }} />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <StatTileSkeleton key={i} index={i} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default ChannelDashboardSkeleton;
