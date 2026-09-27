import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "dashboard_layout_v2";

const defaultWidgets = [
  { id: "hero-stats", type: "stat", size: "hero", visible: true, order: 0 },
  { id: "channels", type: "channel", size: "wide", visible: true, order: 1 },
  { id: "credits-overview", type: "credits", size: "standard", visible: true, order: 2 },
  { id: "quick-actions", type: "quickAction", size: "standard", visible: true, order: 3 },
  { id: "message-chart", type: "chart", size: "wide", visible: true, order: 4 },
  { id: "activity-feed", type: "activity", size: "wide", visible: true, order: 5 },
];

const useDashboardLayout = () => {
  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle new widgets
        const mergedWidgets = defaultWidgets.map((defaultWidget) => {
          const savedWidget = parsed.widgets?.find((w) => w.id === defaultWidget.id);
          return savedWidget ? { ...defaultWidget, ...savedWidget } : defaultWidget;
        });
        return { ...parsed, widgets: mergedWidgets };
      }
      return { widgets: defaultWidgets, gridLocked: false };
    } catch {
      return { widgets: defaultWidgets, gridLocked: false };
    }
  });

  // Persist to localStorage whenever layout changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch (error) {
      console.warn("Failed to save dashboard layout:", error);
    }
  }, [layout]);

  const updateLayout = useCallback((newWidgets) => {
    setLayout((prev) => ({ ...prev, widgets: newWidgets }));
  }, []);

  const toggleWidget = useCallback((widgetId) => {
    setLayout((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) =>
        w.id === widgetId ? { ...w, visible: !w.visible } : w
      ),
    }));
  }, []);

  const reorderWidgets = useCallback((sourceIndex, destinationIndex) => {
    setLayout((prev) => {
      const widgets = [...prev.widgets];
      const [removed] = widgets.splice(sourceIndex, 1);
      widgets.splice(destinationIndex, 0, removed);
      // Update order property
      const reordered = widgets.map((w, i) => ({ ...w, order: i }));
      return { ...prev, widgets: reordered };
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setLayout({ widgets: defaultWidgets, gridLocked: false });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleGridLock = useCallback(() => {
    setLayout((prev) => ({ ...prev, gridLocked: !prev.gridLocked }));
  }, []);

  const updateWidgetConfig = useCallback((widgetId, config) => {
    setLayout((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) =>
        w.id === widgetId ? { ...w, config: { ...w.config, ...config } } : w
      ),
    }));
  }, []);

  return {
    widgets: layout.widgets
      .filter((w) => w.visible)
      .sort((a, b) => a.order - b.order),
    allWidgets: layout.widgets,
    gridLocked: layout.gridLocked,
    updateLayout,
    toggleWidget,
    reorderWidgets,
    resetToDefault,
    toggleGridLock,
    updateWidgetConfig,
  };
};

export default useDashboardLayout;
