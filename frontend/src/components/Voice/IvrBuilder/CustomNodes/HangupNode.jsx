import { CloseCircleOutlined } from "@ant-design/icons";
import FlowCard from "./FlowCard";

// Terminal step. Removing it leaves an empty "+" slot in its place.
const HangupNode = ({ id, data = {} }) => (
  <FlowCard
    id={id}
    seq={data.seq}
    color="#BF5B42"
    icon={CloseCircleOutlined}
    label="Hangup"
    subtitle="End"
    onDelete={data.onDelete}
    hasSource={false}
  />
);

export default HangupNode;
