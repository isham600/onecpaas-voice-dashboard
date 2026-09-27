import TransactionLog from "../../components/TransactionLog/TransactionLog";
const TransactionLogs = ({ user, setUser }) => {
  return <TransactionLog user={user} setUser={setUser} />;
};

export default TransactionLogs;
