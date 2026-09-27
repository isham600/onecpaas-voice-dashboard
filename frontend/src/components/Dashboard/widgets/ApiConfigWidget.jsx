import React, { useEffect, useMemo, useState } from "react";
import {
  SafetyOutlined,
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { message } from "antd";
import { getProfileMe, generateApiToken } from "../../../services/api";
import handleApiError from "../../../utils/errorHandler";

const ApiConfigWidget = ({ loading = false }) => {
  const [showToken, setShowToken] = useState(false);
  const [apiToken, setApiToken] = useState(null);
  const [apiBaseUrl, setApiBaseUrl] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await getProfileMe();
        const user = response?.data?.data?.user || {};
        if (!cancelled) {
          setApiBaseUrl(user.api_base_url || null);
          setApiToken(user.token || null);
        }
      } catch (error) {
        if (!cancelled) handleApiError(error);
      } finally {
        if (!cancelled) setFetching(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const maskedToken = useMemo(() => {
    if (!apiToken) return null;
    if (showToken) return apiToken;
    if (apiToken.length <= 16) return "•".repeat(apiToken.length);
    return `${apiToken.slice(0, 10)}${"•".repeat(16)}${apiToken.slice(-6)}`;
  }, [apiToken, showToken]);

  const handleCopy = async (value, label) => {
    if (!value) return;
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      message.error("Clipboard is not available");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      message.success(`${label} copied`);
    } catch (err) {
      message.error(`Unable to copy ${label.toLowerCase()}`);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const response = await generateApiToken();
      const token = response?.data?.token;
      setApiToken(token || null);
      setShowToken(true);
      message.success(response?.data?.message || "Token generated successfully");
    } catch (error) {
      handleApiError(error);
    } finally {
      setRegenerating(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="h-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
          <div className="h-10 bg-gray-200 rounded-xl mb-3" />
          <div className="h-10 bg-gray-200 rounded-xl mb-3" />
          <div className="h-10 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
          style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}
        >
          <SafetyOutlined style={{ color: "white", fontSize: 18 }} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">API Configuration</h3>
          <p className="text-sm text-gray-500">Secure credentials & settings</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1.5">API Access Token</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-mono text-gray-700 truncate">
              {maskedToken || "No token generated yet"}
            </div>
            <button
              onClick={() => setShowToken((prev) => !prev)}
              disabled={!apiToken}
              className="w-11 h-11 rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {showToken ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            </button>
            <button
              onClick={() => handleCopy(apiToken, "Token")}
              disabled={!apiToken}
              className="w-11 h-11 rounded-xl border border-emerald-200 text-emerald-600 hover:bg-emerald-50 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CopyOutlined />
            </button>
          </div>
        </div>

        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="w-full rounded-xl py-3 text-base font-semibold text-white hover:opacity-95 flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}
        >
          <ReloadOutlined spin={regenerating} />
          {apiToken ? "Regenerate Token" : "Generate Token"}
        </button>

        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1.5">API Base URL</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-mono text-gray-700 truncate">
              {apiBaseUrl || "Not configured"}
            </div>
            <button
              onClick={() => handleCopy(apiBaseUrl, "Base URL")}
              disabled={!apiBaseUrl}
              className="w-11 h-11 rounded-xl border border-emerald-200 text-emerald-600 hover:bg-emerald-50 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CopyOutlined />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiConfigWidget;
