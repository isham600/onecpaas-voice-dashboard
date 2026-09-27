import { useState, useEffect, useContext } from "react";
import AddFundsForm from "./AddFundsForm";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWallet,
  faMicrophone,
  faEdit,
} from "@fortawesome/free-solid-svg-icons";
import CryptoJS from "crypto-js";
import { getProfileMe } from "../../services/api";
import { AppContext } from "../../utils/Context";
import { message } from "antd";

const AddFunds = () => {
  const [activeTab, setActiveTab] = useState("wallet");
  const [creditAmount, setCreditAmount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [billingDetails, setBillingDetails] = useState({
    company: "Indew Technology",
    country: "India",
  });
  const [isEditingBilling, setIsEditingBilling] = useState(false);
  const [creditTypes, setCreditTypes] = useState([]);
  const [selectedCreditType, setSelectedCreditType] = useState("");

  const { user, updateUser } = useContext(AppContext);

  useEffect(() => {
    const fetchCreditTypes = async () => {
      try {
        const response = await getProfileMe();
        const credits = response?.data?.data?.credits;

        if (credits) {
          const creditKeys = Object.keys(credits).filter(
            (key) => !["id", "username", "created_at", "updated_at"].includes(key),
          );
          setCreditTypes(creditKeys);
        } else {
          message.error("Failed to fetch credit types");
        }
      } catch (error) {
        message.error("Error fetching credit types");
      }
    };

    fetchCreditTypes();
  }, []);

  const multipliers = {
    whatsapp_marketing_credits: 0.72,
    bulk_whatsapp_credits: 89,
    whatsapp_utility_credits: 0.6,
    whatsapp_credits: 0.5,
    sms_credits: 0.2,
    voice_credits: 0.8,
    rcs_credits: 1,
    ai_videos_credits: 5,
    email_credits: 0.1,
    instagram_credits: 3,
    telegram_credits: 2,
  };

  const handleAddCreditAmount = (value) => {
    setCreditAmount((prev) => prev + value);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (/^\d+$/.test(value) || value === "") {
      setCreditAmount(Number(value));
    } else {
      message.error("Only positive whole numbers are allowed.");
    }
  };

  const handleProceed = () => {
    if (creditAmount <= 0 || !selectedCreditType) {
      message.error(
        "Please select credit type and enter a valid credit amount.",
      );
      return;
    }
    setShowForm(true);
  };

  const handleFormBack = () => {
    setShowForm(false);
  };

  const handlePayUIntegration = (formData) => {
    if (!formData.name || !formData.email || !formData.mobile) {
      message.error("Please complete all required fields before proceeding.");
      return;
    }

    const MERCHANT_KEY = "pxFzD35x";
    const SALT = "3xOUWFBy4D";
    const PAYU_URL = "https://secure.payu.in/_payment";
    const txnid = `Txn${Date.now()}`;
    const multiplier = multipliers[selectedCreditType] || 1;
    const baseAmount = creditAmount * multiplier;
    const gstAmount = baseAmount * 0.18;
    const totalPayable = baseAmount + gstAmount;

    const hashString = `${MERCHANT_KEY}|${txnid}|${totalPayable}|Add Funds|${formData.name}|${formData.email}|||||||||||${SALT}`;
    const hash = CryptoJS.SHA512(hashString).toString(CryptoJS.enc.Hex);

    const successUrl = `${window.location.origin}/payment-success?txnid=${txnid}&amount=${totalPayable}`;

    const payuForm = document.createElement("form");
    payuForm.action = PAYU_URL;
    payuForm.method = "POST";

    const formFields = {
      key: MERCHANT_KEY,
      txnid,
      amount: totalPayable,
      productinfo: "Add Funds",
      firstname: formData.name,
      email: formData.email,
      phone: formData.mobile,
      surl: successUrl,
      furl: `${window.location.origin}/dashboard`,
      hash,
    };

    Object.entries(formFields).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      payuForm.appendChild(input);
    });

    document.body.appendChild(payuForm);
    message.success("Redirecting to PayU for payment...");
    payuForm.submit();
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white ">
      {!showForm ? (
        <>
          <h2 className="text-xl font-semibold mb-4">Add Funds</h2>

          <div className="flex border rounded-lg overflow-hidden mb-4">
            <button
              className={`flex-1 p-3 flex items-center justify-center gap-2 ${
                activeTab === "wallet"
                  ? "bg-blue-100 text-blue-600"
                  : "bg-white"
              }`}
              onClick={() => setActiveTab("wallet")}
            >
              <FontAwesomeIcon icon={faWallet} /> Add Fund to Wallet
            </button>
            <button
              className={`flex-1 p-3 flex items-center justify-center gap-2 ${
                activeTab === "voice" ? "bg-blue-100 text-blue-600" : "bg-white"
              }`}
              onClick={() => setActiveTab("voice")}
            >
              <FontAwesomeIcon icon={faMicrophone} /> Add Fund to Voice
            </button>
          </div>

          <p className="text-red-500 mb-3 text-sm text-center">
            You will need to complete KYC even after purchasing balance.
          </p>

          <label className="font-semibold mb-2 block">
            Select Credit Type *
          </label>
          <select
            className="w-full border p-2 rounded mb-4"
            value={selectedCreditType}
            onChange={(e) => setSelectedCreditType(e.target.value)}
          >
            <option value="">-- Select Credit Type --</option>
            {creditTypes.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ").toUpperCase()}
              </option>
            ))}
          </select>

          <div className="text-center mb-4">
            <input
              type="text"
              className="text-center text-3xl font-bold w-full border-b p-2 focus:outline-none"
              value={creditAmount}
              onChange={handleInputChange}
              placeholder="Enter credit amount (only positive integers)"
            />
          </div>

          <div className="flex gap-2 mb-4 justify-center">
            {[10000, 20000, 25000, 50000, 100000].map((val) => (
              <button
                key={val}
                className="bg-gray-200 rounded-full px-4 py-2 text-sm"
                onClick={() => handleAddCreditAmount(val)}
              >
                + {val.toLocaleString()}
              </button>
            ))}
          </div>

          {selectedCreditType && (
            <div className="border rounded-lg p-4 mb-4 text-sm bg-gray-50">
              <p>
                Credit Amount:{" "}
                <span className="float-right">₹ {creditAmount}</span>
              </p>
              <p>
                Multiplied Value ({multipliers[selectedCreditType]}):
                <span className="float-right">
                  ₹{" "}
                  {(
                    creditAmount * (multipliers[selectedCreditType] || 1)
                  ).toFixed(2)}
                </span>
              </p>
              <p>
                GST (18%):{" "}
                <span className="float-right">
                  ₹{" "}
                  {(
                    creditAmount *
                    (multipliers[selectedCreditType] || 1) *
                    0.18
                  ).toFixed(2)}
                </span>
              </p>
              <p className="font-semibold">
                Total Payable:{" "}
                <span className="float-right">
                  ₹{" "}
                  {(
                    creditAmount * (multipliers[selectedCreditType] || 1) +
                    creditAmount * (multipliers[selectedCreditType] || 1) * 0.18
                  ).toFixed(2)}
                </span>
              </p>
            </div>
          )}

          <div className="border rounded-lg p-4 mb-4 text-sm">
            <div className="flex justify-between mb-1">
              <p className="font-semibold">Billing Details</p>
              <button
                className="text-blue-500 text-sm flex items-center gap-1"
                onClick={() => setIsEditingBilling(!isEditingBilling)}
              >
                <FontAwesomeIcon icon={faEdit} />{" "}
                {isEditingBilling ? "Save" : "Edit"}
              </button>
            </div>
            {!isEditingBilling ? (
              <>
                <p>{billingDetails.company}</p>
                <p>{billingDetails.country}</p>
              </>
            ) : (
              <>
                <input
                  type="text"
                  name="company"
                  value={billingDetails.company}
                  onChange={(e) =>
                    setBillingDetails({
                      ...billingDetails,
                      company: e.target.value,
                    })
                  }
                  className="border-b w-full mb-2 p-1"
                  placeholder="Company Name"
                />
                <input
                  type="text"
                  name="country"
                  value={billingDetails.country}
                  onChange={(e) =>
                    setBillingDetails({
                      ...billingDetails,
                      country: e.target.value,
                    })
                  }
                  className="border-b w-full p-1"
                  placeholder="Country"
                />
              </>
            )}
          </div>

          <button
            className="w-full bg-blue-600 text-white py-3 rounded-xl mb-4 text-lg font-semibold"
            onClick={handleProceed}
          >
            Proceed to Pay
          </button>

          <div className="bg-blue-100 p-4 rounded-xl text-sm">
            <p className="font-semibold mb-1">
              Create E-Mandate{" "}
              <span className="text-green-600">(Recommended)</span>
            </p>
            <p>
              Create an e-mandate to avoid entering your card repeatedly.
              Automate future payments easily.
            </p>
          </div>
        </>
      ) : (
        <AddFundsForm
          amount={creditAmount}
          onBack={handleFormBack}
          onNext={(data) => handlePayUIntegration(data)}
        />
      )}
    </div>
  );
};

export default AddFunds;
