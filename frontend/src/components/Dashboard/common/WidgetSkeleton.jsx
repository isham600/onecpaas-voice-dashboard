import React from "react";

const WidgetSkeleton = ({ type = "default", rows = 3 }) => {
  const skeletonBase = "animate-pulse bg-gray-200/60 rounded";

  const renderDefault = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className={`${skeletonBase} w-10 h-10 rounded-xl`} />
        <div className="space-y-2 flex-1">
          <div className={`${skeletonBase} h-4 w-32`} />
          <div className={`${skeletonBase} h-3 w-24`} />
        </div>
      </div>
      {/* Content rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={`${skeletonBase} h-4 w-full`} />
        ))}
      </div>
    </div>
  );

  const renderStats = () => (
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-3 p-4 bg-gray-50/50 rounded-xl">
          <div className={`${skeletonBase} h-3 w-20`} />
          <div className={`${skeletonBase} h-8 w-24`} />
          <div className={`${skeletonBase} h-12 w-full`} />
        </div>
      ))}
    </div>
  );

  const renderChart = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`${skeletonBase} w-10 h-10 rounded-xl`} />
          <div className={`${skeletonBase} h-5 w-40`} />
        </div>
        <div className={`${skeletonBase} h-8 w-24 rounded-lg`} />
      </div>
      {/* Chart area */}
      <div className={`${skeletonBase} h-48 w-full rounded-xl`} />
    </div>
  );

  const renderChannels = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className={`${skeletonBase} w-10 h-10 rounded-xl`} />
        <div className={`${skeletonBase} h-5 w-36`} />
      </div>
      {/* Channel cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-3 bg-gray-50/50 rounded-xl space-y-2">
            <div className="flex items-center space-x-2">
              <div className={`${skeletonBase} w-8 h-8 rounded-lg`} />
              <div className={`${skeletonBase} h-4 w-16`} />
            </div>
            <div className={`${skeletonBase} h-6 w-20`} />
          </div>
        ))}
      </div>
    </div>
  );

  const renderActivity = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className={`${skeletonBase} w-10 h-10 rounded-xl`} />
        <div className={`${skeletonBase} h-5 w-32`} />
      </div>
      {/* Activity items */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50/50 rounded-xl">
            <div className={`${skeletonBase} w-8 h-8 rounded-full`} />
            <div className="flex-1 space-y-2">
              <div className={`${skeletonBase} h-3 w-full`} />
              <div className={`${skeletonBase} h-2 w-24`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderQuickActions = () => (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={`${skeletonBase} h-12 w-full rounded-xl`} />
      ))}
    </div>
  );

  switch (type) {
    case "stats":
      return renderStats();
    case "chart":
      return renderChart();
    case "channels":
      return renderChannels();
    case "activity":
      return renderActivity();
    case "quickActions":
      return renderQuickActions();
    default:
      return renderDefault();
  }
};

export default WidgetSkeleton;
