import { useState, useEffect } from "react";
import Modal from "../Modal/index";
import axios from "axios";

const PurchaseDialog = ({
  showForm,
  handleFormClose,
  formData,
  handleInputChange,
  handleSubmit,
}) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [conditions, setConditions] = useState(false);
  const [terms, setTerms] = useState([]); // Store API response
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // API Endpoint
  const API_URL = `${import.meta.env.VITE_API_BASE_URL}/payment-terms`; // Replace with your actual API URL

  // Fetch Terms & Conditions from API
  const fetchTerms = async () => {
    try {
      const response = await axios.get(API_URL);
      setTerms(response.data.data || []); // Extract 'data' array from API response
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch terms.");
    } finally {
      setLoading(false);
    }
  };

  // Call API when component mounts
  useEffect(() => {
    fetchTerms();
  }, []);

  const handleCheckboxChange = (event) => {
    setTermsAccepted(event.target.checked);
  };

  return (
    <>
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] md:w-[500px]">
            <h2 className="text-center text-xl font-bold mb-4">
              🛒 Purchase Details
            </h2>
            <hr className="border-gray-300 mb-4" />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (termsAccepted) {
                  handleSubmit(e);
                }
              }}
            >
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="First Name"
                  required
                  className="border rounded-md p-2 w-full"
                />
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Last Name"
                  required
                  className="border rounded-md p-2 w-full"
                />
              </div>

              {/* Email Field */}
              <div className="mb-4">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email"
                  required
                  className="border rounded-md p-2 w-full"
                />
              </div>

              {/* Product Info */}
              <div className="mb-4">
                <input
                  type="text"
                  name="productInfo"
                  value={formData.productInfo}
                  onChange={handleInputChange}
                  placeholder="Product Info"
                  required
                  className="border rounded-md p-2 w-full"
                />
              </div>

              {/* Payment Summary */}
              <div className="bg-gray-100 p-4 rounded-lg mb-4">
                <h3 className="font-semibold text-lg mb-2">
                  💰 Payment Summary
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={`₹${formData.amount}`}
                    disabled
                    className="border rounded-md p-2 w-full bg-gray-200"
                  />
                  <input
                    type="text"
                    value={`GST (18%): ₹${formData.gstAmount.toFixed(2)}`}
                    disabled
                    className="border rounded-md p-2 w-full bg-gray-200"
                  />
                </div>
                <input
                  type="text"
                  value={`Total: ₹${(formData.totalAmount || 0).toFixed(2)}`}
                  disabled
                  className="border rounded-md p-2 w-full bg-gray-200 mt-2"
                />
              </div>

              {/* Terms & Conditions */}
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={handleCheckboxChange}
                  className="mr-2 w-5 h-5"
                />
                <button
                  type="button"
                  onClick={() => setConditions(true)}
                  className="text-blue-500 underline"
                >
                  I agree to the Terms and Conditions
                </button>
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={handleFormClose}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!termsAccepted}
                  className={`px-4 py-2 rounded-md text-white ${
                    termsAccepted
                      ? "bg-blue-500 hover:bg-blue-600"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  Proceed to Pay 💳
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Terms & Conditions Modal */}
      {conditions && (
        <Modal
          isModalOpen={conditions}
          closeModal={() => setConditions(false)}
          width="70vw"
          height="90vh"
        >
          <div className="overflow-y-auto max-h-[70vh] p-4 border rounded-md bg-gray-100 text-sm text-gray-700 mt-10">
            <h2 className="text-lg font-bold mb-2">📜 Terms & Conditions</h2>

            {loading && <p className="text-blue-500">Loading terms...</p>}
            {error && <p className="text-red-500">Error: {error}</p>}

            {!loading && !error && terms.length > 0
              ? terms.map((term) => (
                  <p key={term.id} className="mb-4">
                    <strong>
                      {term.id}. {term.title}:
                    </strong>{" "}
                    {term.description}
                  </p>
                ))
              : !loading && (
                  <p className="text-gray-500">No terms available.</p>
                )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default PurchaseDialog;
