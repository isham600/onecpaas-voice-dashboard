import { PhoneOutlined } from "@ant-design/icons";
import FlowCard from "./FlowCard";

const StartNode = ({ id, data = {} }) => (
  <FlowCard
    id={id}
    seq={data.seq}
    color="#5B8DB8"
    icon={PhoneOutlined}
    label="Start"
    subtitle="answer this call"
    hasTarget={false}
  />
);

export default StartNode;
