import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ReactFlow, ReactFlowProvider, Background, Controls, MarkerType, useReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Input, Button, Modal, message } from "antd";
import { ArrowLeftOutlined, ApartmentOutlined, SaveOutlined } from "@ant-design/icons";

import StartNode from "../../../components/Voice/IvrBuilder/CustomNodes/StartNode.jsx";
import HangupNode from "../../../components/Voice/IvrBuilder/CustomNodes/HangupNode.jsx";
import ModuleNode from "../../../components/Voice/IvrBuilder/CustomNodes/ModuleNode.jsx";
import BranchNode from "../../../components/Voice/IvrBuilder/CustomNodes/BranchNode.jsx";
import PlaceholderNode from "../../../components/Voice/IvrBuilder/CustomNodes/PlaceholderNode.jsx";
import IvrEdge from "../../../components/Voice/IvrBuilder/IvrEdge.jsx";
import ModuleListModal from "../../../components/Voice/IvrBuilder/ModuleListModal.jsx";
import AnnouncementDrawer from "../../../components/Voice/IvrBuilder/Drawers/AnnouncementDrawer.jsx";
import DtmfDrawer from "../../../components/Voice/IvrBuilder/Drawers/DtmfDrawer.jsx";
import LongDtmfDrawer from "../../../components/Voice/IvrBuilder/Drawers/LongDtmfDrawer.jsx";
import WebhookDrawer from "../../../components/Voice/IvrBuilder/Drawers/WebhookDrawer.jsx";
import CallTransferDrawer from "../../../components/Voice/IvrBuilder/Drawers/CallTransferDrawer.jsx";
import {
  OTHER_LABEL,
  normalizeFlow,
  layoutFlow,
  insertOnEdge,
  fillPlaceholder,
  removeNode,
  applyConfig,
  countSteps,
  serializeFlow,
} from "../../../components/Voice/IvrBuilder/flowModel.js";
import { getIvrById, saveIvrSteps } from "../../../services/ivrApi.js";
import handleApiError from "../../../utils/errorHandler";

