// IVR flows are a tree rooted at Start. Structure lives in `nodes` (id, type,
// data) + `edges` (source -> target); positions are never stored — layoutFlow
// derives them, so the canvas is always pre-arranged and never hand-dragged.
//
// Node kinds:
//   start, announcement, longDtmf, webhook -> one "next" child
//   callTransfer  -> one "next" child + a "No Answer" branchMarker
//   dtmf          -> one branchMarker child per configured key + "Other"
//   branchMarker  -> one child
//   hangup        -> terminal
//   placeholder   -> an empty slot, rendered as a "+" (never persisted)

export const OTHER_LABEL = "Other";
export const NO_ANSWER_LABEL = "No Answer";

const KEY_ORDER = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "*", "#"];
const sortKeys = (keys) => [...keys].sort((a, b) => KEY_ORDER.indexOf(a) - KEY_ORDER.indexOf(b));

let idCounter = 0;
export const newId = (prefix) => `${prefix}-${Date.now().toString(36)}${(idCounter++).toString(36)}`;

const makeEdge = (source, target) => ({ id: `${source}->${target}`, source, target });

const isStructural = (type) => type === "placeholder" || type === "branchMarker";

// Rebuilds a valid tree from whatever is stored: drops orphans and dangling
// edges, creates/removes branch markers to match each step's outcomes, and
// fills every empty slot with a placeholder.
export const normalizeFlow = (nodes, edges) => {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const hasParent = new Set();
  const cleanEdges = edges.filter((e) => {
    if (!byId.has(e.source) || !byId.has(e.target) || hasParent.has(e.target)) return false;
    hasParent.add(e.target);
    return true;
  });
  const childrenOf = (id) => cleanEdges.filter((e) => e.source === id).map((e) => byId.get(e.target));

  const start = nodes.find((n) => n.type === "start") || { id: "start", type: "start", data: {} };
  const outNodes = [];
  const outEdges = [];
  const visited = new Set();

  const visit = (node) => {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    outNodes.push(node);
    if (node.type === "hangup" || node.type === "placeholder") return;

    const kids = childrenOf(node.id);
    const link = (child) => {
      outEdges.push(makeEdge(node.id, child.id));
      visit(child);
    };
    const markerFor = (label) =>
      kids.find((k) => k.type === "branchMarker" && k.data?.label === label) ||
      { id: newId("branch"), type: "branchMarker", data: { label } };
    const nextChild = () =>
      kids.find((k) => k.type !== "branchMarker" && !visited.has(k.id)) ||
      { id: newId("slot"), type: "placeholder", data: {} };

    if (node.type === "dtmf") {
      [...sortKeys(node.data?.config?.keys || []), OTHER_LABEL].forEach((label) => link(markerFor(label)));
      return;
    }

    link(nextChild());
    if (node.type === "callTransfer") link(markerFor(NO_ANSWER_LABEL));
  };

  visit(start);
  return { nodes: outNodes, edges: outEdges };
};

const subtreeIds = (edges, rootId) => {
  const ids = new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    edges.forEach((e) => {
      if (ids.has(e.source) && !ids.has(e.target)) {
        ids.add(e.target);
        grew = true;
      }
    });
  }
  return ids;
};

// Counts configured steps below (and including) a node — used to decide
// whether a destructive change needs confirmation.
export const countSteps = (nodes, edges, rootId) => {
  const ids = subtreeIds(edges, rootId);
  return nodes.filter((n) => ids.has(n.id) && !isStructural(n.type) && n.type !== "hangup").length;
};

const createModuleNode = (type) => ({ id: newId(type), type, data: { config: {} } });

// "+" on an edge between two real steps: splice the new step in. Steps with a
// "next" keep the downstream chain; a DTMF keeps it under its "Other" branch
// (moved to the first key once keys are picked); a Hangup ends the path there.
export const insertOnEdge = (nodes, edges, edgeId, type) => {
  const edge = edges.find((e) => e.id === edgeId);
  if (!edge) return { nodes, edges, createdId: null };

  const created = createModuleNode(type);
  let nextNodes = [...nodes, created];
  let nextEdges = [...edges.filter((e) => e.id !== edgeId), makeEdge(edge.source, created.id)];

  if (type === "dtmf") {
    const other = { id: newId("branch"), type: "branchMarker", data: { label: OTHER_LABEL } };
    nextNodes = [...nextNodes, other];
    nextEdges = [...nextEdges, makeEdge(created.id, other.id), makeEdge(other.id, edge.target)];
  } else if (type !== "hangup") {
    nextEdges = [...nextEdges, makeEdge(created.id, edge.target)];
  }

  return { ...normalizeFlow(nextNodes, nextEdges), createdId: created.id };
};

