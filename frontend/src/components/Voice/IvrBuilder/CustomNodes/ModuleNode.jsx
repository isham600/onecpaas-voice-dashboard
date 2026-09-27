import FlowCard from "./FlowCard";
import { getModuleMeta, summarizeModule } from "../moduleTypes";

// Card for every configurable step (announcement, dtmf, longDtmf, webhook,
// callTransfer). DTMF's key branches are separate branchMarker nodes.
const ModuleNode = ({ id, type, data = {} }) => {
  const meta = getModuleMeta(type);

  return (
    <FlowCard
      id={id}
      seq={data.seq}
      color="#5B8DB8"
      icon={meta.icon}
      label={meta.shortLabel}
      subtitle={summarizeModule(type, data.config)}
      onEdit={data.onEdit}
      onDelete={data.onDelete}
    />
  );
};

export default ModuleNode;
