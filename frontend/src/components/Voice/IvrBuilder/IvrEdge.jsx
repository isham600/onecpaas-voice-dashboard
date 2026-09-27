import { memo } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";
import { PlusOutlined } from "@ant-design/icons";

// Dotted connector. Between two real steps it carries a "+" at the midpoint
// to insert a step there; into a branch label or an empty slot it doesn't.
const IvrEdge = memo(({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data = {} }) => {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{ stroke: "#475569", strokeWidth: 1.25, strokeDasharray: "2 3" }}
      />
      {data.showAdd && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
          >
            <button
              type="button"
              title="Insert a step here"
              onClick={() => data.onInsert?.(id)}
              className="w-7 h-7 rounded-full border-2 border-dashed border-blue-500 bg-white transition-transform hover:scale-110"
              style={{ padding: 3 }}
            >
              <span className="w-full h-full rounded-full bg-blue-600 text-white flex items-center justify-center">
                <PlusOutlined style={{ fontSize: 10 }} />
              </span>
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

IvrEdge.displayName = "IvrEdge";

export default IvrEdge;
