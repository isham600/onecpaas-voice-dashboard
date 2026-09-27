import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaCheckCircle } from "react-icons/fa";
import axios from "axios";

const baseURL = import.meta.env.VITE_BASE_URL;

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [txnid, setTxnid] = useState("");
  const [amount, setAmount] = useState("");
  const [creditAmount, setCreditAmount] = useState(null);
  const [service, setService] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(""); // 👈 Add state for error message

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const txn = queryParams.get("txnid");
    const amt = queryParams.get("amount");

    if (txn && amt) {
      setTxnid(txn);
      setAmount(amt);

      const fetchTransaction = async () => {
        try {
          const res = await axios.post(
            `${baseURL}/api/addfunds/auth/payment-success`,
            { txnid: txn },
          );

          if (res.data.status === 1) {
            setCreditAmount(res.data.credit);
            setService(res.data.service);
          } else {
            setErrorMessage(res.data.message || "Transaction not found.");
          }
        } catch (err) {
          const msg =
            err?.response?.data?.message ||
            "An error occurred while verifying your payment.";
          setErrorMessage(msg); // 👈 Set extracted error message
          console.error("Error verifying payment:", msg);
        } finally {
          setLoading(false);
        }
      };

      fetchTransaction();
    } else {
      navigate("/dashboard");
    }
  }, [location.search, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-50 text-center px-6">
      <FaCheckCircle className="text-green-500 text-6xl mb-4" />
      <h1 className="text-3xl font-bold text-green-600 mb-2">
        Payment Successful!
      </h1>
      <p className="text-lg mb-4 text-gray-700">
        Your payment was completed successfully.
      </p>

      <div className="bg-white shadow rounded-lg p-6 w-full max-w-md text-left">
        <p className="font-medium mb-2">
          <strong>Transaction ID:</strong> {txnid}
        </p>
        <p className="font-medium mb-2">
          <strong>Amount Paid:</strong> ₹{parseFloat(amount).toFixed(2)}
        </p>

        {loading ? (
          <p className="text-gray-500">Verifying payment...</p>
        ) : errorMessage ? (
          <p className="text-red-500 font-medium">
            {errorMessage} contact to your Reseller
          </p> // 👈 Show error message
        ) : (
          <p className="font-medium text-green-700">
            <strong>{service}:</strong> {creditAmount}
          </p>
        )}
      </div>

      <button
        className="mt-6 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
        onClick={() => navigate("/dashboard")}
      >
        Go to Dashboard
      </button>
    </div>
  );
};

export default PaymentSuccess;