// "+" on an empty slot: replace the placeholder with the chosen step.
export const fillPlaceholder = (nodes, edges, placeholderId, type) => {
  const parentEdge = edges.find((e) => e.target === placeholderId);
  if (!parentEdge) return { nodes, edges, createdId: null };

  const created = createModuleNode(type);
  const nextNodes = [...nodes.filter((n) => n.id !== placeholderId), created];
  const nextEdges = [...edges.filter((e) => e.id !== parentEdge.id), makeEdge(parentEdge.source, created.id)];
  return { ...normalizeFlow(nextNodes, nextEdges), createdId: created.id };
};

// Removing a step reconnects its parent to its "next" child. Branch paths
// (DTMF keys, Call Transfer's No Answer) go with it; DTMF and Hangup have no
// "next", so they leave an empty slot behind.
export const removeNode = (nodes, edges, nodeId) => {
  const node = nodes.find((n) => n.id === nodeId);
  const parentEdge = edges.find((e) => e.target === nodeId);
  if (!node || !parentEdge || node.type === "start") return { nodes, edges };

  const childEdges = edges.filter((e) => e.source === nodeId);
  const nextEdge = childEdges.find((e) => nodes.find((n) => n.id === e.target)?.type !== "branchMarker");

  const dropped = new Set([nodeId]);
  childEdges
    .filter((e) => e !== nextEdge)
    .forEach((e) => subtreeIds(edges, e.target).forEach((id) => dropped.add(id)));

  const nextEdges = edges.filter((e) => !dropped.has(e.source) && !dropped.has(e.target));
  if (nextEdge) nextEdges.push(makeEdge(parentEdge.source, nextEdge.target));
  return normalizeFlow(nodes.filter((n) => !dropped.has(n.id)), nextEdges);
};

// Saves a step's config. For DTMF, the first time keys are picked, whatever
// was inherited under "Other" moves to the first key so it isn't buried.
export const applyConfig = (nodes, edges, nodeId, config) => {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return { nodes, edges };

  let nextNodes = nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, config } } : n));
  let nextEdges = edges;

  const prevKeys = node.data?.config?.keys || [];
  const newKeys = sortKeys(config.keys || []);
  if (node.type === "dtmf" && prevKeys.length === 0 && newKeys.length > 0) {
    const otherMarker = edges
      .filter((e) => e.source === nodeId)
      .map((e) => nodes.find((n) => n.id === e.target))
      .find((n) => n?.type === "branchMarker" && n.data?.label === OTHER_LABEL);
    const inheritedEdge = otherMarker && edges.find((e) => e.source === otherMarker.id);
    const inherited = inheritedEdge && nodes.find((n) => n.id === inheritedEdge.target);

    if (inherited && inherited.type !== "placeholder") {
      const firstMarker = { id: newId("branch"), type: "branchMarker", data: { label: newKeys[0] } };
      nextNodes = [...nextNodes, firstMarker];
      nextEdges = [
        ...edges.filter((e) => e.id !== inheritedEdge.id),
        makeEdge(nodeId, firstMarker.id),
        makeEdge(firstMarker.id, inherited.id),
      ];
    }
  }

  return normalizeFlow(nextNodes, nextEdges);
};

// Persisted shape: placeholders are derived, so they're stripped out.
export const serializeFlow = (nodes, edges) => {
  const kept = nodes.filter((n) => n.type !== "placeholder");
  const keptIds = new Set(kept.map((n) => n.id));
  return {
    nodes: kept.map(({ id, type, data }) => ({ id, type, data })),
    edges: edges.filter((e) => keptIds.has(e.target)).map(({ id, source, target }) => ({ id, source, target })),
  };
};

// ─── Layout ──────────────────────────────────────────────────────────────

const CARD = [220, 56];
const SIBLING_SPACING = 248; // center-to-center between branches of one step
const SUBTREE_GAP = 48; // minimum clear space between neighbouring subtrees on a row

const isPillLabel = (label = "") => label.length > 1;