const GRADIENT = "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)";
const ARROW = { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#475569" };
const CONFIGURABLE = new Set(["announcement", "dtmf", "longDtmf", "webhook", "callTransfer"]);

const nodeTypes = {
  start: StartNode,
  hangup: HangupNode,
  announcement: ModuleNode,
  dtmf: ModuleNode,
  longDtmf: ModuleNode,
  webhook: ModuleNode,
  callTransfer: ModuleNode,
  branchMarker: BranchNode,
  placeholder: PlaceholderNode,
};

const edgeTypes = { ivrEdge: IvrEdge };

const confirmDestructive = (title, content, onOk) =>
  Modal.confirm({ title, content, okText: "Remove", okButtonProps: { danger: true }, onOk });

const IvrBuilderPageInner = () => {
  const navigate = useNavigate();
  const { ivrId } = useParams();
  const [searchParams] = useSearchParams();
  const pulse30Suffix = searchParams.get("pulse30") === "1" ? "?pulse30=1" : "";
  const { fitView } = useReactFlow();

  const [title, setTitle] = useState("");
  const [flow, setFlow] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Where the module picker will add a step: an edge (insert between) or an empty slot.
  const [pickerTarget, setPickerTarget] = useState(null);
  const [editingNodeId, setEditingNodeId] = useState(null);

  const goBack = useCallback(() => navigate(`/dashboard/voice/ivr${pulse30Suffix}`), [navigate, pulse30Suffix]);

  useEffect(() => {
    let cancelled = false;
    getIvrById(ivrId)
      .then((stored) => {
        if (cancelled) return;
        setTitle(stored.title);
        setFlow(normalizeFlow(stored.nodes || [], stored.edges || []));
      })
      .catch((error) => {
        if (cancelled) return;
        handleApiError(error);
        goBack();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ivrId, goBack]);

  // Re-frame the whole tree whenever steps are added/removed.
  const nodeCount = flow.nodes.length;
  useEffect(() => {
    if (loading) return undefined;
    const timer = setTimeout(() => fitView({ padding: 0.2, maxZoom: 1, duration: 250 }), 30);
    return () => clearTimeout(timer);
  }, [nodeCount, loading, fitView]);

  const openEdgePicker = useCallback((edgeId) => setPickerTarget({ kind: "edge", id: edgeId }), []);

  const handleSelectModule = (type) => {
    const target = pickerTarget;
    setPickerTarget(null);
    if (!target) return;

    const run = () => {
      const result =
        target.kind === "edge"
          ? insertOnEdge(flow.nodes, flow.edges, target.id, type)
          : fillPlaceholder(flow.nodes, flow.edges, target.id, type);
      setFlow({ nodes: result.nodes, edges: result.edges });
      if (result.createdId && CONFIGURABLE.has(type)) setEditingNodeId(result.createdId);
    };

    if (target.kind === "edge" && type === "hangup") {
      const edge = flow.edges.find((e) => e.id === target.id);
      const lost = edge ? countSteps(flow.nodes, flow.edges, edge.target) : 0;
      if (lost > 0) {
        confirmDestructive(
          "End the call here?",
          `The ${lost} step${lost > 1 ? "s" : ""} after this point will be removed.`,
          run,
        );
        return;
      }
    }
    run();
  };

  const handleDelete = useCallback(
    (nodeId) => {
      const node = flow.nodes.find((n) => n.id === nodeId);
      const run = () => setFlow(removeNode(flow.nodes, flow.edges, nodeId));

      if (node?.type === "dtmf") {
        const lost = countSteps(flow.nodes, flow.edges, nodeId) - 1;
        confirmDestructive(
          "Remove this DTMF step?",
          lost > 0
            ? `Its key branches and the ${lost} step${lost > 1 ? "s" : ""} under them will be removed too.`
            : "Its key branches will be removed too.",
          run,
        );
        return;
      }

      if (node?.type === "callTransfer") {
        const noAnswer = flow.edges
          .filter((e) => e.source === nodeId)
          .map((e) => flow.nodes.find((n) => n.id === e.target))
          .find((n) => n?.type === "branchMarker");
        const lost = noAnswer ? countSteps(flow.nodes, flow.edges, noAnswer.id) : 0;
        if (lost > 0) {
          confirmDestructive(
            "Remove this Call Transfer?",
            `The ${lost} step${lost > 1 ? "s" : ""} on its No Answer path will be removed too.`,
            run,
          );
          return;
        }
      }
      run();
    },
    [flow],
  );

  const editingNode = flow.nodes.find((n) => n.id === editingNodeId);
  const closeDrawer = () => setEditingNodeId(null);

  const saveNodeConfig = (config) => {
    const nodeId = editingNodeId;
    const run = () => {
      setFlow(applyConfig(flow.nodes, flow.edges, nodeId, config));
      setEditingNodeId(null);
    };

    if (editingNode?.type === "dtmf") {
      const keptKeys = new Set(config.keys || []);
      const lost = flow.edges
        .filter((e) => e.source === nodeId)
        .map((e) => flow.nodes.find((n) => n.id === e.target))
        .filter((marker) => marker && marker.data?.label !== OTHER_LABEL && !keptKeys.has(marker.data?.label))
        .reduce((sum, marker) => sum + countSteps(flow.nodes, flow.edges, marker.id), 0);

      if (lost > 0) {
        confirmDestructive(
          "Remove unselected key branches?",
          `${lost} step${lost > 1 ? "s" : ""} under the keys you unselected will be removed.`,
          run,
        );
        return;
      }
    }
    run();
  };

  const onNodeClick = useCallback((_, node) => {
    if (node.type === "placeholder") setPickerTarget({ kind: "slot", id: node.id });
    else if (CONFIGURABLE.has(node.type)) setEditingNodeId(node.id);
  }, []);

  const rfNodes = useMemo(
    () =>
      layoutFlow(flow.nodes, flow.edges).map((n) => ({
        ...n,
        data: {
          ...n.data,
          onEdit: CONFIGURABLE.has(n.type) ? setEditingNodeId : undefined,
          onDelete: n.type === "start" ? undefined : handleDelete,
        },
      })),
    [flow, handleDelete],
  );

  const rfEdges = useMemo(() => {
    const typeOf = new Map(flow.nodes.map((n) => [n.id, n.type]));
    return flow.edges.map((e) => {
      const targetType = typeOf.get(e.target);
      return {
        ...e,
        type: "ivrEdge",
        markerEnd: targetType === "placeholder" ? undefined : ARROW,
        data: {
          showAdd: targetType !== "placeholder" && targetType !== "branchMarker",
          onInsert: openEdgePicker,
        },
      };
    });
  }, [flow, openEdgePicker]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveIvrSteps(ivrId, { title, ...serializeFlow(flow.nodes, flow.edges) });
      if (saved?.runnable === false) {
        message.warning({
          content: `IVR saved, but it can't be used in a campaign yet: ${saved.issues.join(" · ")}`,
          duration: 10,
        });
      } else {
        message.success("IVR saved.");
      }
      goBack();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="flex flex-col h-full bg-white">
      <div
        className="flex-shrink-0 flex items-center justify-between gap-4 flex-wrap px-6 py-4"
        style={{ background: "linear-gradient(135deg, #f5f6ff 0%, #eef0ff 100%)", borderBottom: "1px solid rgba(37,99,235,0.1)" }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="h-[34px] px-3 gap-1.5 rounded-[10px] border border-gray-200 text-gray-500 hover:text-[#2563EB] hover:border-gray-300 flex items-center justify-center flex-shrink-0 text-xs font-bold"
          >
            <ArrowLeftOutlined /> Back
          </button>
          <div
            className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center flex-shrink-0"
            style={{ background: GRADIENT, boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}
          >
            <ApartmentOutlined style={{ color: "#fff", fontSize: 17 }} />
          </div>
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              variant="borderless"
              className="text-base font-bold text-gray-900 !p-0 w-64"
            />
            <p className="text-xs text-gray-400 mt-0.5">
              Click <span className="font-semibold text-blue-600">+</span> to add a step · click a step to configure it
            </p>
          </div>
        </div>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={handleSave}
          style={{ background: GRADIENT, border: "none" }}
        >
          Save
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={onNodeClick}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          minZoom={0.2}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        >
          <Background gap={20} size={1} color="#E2E8F0" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <ModuleListModal open={!!pickerTarget} onClose={() => setPickerTarget(null)} onSelect={handleSelectModule} />

      <AnnouncementDrawer
        open={editingNode?.type === "announcement"}
        initialValues={editingNode?.data?.config}
        onClose={closeDrawer}
        onSave={saveNodeConfig}
      />
      <DtmfDrawer
        open={editingNode?.type === "dtmf"}
        initialValues={editingNode?.data?.config}
        onClose={closeDrawer}
        onSave={saveNodeConfig}
      />
      <LongDtmfDrawer
        open={editingNode?.type === "longDtmf"}
        initialValues={editingNode?.data?.config}
        onClose={closeDrawer}
        onSave={saveNodeConfig}
      />
      <WebhookDrawer
        open={editingNode?.type === "webhook"}
        initialValues={editingNode?.data?.config}
        onClose={closeDrawer}
        onSave={saveNodeConfig}
      />
      <CallTransferDrawer
        open={editingNode?.type === "callTransfer"}
        initialValues={editingNode?.data?.config}
        onClose={closeDrawer}
        onSave={saveNodeConfig}
      />
    </div>
  );
};

// Rendered under the Voice navbar but without the Voice sidebar, so the canvas
// gets the full width. 7rem = the navbar's height (EnhancedNavbar main pt-28).
// The Back button returns to the IVR list (carrying the pulse30 identity).
const IvrBuilderPage = () => (
  <div style={{ height: "calc(100vh - 7rem)" }}>
    <ReactFlowProvider>
      <IvrBuilderPageInner />
    </ReactFlowProvider>
  </div>
);

export default IvrBuilderPage;
