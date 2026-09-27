import { Tabs } from "antd";
import TicketList from "./TicketList";
import StatementReport from "./StatementReport";
import ServiceSummaryReport from "./ServiceSummaryReport";
import MonthlySummaryReport from "./MonthlySummaryReport";
import DownlineSummaryReport from "./DownlineSummaryReport";

const TransactionLog = ({ user, setUser }) => {
  return (
    <div className="px-4 pt-4">
      <Tabs
        defaultActiveKey="statement"
        items={[
          {
            key: "statement",
            label: "Debit / Credit Statement",
            children: <StatementReport />,
          },
          {
            key: "service-summary",
            label: "Service Purchase & Usage Summary",
            children: <ServiceSummaryReport />,
          },
          {
            key: "monthly-summary",
            label: "Monthly Summary",
            children: <MonthlySummaryReport />,
          },
          {
            key: "downline-summary",
            label: "User Report",
            children: <DownlineSummaryReport />,
          },
          {
            key: "raw",
            label: "Raw Log",
            children: <TicketList user={user?.username} />,
          },
        ]}
      />
    </div>
  );
};

export default TransactionLog;
