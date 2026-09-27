import React, { useEffect, useMemo, useState } from "react";
import { Typography, Button, Tag, message, Divider } from "antd";
import {
  ApiOutlined,
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { getProfileMe, generateApiToken } from "../../services/api";
import handleApiError from "../../utils/errorHandler";

const { Title, Text, Paragraph } = Typography;

const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
};

const BASE_URL = "https://webpush.onecpaas.com";
const POSTMAN_URL = "/cell247-voice-partner-api.postman_collection.json";

const CodeBlock = ({ children, method, path }) => (
  <div
    className="rounded-xl overflow-hidden mb-4 border"
    style={{ borderColor: "#e5e7eb" }}
  >
    {(method || path) && (
      <div
        className="flex items-center gap-2 px-4 py-2 text-xs font-mono"
        style={{ background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}
      >
        {method && (
          <Tag
            color={method === "GET" ? "blue" : method === "DELETE" ? "red" : "green"}
            className="!m-0 font-bold"
          >
            {method}
          </Tag>
        )}
        <span className="text-gray-700">{path}</span>
      </div>
    )}
    <pre
      className="text-xs p-4 m-0 overflow-x-auto"
      style={{ background: "#0f172a", color: "#e2e8f0", lineHeight: 1.6 }}
    >
      {children}
    </pre>
  </div>
);

const Endpoint = ({ title, description, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl p-5 mb-5 bg-white border border-gray-100 shadow-sm"
  >
    <Title level={4} className="!mb-1">{title}</Title>
    {description && <Paragraph className="text-gray-500 !mb-4">{description}</Paragraph>}
    {children}
  </motion.div>
);

const ApiDocs = ({ user }) => {
  const [showToken, setShowToken] = useState(false);
  const [apiToken, setApiToken] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await getProfileMe();
        const u = response?.data?.data?.user || {};
        if (!cancelled) setApiToken(u.token || null);
      } catch (error) {
        if (!cancelled) handleApiError(error);
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const maskedToken = useMemo(() => {
    if (!apiToken) return null;
    if (showToken) return apiToken;
    if (apiToken.length <= 16) return "•".repeat(apiToken.length);
    return `${apiToken.slice(0, 10)}${"•".repeat(16)}${apiToken.slice(-6)}`;
  }, [apiToken, showToken]);

  const displayToken = apiToken ? maskedToken : "YOUR_API_TOKEN";

  const handleCopy = async (value, label) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      message.success(`${label} copied`);
    } catch {
      message.error(`Unable to copy ${label.toLowerCase()}`);
    }
  };

  const handleGenerate = async () => {
    setRegenerating(true);
    try {
      const response = await generateApiToken();
      const token = response?.data?.token;
      setApiToken(token || null);
      setShowToken(true);
      message.success("Token generated. Any previous token is now invalid — update any client already using it.");
    } catch (error) {
      handleApiError(error);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: THEME.gradient }}
          >
            <ApiOutlined style={{ fontSize: 20, color: "white" }} />
          </div>
          <div>
            <Title level={3} className="!mb-0">Voice Partner API</Title>
            <Text type="secondary">
              Share this with your own clients so they can submit voice campaigns and receive delivery status directly — no dashboard access needed.
            </Text>
          </div>
        </div>
        <Button
          icon={<DownloadOutlined />}
          href={POSTMAN_URL}
          download="cell247-voice-partner-api.postman_collection.json"
        >
          Download Postman Collection
        </Button>
      </motion.div>

      {/* Token card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 mb-6 text-white"
        style={{ background: THEME.gradient }}
      >
        <Text className="!text-white/80 text-xs font-semibold uppercase tracking-wide">
          Your API Token
        </Text>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <code
            className="px-3 py-2 rounded-lg text-sm flex-1 min-w-[240px]"
            style={{ background: "rgba(255,255,255,0.15)", wordBreak: "break-all" }}
          >
            {fetching ? "Loading…" : displayToken}
          </code>
          {apiToken && (
            <>
              <Button
                type="text"
                className="!text-white"
                icon={showToken ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={() => setShowToken((s) => !s)}
              />
              <Button
                type="text"
                className="!text-white"
                icon={<CopyOutlined />}
                onClick={() => handleCopy(apiToken, "Token")}
              />
            </>
          )}
          <Button
            icon={<ReloadOutlined />}
            loading={regenerating}
            onClick={handleGenerate}
          >
            {apiToken ? "Regenerate" : "Generate Token"}
          </Button>
        </div>
        <Text className="!text-white/70 text-xs block mt-2">
          Send it as <code className="text-white">Authorization: Bearer &lt;token&gt;</code> on every request below. Regenerating immediately invalidates the old token — anyone using it will need the new one.
        </Text>
      </motion.div>

      <Endpoint
        title="1. Submit a Campaign"
        description="Creates a new voice campaign and starts dialing. For large lists, send only the first batch here and use tracking_id (below) for the rest."
      >
        <CodeBlock method="POST" path="/api/v1/voice/partner/submit">
{`curl -X POST ${BASE_URL}/api/v1/voice/partner/submit \\
  -H "Authorization: Bearer ${displayToken}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "broadcast_name": "My First Campaign",
    "audio_url": "https://example.com/audio.mp3",
    "contacts": ["919111991707", "919111991708"],
    "voiceplan": "15"
  }'`}
        </CodeBlock>
        <Text strong className="text-sm">Response</Text>
        <CodeBlock>
{`{
  "success": true,
  "data": {
    "request_id": "VCAMP_20260827_ABC123",
    "contacts": 2,
    "credits_deducted": 2,
    "status": "Pending for Verification"
  }
}`}
        </CodeBlock>
      </Endpoint>

      <Endpoint
        title="2. Submit Additional Batches (large campaigns)"
        description="Recommended in batches of ~3,000 contacts. Pass the request_id from the create call as tracking_id — audio, broadcast name, retries etc. are inherited, so only contacts is needed. Each call bills only for the contacts it actually sends."
      >
        <CodeBlock method="POST" path="/api/v1/voice/partner/submit">
{`curl -X POST ${BASE_URL}/api/v1/voice/partner/submit \\
  -H "Authorization: Bearer ${displayToken}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tracking_id": "VCAMP_20260827_ABC123",
    "contacts": ["919111991709", "919111991710"]
  }'`}
        </CodeBlock>
      </Endpoint>

      <Endpoint
        title="3. Check Campaign Status"
        description="Returns a count of recipients per status (ANSWERED, NO ANSWER, BUSY, FAILED, etc.) for one campaign."
      >
        <CodeBlock method="GET" path="/api/v1/voice/partner/report?request_id=VCAMP_20260827_ABC123">
{`curl "${BASE_URL}/api/v1/voice/partner/report?request_id=VCAMP_20260827_ABC123" \\
  -H "Authorization: Bearer ${displayToken}"`}
        </CodeBlock>
      </Endpoint>

      <Endpoint
        title="4. Register a Status Webhook"
        description="Cell247 will POST a real-time update here every time a call in any of your campaigns changes status. Re-registering overwrites the previous URL — there's one active webhook per account."
      >
        <CodeBlock method="POST" path="/api/v1/voice/partner/webhook">
{`curl -X POST ${BASE_URL}/api/v1/voice/partner/webhook \\
  -H "Authorization: Bearer ${displayToken}" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://your-server.com/webhook/voice-status"}'`}
        </CodeBlock>
        <Text strong className="text-sm">What you'll receive (POST, no auth header — verify by IP or a shared secret in your own URL)</Text>
        <CodeBlock>
{`{
  "event": "voice.status.update",
  "request_id": "VCAMP_20260827_ABC123",
  "receiver": "919111991707",
  "status": "ANSWERED",
  "duration": 12
}`}
        </CodeBlock>
        <Paragraph className="text-xs text-gray-500 !mb-0">
          <Text strong>Status values:</Text> ANSWERED, NO ANSWER, BUSY, FAILED, CANCELED.
        </Paragraph>
      </Endpoint>

      <Endpoint title="5. View or Disable Your Webhook">
        <CodeBlock method="GET" path="/api/v1/voice/partner/webhook">
{`curl "${BASE_URL}/api/v1/voice/partner/webhook" \\
  -H "Authorization: Bearer ${displayToken}"`}
        </CodeBlock>
        <CodeBlock method="DELETE" path="/api/v1/voice/partner/webhook">
{`curl -X DELETE "${BASE_URL}/api/v1/voice/partner/webhook" \\
  -H "Authorization: Bearer ${displayToken}"`}
        </CodeBlock>
      </Endpoint>

      <Divider />
      <Paragraph className="text-xs text-gray-400 text-center">
        Questions about this API? Contact support from the Support tab.
      </Paragraph>
    </div>
  );
};

export default ApiDocs;
