import { Handle, Position } from "@xyflow/react";
import { PlusOutlined } from "@ant-design/icons";
import { HIDDEN_HANDLE } from "./FlowCard";

// An empty slot at the end of a path — clicking it (via onNodeClick) opens
// the module picker to add the next step here.
const PlaceholderNode = () => (
  <div
    title="Add a step"
    className="w-full h-full rounded-full border-2 border-dashed border-blue-500 bg-white cursor-pointer transition-transform hover:scale-110"
    style={{ padding: 3 }}
  >
    <Handle type="target" position={Position.Top} isConnectable={false} className={HIDDEN_HANDLE} />
    <div className="w-full h-full rounded-full bg-blue-600 text-white flex items-center justify-center">
      <PlusOutlined style={{ fontSize: 10 }} />
    </div>
  </div>
);

export default PlaceholderNode;
