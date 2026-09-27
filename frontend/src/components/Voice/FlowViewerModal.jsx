import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Spin, Typography, Empty } from "antd";
import {
  SoundOutlined,
  PauseCircleOutlined,
  PhoneOutlined,
  RollbackOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { getVoiceCampaignFlow } from "../../services/api";
import handleApiError from "../../utils/errorHandler";

const { Text, Title } = Typography;
const PRIMARY = "#2563EB";
const LEVEL_COLORS = ["#2563EB", "#7C3AED", "#DB2777", "#EA580C", "#059669"];

// Small inline audio play/stop button (one shared player across the tree).
function AudioButton({ url, playingUrl, onToggle }) {
  if (!url) return null;
  const isPlaying = playingUrl === url;
  return (
    <button
      onClick={() => onToggle(url)}
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
      style={{
        background: isPlaying ? PRIMARY : "rgba(37,99,235,0.1)",
        color: isPlaying ? "white" : PRIMARY,
        border: "none",
        cursor: "pointer",
      }}
    >
      {isPlaying ? <PauseCircleOutlined /> : <SoundOutlined />}
      {isPlaying ? "Stop" : "Play"}
    </button>
  );
}

// Describe what a digit's action does, resolving engine node references.
function describeAction(action, nodes) {
  if (!action) return { kind: "unknown" };
  if (action.transfer_to_number)
    return {
      kind: "transfer",
      number: action.transfer_to_number,
      fallbacks: action.fallback_numbers || [],
      then: action.then,
    };
  if (action.transfer_to_extension)
    return { kind: "transfer", number: action.transfer_to_extension, fallbacks: [] };
  if (action.hangup) return { kind: "record_hangup" };
  if (action.goto) {
    const target = nodes[action.goto];
    if (!target) return { kind: "unknown" };
    if (target.digits) return { kind: "submenu", nodeName: action.goto, audio: target.play };
    // response node (no digits): plays audio then repeats or hangs up
    if (target.goto) return { kind: "audio_repeat", audio: target.play };
    return { kind: "audio_hangup", audio: target.play };
  }
  return { kind: "unknown" };
}

// Recursively renders one menu node as an indented block.
function MenuNode({ nodeName, nodes, depth, visited, playerProps }) {
  const node = nodes[nodeName];
  if (!node) return null;
  const color = LEVEL_COLORS[(depth - 1) % LEVEL_COLORS.length];
  const digits = Object.keys(node.digits || {}).sort();

  return (
    <div
      className="pl-3 py-2"
      style={{ borderLeft: `3px solid ${color}`, marginBottom: 8 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Text strong style={{ color }}>
          {depth === 1 ? "Main Menu" : `Sub-menu (level ${depth})`}
        </Text>
        <Text className="text-xs text-gray-400">plays this prompt:</Text>
        <AudioButton url={node.play} {...playerProps} />
      </div>

      <div className="space-y-2">
        {digits.map((d) => {
          const info = describeAction(node.digits[d], nodes);
          const alreadyVisited = info.kind === "submenu" && visited.has(info.nodeName);

          return (
            <div key={d} className="flex items-start gap-2">
              <span
                className="inline-flex items-center justify-center rounded-md font-bold flex-shrink-0"
                style={{ background: "rgba(37,99,235,0.1)", color: PRIMARY, width: 26, height: 26, fontSize: 14 }}
              >
                {d}
              </span>
              <div className="pt-0.5 flex-1">
                {info.kind === "audio_hangup" && (
                  <span className="flex items-center gap-2 flex-wrap">
                    <Text>Play a message, then hang up</Text>
                    <AudioButton url={info.audio} {...playerProps} />
                  </span>
                )}
                {info.kind === "audio_repeat" && (
                  <span className="flex items-center gap-2 flex-wrap">
                    <Text>Play a message, then return to this menu</Text>
                    <AudioButton url={info.audio} {...playerProps} />
                  </span>
                )}
                {info.kind === "record_hangup" && (
                  <span className="flex items-center gap-1 text-gray-600">
                    <StopOutlined /> Save the key press and hang up (no audio)
                  </span>
                )}
                {info.kind === "transfer" && (
                  <span className="flex items-center gap-1 flex-wrap text-gray-700">
                    <PhoneOutlined style={{ color: PRIMARY }} />
                    Forward the call to <b>{info.number}</b>
                    {info.fallbacks.length > 0 && (
                      <Text className="text-xs text-gray-500">
                        (backup: {info.fallbacks.join(", ")})
                      </Text>
                    )}
                  </span>
                )}
                {info.kind === "submenu" && alreadyVisited && (
                  <span className="flex items-center gap-1 text-gray-500">
                    <RollbackOutlined /> Go back to a previous menu
                  </span>
                )}
                {info.kind === "submenu" && !alreadyVisited && (
                  <div>
                    <Text className="text-gray-700">Open a sub-menu:</Text>
                    <MenuNode
                      nodeName={info.nodeName}
                      nodes={nodes}
                      depth={depth + 1}
                      visited={new Set([...visited, info.nodeName])}
                      playerProps={playerProps}
                    />
                  </div>
                )}
                {info.kind === "unknown" && <Text type="secondary">—</Text>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const FlowViewerModal = ({ open, onClose, requestId, campaignName, container }) => {
  const [loading, setLoading] = useState(false);
  const [flow, setFlow] = useState(null);
  const [ivrEnabled, setIvrEnabled] = useState(true);

  const audioRef = useRef(null);
  const [playingUrl, setPlayingUrl] = useState(null);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingUrl(null);
  };

  const togglePlay = (url) => {
    if (playingUrl === url) return stopAudio();
    stopAudio();
    const player = new Audio(url);
    player.onended = () => setPlayingUrl(null);
    player.onerror = () => setPlayingUrl(null);
    audioRef.current = player;
    setPlayingUrl(url);
    player.play().catch(() => stopAudio());
  };

  useEffect(() => {
    if (!open || !requestId) return;
    let cancelled = false;
    setLoading(true);
    getVoiceCampaignFlow(requestId)
      .then((res) => {
        if (cancelled) return;
        setIvrEnabled(!!res.data.ivr_enabled);
        setFlow(res.data.flow || null);
      })
      .catch(handleApiError)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, requestId]);

  useEffect(() => {
    if (!open) stopAudio();
    return stopAudio;
  }, [open]);

  const playerProps = useMemo(() => ({ playingUrl, onToggle: togglePlay }), [playingUrl]);

  return (
    <Modal
      open={open}
      onCancel={() => {
        stopAudio();
        onClose();
      }}
      footer={null}
      width={640}
      title={
        <span className="flex items-center gap-2">
          <SoundOutlined style={{ color: PRIMARY }} />
          DTMF Menu — {campaignName || requestId}
        </span>
      }
      getContainer={container || false}
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <Spin />
        </div>
      ) : !ivrEnabled || !flow ? (
        <Empty description="This campaign has no DTMF menu (plain broadcast)." />
      ) : (
        <div style={{ maxHeight: 500, overflowY: "auto" }}>
          <MenuNode
            nodeName={flow.start}
            nodes={flow.nodes}
            depth={1}
            visited={new Set([flow.start])}
            playerProps={playerProps}
          />
        </div>
      )}
    </Modal>
  );
};

export default FlowViewerModal;
