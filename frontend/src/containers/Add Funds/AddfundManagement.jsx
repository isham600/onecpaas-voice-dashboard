import { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import { getProfileMe } from "../../services/api";
import { AppContext } from "../../utils/Context";
import axios from "axios";

import AddFundsForm from "./AddFundsForm";
import Modal from "../../components/Modal/index";
import { message } from "antd";
import handleApiError from "../../utils/errorHandler";
import displayChannelName from "../../utils/channelNames";

const baseURL = import.meta.env.VITE_BASE_URL;

const FundsManagementModal = ({ clientUsername, handleClose }) => {
  const [selectedService, setSelectedService] = useState(""); // Selected service
  const [credits, setCredits] = useState("");
  const [pricePerCredit, setPricePerCredit] = useState("");
  const [actionType, setActionType] = useState("Deduct");
  const [description, setDescription] = useState("");
  const [services, setServices] = useState([]); // For storing user-specific services
  const [mappedServices, setMappedServices] = useState([]);
  const [loading, setLoading] = useState(false);

  // replacing hardcoded services and credits values with table values
  const [multipliers, setMultipliers] = useState({});
  useEffect(() => {
    const fetchMultipliers = async () => {
      try {
        const response = await axios.get(
          `${baseURL}/v1/addfunds/auth/multipliers`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        if (response.data.status === 1) {
          const data = response.data.multipliers;

          // Convert all values to Number
          const converted = {};
          for (const key in data) {
            converted[key] = parseFloat(data[key]);
          }
          setMultipliers(converted);
        } else {
          message.error("Failed to fetch multipliers");
        }
      } catch (error) {
        handleApiError(error);
      }
    };

    fetchMultipliers();
  }, []);

  const [resellerCredits, setResellerCredits] = useState({});
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await axios.post(
          `${baseURL}/v1/addfunds/auth/get-credits`,
          { username: user?.username },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );

        if (response.data.status === 1) {
          const data = response.data.data;

          // Convert all values to Number
          const converted = {};
          for (const key in data) {
            converted[key] = parseFloat(data[key]);
          }
          setResellerCredits(converted);
        } else {
          message.error("Failed to fetch Reseller Credits");
        }
      } catch (error) {
        handleApiError(error);
      }
    };

    fetchCredits();
  }, []);

  //hide next form
  const [hideForm, setHideForm] = useState(true);

  const { user, updateUser } = useContext(AppContext);

  // Fetch user-specific services from backend when the modal opens
  useEffect(() => {
    const fetchUserServices = async () => {
      setLoading(true);
      try {
        // Fetch profile data once (cached) — provides credits and channels
        const profileResponse = await getProfileMe();
        const profileData = profileResponse?.data?.data || {};
        const creditsData = profileData.credits || {};
        const creditsDataClient = profileData.credits || {};
        const channelsData = profileData.channels || [];
        const permissionsData = profileData.permissions || {};

        // Derive active services from permissions (value === 1)
        const activeServices = Object.entries(permissionsData)
          .filter(([, val]) => val === 1)
          .map(([key]) => key);

        // Create a map of back_end_name to front_end_name for easy lookup
        const channelsMap = channelsData.reduce((acc, channel) => {
          acc[channel.back_end_name] = displayChannelName(channel.front_end_name);
          return acc;
        }, {});

        // Custom mapping
        const customValueMapping = {
          Whatsapp_marketing: "whatsapp_marketing_credits",
          whatsapp_utility: "whatsapp_utility_credits",
          bulk_whatsapp: "bulk_whatsapp_credits",
        };

        // Step 3: Map services with their credits
        const mapped = activeServices.map((service) => ({
          clientCredits:
            creditsDataClient[
              service === "Whatsapp_marketing"
                ? "whatsapp_marketing_credits"
                : service === "whatsapp_utility"
                  ? "whatsapp_utility_credits"
                  : service === "bulk_whatsapp"
                    ? "bulk_whatsapp_credits"
                    : service === "instagram_credits"
                      ? "instagram_credits"
                      : service === "telegram"
                        ? "telegram_credits"
                        : service
            ] || 0,
          credits: creditsData[service] || 0, // Use credits data for the service
          value: customValueMapping[service] || service,
          label:
            channelsMap[
              service === "Whatsapp_marketing"
                ? "whatsapp_marketing_credits"
                : service === "whatsapp_utility"
                  ? "whatsapp_utility_credits"
                  : service === "bulk_whatsapp"
                    ? "bulk_whatsapp_credits"
                    : service === "instagram"
                      ? "instagram_credits"
                      : service === "telegram"
                        ? "telegram_credits"
                        : service
            ] || null, // Use front_end_name from channelsMap or fallback to service name
        }));

        // Step 4: Update state with fetched data
        setServices(activeServices);
        setMappedServices(mapped);
        setLoading(false);
      } catch (error) {
        // Handle errors from API calls
        if (error.response) {
          const { data } = error.response;
          if (data.errors) {
            for (const key in data.errors) {
              message.error(`${key}: ${data.errors[key].join(", ")}`);
            }
          } else {
            message.error(data.message || "An error occurred.");
          }
        } else {
          message.error("An unexpected error occurred.");
        }
      }
    };

    if (user) {
      fetchUserServices();
    }
  }, [user]);

  /// add fund code copy paste here 😎

  const [creditAmount, setCreditAmount] = useState(0);
  const [showForm, setShowForm] = useState(false);

  const [creditTypes, setCreditTypes] = useState([]);
  const [selectedCreditType, setSelectedCreditType] = useState("");

  useEffect(() => {
    const fetchCreditTypes = async () => {
      try {
        const response = await getProfileMe();
        const credits = response?.data?.data?.credits || {};
        const creditKeys = Object.keys(credits).filter(
          (key) => !["id", "username", "created_at", "updated_at"].includes(key),
        );
        setCreditTypes(creditKeys);
      } catch (error) {
        message.error("Error fetching credit types");
      }
    };

    fetchCreditTypes();
  }, []);

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
    setHideForm(false);
    setShowForm(true);
  };

  const handleFormBack = () => {
    setShowForm(false);
  };

  const handlePayUIntegration = async (formData) => {
    if (!formData.name || !formData.email || !formData.mobile) {
      message.error("Please complete all required fields before proceeding.");
      return;
    }

    try {
      const baseAmount =
        creditAmount * (multipliers[selectedCreditType] || 0.72);
      const gstAmount = baseAmount * 0.18;
      const totalPayable = baseAmount + gstAmount;
      const creditValue = multipliers[selectedCreditType] || 0.72;

      const savePayload = {
        username: user.username,
        creditAmount: creditAmount,
        amount: baseAmount,
        gst_amount: gstAmount,
        total_amount: totalPayable,
        credit_value: creditValue,
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        creditType: selectedCreditType,
        company: formData.company,
        country: formData.country,
        state: formData.state,
        city: formData.city,
        pincode: formData.pincode,
        address: formData.address,
        gst: formData.gst || "NA",
        paymentGateway: "PayU",
        paymentMode: "online",
        status: "pending",
      };

      // 1. First, Save the payment and get txnid
      const saveResponse = await axios.post(
        `${baseURL}/api/addfunds/auth/save-payment`,
        savePayload,
      );

      const txnid = saveResponse.data.txnid;

      if (!txnid) {
        message.error("Failed to get transaction ID.");
        return;
      }

      // 2. Call initiate-payment with the txnid from save-payment
      const initiatePayload = {
        ...savePayload,
        txnid,
      };

      const paymentResponse = await axios.post(
        `${baseURL}/api/addfunds/auth/initiate-payment`,
        initiatePayload,
      );

      if (paymentResponse.data.status !== 1) {
        message.error("Failed to initiate payment. Try again.");
        return;
      }

      const { formFields, gateway_url } = paymentResponse.data;

      // 3. Create form and submit to PayU
      const payuForm = document.createElement("form");
      payuForm.action = gateway_url;
      payuForm.method = "POST";

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
    } catch (error) {
      console.error("Payment API Error:", error.response.data.message);
      message.error(error.response.data.message);
    }
  };

  return (
    <div className="w-full mx-auto">
      {/* Title Section */}
      <div className="flex justify-center items-center  mb-12">
        <img
          src="/assets/images/png/funds.png"
          alt="profile"
          className="h-20"
        />
        <h2 className="text-2xl font-bold mb-4 ml-[-1rem]">Add Funds</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {/* Form Section */}
        <div>
          <label className="block mb-3 text-lg font-medium">
            Select Credit Type funds
          </label>

          {loading && (
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <svg
                className="animate-spin h-5 w-5 text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
              <span className="text-sm font-medium">Fetching services...</span>
            </div>
          )}

          <select
            className="w-full border p-2 rounded mb-4"
            value={selectedCreditType}
            onChange={(e) => setSelectedCreditType(e.target.value)}
            disabled={loading}
          >
            <option value="">
              {loading
                ? "Loading services..."
                : mappedServices.length === 0
                  ? "No services available"
                  : "Select a service"}
            </option>

            {!loading &&
              mappedServices
                .filter(
                  (service) =>
                    service.label !== null &&
                    service.label !== "AI Video Credits",
                )
                .map((service, idx) => (
                  <option key={idx} value={service.value}>
                    {service.label}
                  </option>
                ))}
          </select>

          <div className="p-6 max-w-xl mx-auto bg-white ">
            {!showForm ? (
              <>
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-bold mb-4">Add Credits</h2>

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
                      +{val.toLocaleString()}
                    </button>
                  ))}
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
              <AddFundsForm />
            )}
          </div>
        </div>

        {true && (
          <>
            <div className="border rounded-lg p-4 mb-4 text-sm bg-gray-50 h-32">
              <p>
                Total Credits:{" "}
                <span className="float-right">₹ {creditAmount}</span>
              </p>
              <p>
                Credit Value ({multipliers[selectedCreditType]}):
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
              <div className="mt-12 text-sm text-blue-600 font-bold font-serif">
                <p>
                  Available Reseller credits :-
                  <span className="float-right">
                    {" "}
                    {resellerCredits[selectedCreditType] || 0}
                  </span>
                </p>
              </div>
            </div>
          </>
        )}
      </div>
      <Modal
        isModalOpen={showForm}
        closeModal={() => setShowForm(false)}
        width="90%"
        // height="100%"
      >
        <AddFundsForm
          amount={creditAmount}
          onBack={handleFormBack}
          onNext={(data) => handlePayUIntegration(data)}
        />
      </Modal>
    </div>
  );
};

FundsManagementModal.propTypes = {
  handleClose: PropTypes.func.isRequired,
  user: PropTypes.string.isRequired, // Admin username
  clientUsername: PropTypes.string.isRequired, // Client username
};

export default FundsManagementModal;