export const sizeOf = (node) => {
  if (node.type === "placeholder") return [32, 32];
  if (node.type === "branchMarker") {
    const label = node.data?.label || "";
    // Pills render 40px tall inside the 48px box so every marker shares a row.
    return [isPillLabel(label) ? Math.max(96, label.length * 8 + 32) : 48, 48];
  }
  return CARD;
};

// Vertical space between a parent's bottom and this node's top. A placeholder
// sits where the "+" of a step-to-step edge would be, so "+"s line up on a row.
const STEP_GAP = 130;
const gapAbove = (node) => {
  if (node.type === "branchMarker") return 124;
  if (node.type === "placeholder") return STEP_GAP / 2 - 16;
  return STEP_GAP;
};

// Tidy tree (Reingold–Tilford style). Each subtree is laid out on its own and
// described by a contour: the [left, right] extent of its nodes on every row
// below it. Siblings are placed left to right, each pushed right only as far
// as needed to clear the rows it actually shares with the ones already placed
// — so a short branch can tuck in beside a deep one — and never closer than
// SIBLING_SPACING. The parent is then centered over its first and last child.
const layoutX = (rootId, byId, kids) => {
  const layout = (id) => {
    const [w] = sizeOf(byId.get(id));
    const children = kids.get(id) || [];
    if (!children.length) return { offsets: new Map([[id, 0]]), contour: [[-w / 2, w / 2]] };

    const subtrees = children.map(layout);
    const centers = [];
    const merged = [];

    subtrees.forEach((sub, i) => {
      let x = 0;
      if (i > 0) {
        x = centers[i - 1] + SIBLING_SPACING;
        sub.contour.forEach(([left], row) => {
          if (merged[row]) x = Math.max(x, merged[row][1] - left + SUBTREE_GAP);
        });
      }
      centers.push(x);
      sub.contour.forEach(([left, right], row) => {
        merged[row] = merged[row]
          ? [Math.min(merged[row][0], left + x), Math.max(merged[row][1], right + x)]
          : [left + x, right + x];
      });
    });

    const mid = (centers[0] + centers[centers.length - 1]) / 2;
    const offsets = new Map([[id, 0]]);
    subtrees.forEach((sub, i) => sub.offsets.forEach((ox, nodeId) => offsets.set(nodeId, ox + centers[i] - mid)));

    return {
      offsets,
      contour: [[-w / 2, w / 2], ...merged.map(([left, right]) => [left - mid, right - mid])],
    };
  };

  return layout(rootId).offsets;
};

export const layoutFlow = (nodes, edges) => {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const kids = new Map();
  edges.forEach((e) => kids.set(e.source, [...(kids.get(e.source) || []), e.target]));

  const root = nodes.find((n) => n.type === "start");
  if (!root) return [];

  const centerX = layoutX(root.id, byId, kids);

  const topY = new Map();
  const placeY = (id, top) => {
    topY.set(id, top);
    const bottom = top + sizeOf(byId.get(id))[1];
    (kids.get(id) || []).forEach((k) => placeY(k, bottom + gapAbove(byId.get(k))));
  };
  placeY(root.id, 0);

  // Reading-order step numbers (#1, #2, ...) for real steps only.
  const seq = new Map();
  const queue = [root.id];
  while (queue.length) {
    const id = queue.shift();
    if (!isStructural(byId.get(id).type)) seq.set(id, seq.size + 1);
    queue.push(...(kids.get(id) || []));
  }

  return nodes.map((n) => {
    const [width, height] = sizeOf(n);
    const inset = n.type === "branchMarker" && isPillLabel(n.data?.label) ? 4 : 0;
    return {
      ...n,
      position: { x: (centerX.get(n.id) ?? 0) - width / 2, y: topY.get(n.id) ?? 0 },
      width,
      height,
      // Sizes are fixed, so hand React Flow the dimensions and handle anchors
      // up front. Otherwise every re-layout creates fresh node objects, React
      // Flow drops their measured handle bounds, and edges stop rendering.
      measured: { width, height },
      handles: [
        { type: "target", position: "top", x: width / 2 - 0.5, y: inset, width: 1, height: 1 },
        { type: "source", position: "bottom", x: width / 2 - 0.5, y: height - 1 - inset, width: 1, height: 1 },
      ],
      data: { ...n.data, seq: seq.get(n.id) },
    };
  });
};
