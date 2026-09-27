import { Handle, Position } from "@xyflow/react";
import { HIDDEN_HANDLE } from "./FlowCard";
import { OTHER_LABEL } from "../flowModel";

// A branch label: a circle for a single DTMF digit, a pill for word labels
// ("Other", "No Answer"). Pills sit 40px tall, centered in the 48px layout box.
const BranchNode = ({ data = {} }) => {
  const label = data.label || "";
  const isPill = label.length > 1;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <Handle type="target" position={Position.Top} isConnectable={false} className={HIDDEN_HANDLE} />
      <div
        className={`flex items-center justify-center rounded-full text-white text-sm font-medium whitespace-nowrap shadow-sm ${
          isPill ? "w-full h-10 px-3" : "w-full h-full"
        }`}
        style={{ background: "#8190A5", border: label === OTHER_LABEL ? "1px solid #F87171" : "none" }}
      >
        {label}
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={false} className={HIDDEN_HANDLE} />
    </div>
  );
};

export default BranchNode;
