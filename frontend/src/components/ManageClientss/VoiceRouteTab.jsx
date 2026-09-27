import { useState, useEffect, useCallback } from "react";
import { Button, Select, Tag, Typography, message, Spin } from "antd";
import { ApiOutlined, SaveOutlined } from "@ant-design/icons";
import { getClientVoiceRoute, setClientVoiceRoute, listVoiceRoutes } from "../../services/api";
import handleApiError from "../../utils/errorHandler";

const { Text } = Typography;

const LEVEL_TEXT = {
  self: "assigned to this account",
  ancestor: "inherited from a reseller above",
  default: "no assignment — platform default",
};

// Per-client Voice Route: which provider carries this account's voice campaigns.
const VoiceRouteTab = ({ clientId, clientUsername }) => {
  const [routes, setRoutes] = useState([]);
  const [current, setCurrent] = useState(null);
  const [selected, setSelected] = useState("default");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, a] = await Promise.all([listVoiceRoutes(), getClientVoiceRoute(clientId)]);
      setRoutes(r?.data?.data || []);
      const data = a?.data?.data;
      setCurrent(data);
      setSelected(data?.assigned_code || "default");
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setClientVoiceRoute(clientId, selected);
      message.success("Voice route updated.");
      await load();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  const dirty = (current?.assigned_code || "default") !== selected;
  const effective = current?.effective;
  const effectiveName = routes.find((r) => r.code === effective?.code)?.name || effective?.code;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl border border-gray-100 p-5" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(29,78,216,0.03) 100%)" }}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}>
            <ApiOutlined style={{ color: "white", fontSize: 16 }} />
          </div>
          <div>
            <Text strong className="block text-gray-800">Voice Route</Text>
            <Text className="text-xs text-gray-500">Which provider sends voice campaigns for {clientUsername ? <strong>@{clientUsername}</strong> : "this account"}</Text>
          </div>
        </div>

        {loading && !current ? (
          <div className="py-6 text-center"><Spin /></div>
        ) : (
          <>
            <Text className="text-xs font-medium uppercase tracking-wide text-gray-600 block mb-2">Route</Text>
            <div className="flex gap-2">
              <Select
                size="large"
                className="flex-1"
                value={selected}
                onChange={setSelected}
                options={routes.map((r) => ({
                  value: r.code,
                  label: r.code === "default" ? `${r.name} (default)` : r.name,
                  disabled: r.kind === "notifynow" && !(r.url && r.has_api_key),
                }))}
                getPopupContainer={(node) => node.parentElement}
              />
              <Button type="primary" size="large" icon={<SaveOutlined />} loading={saving} disabled={!dirty} onClick={handleSave}
                style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)", border: "none" }}>
                Save
              </Button>
            </div>
            {routes.some((r) => r.kind === "notifynow" && !(r.url && r.has_api_key)) && (
              <Text className="text-xs text-gray-400 block mt-2">
                NotifyNow is disabled until its API key is set under Management → Voice Routes.
              </Text>
            )}
            {effective && (
              <div className="mt-4 text-sm text-gray-600">
                Currently sending via <Tag color={effective.code === "default" ? "blue" : "purple"}>{effectiveName}</Tag>
                <span className="text-xs text-gray-400">({LEVEL_TEXT[effective.level] || effective.level}{effective.level === "ancestor" ? ` — @${effective.from}` : ""})</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default VoiceRouteTab;
