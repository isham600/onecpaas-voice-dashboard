import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaTimesCircle } from "react-icons/fa";
import axios from "axios";

const baseURL = import.meta.env.VITE_BASE_URL;

const PaymentFailed = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [txnid, setTxnid] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const txn = queryParams.get("txnid");

    if (!txn) {
      navigate("/dashboard"); // fallback if no txnid
      return;
    }

    setTxnid(txn);

    const markPaymentFailed = async () => {
      try {
        const res = await axios.post(
          `${baseURL}/api/addfunds/auth/payment-failed`,
          { txnid: txn },
        );

        if (res.data.status !== 1) {
          setError(res.data.message || "Could not mark payment as failed.");
        }
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          "Failed to update transaction status.";
        console.error("Payment Failure Error:", msg);
        setError(msg);
      }
    };

    markPaymentFailed();
  }, [location.search, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 text-center px-6">
      <FaTimesCircle className="text-red-500 text-6xl mb-4" />
      <h1 className="text-3xl font-bold text-red-600 mb-2">Payment Failed</h1>
      <p className="text-lg mb-4 text-gray-700">
        We were unable to complete your transaction.
      </p>

      <div className="bg-white shadow rounded-lg p-6 w-full max-w-md text-left">
        <p className="font-medium mb-2">
          <strong>Transaction ID:</strong> {txnid}
        </p>
        {error && <p className="text-red-500 text-sm mt-2">Error: {error}</p>}
      </div>

      <button
        className="mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
        onClick={() => navigate("/dashboard")}
      >
        Go to Dashboard
      </button>
    </div>
  );
};

export default PaymentFailed;
