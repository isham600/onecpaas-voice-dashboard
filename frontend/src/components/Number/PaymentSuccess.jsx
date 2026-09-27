import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Extract payment details from the URL
    const queryParams = new URLSearchParams(location.search);
    const txnid = queryParams.get("txnid");
    const amount = queryParams.get("amount");

    // Log success details in the console
    console.log("✅ Payment Successful!");
    console.log("Transaction ID:", txnid);
    console.log("Amount Paid: ₹", amount);

    // Show a success message
    alert("Payment Successful! Redirecting to Home Page...");

    // Redirect to home after 3 seconds
    setTimeout(() => {
      navigate("/dashboard/numbers/activeNumbers");
    }, 3000);
  }, [location, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-3xl font-bold text-green-500">
        🎉 Payment Successful!
      </h2>
      <p className="text-lg mt-3">Thank you for your payment.</p>
      <p className="text-md mt-2">Redirecting to home page...</p>
    </div>
  );
};

export default PaymentSuccess;
