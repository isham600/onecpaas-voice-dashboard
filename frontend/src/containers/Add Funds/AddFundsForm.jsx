import { message } from "antd";
import { useEffect, useState } from "react";

const AddFundsForm = ({ onBack, onNext, amount }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: amount,
    company: "",
    gst: "",
    name: "",
    mobile: "",
    email: "",
    country: "",
    state: "",
    city: "",
    pincode: "",
    address: "",
  });

  useEffect(() => {
    let timeout;
    if (loading) {
      timeout = setTimeout(() => {
        setLoading(false);
      }, 2000); // 1 second
    }
    return () => clearTimeout(timeout); // cleanup
  }, [loading]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    const { company, name, mobile, email, pincode, address, gst } = formData;

    if (!company || !name || !mobile || !email || !pincode || !address) {
      message.error("Please fill all required fields marked with *.");
      return false;
    }

    if (!/^\d{10}$/.test(mobile)) {
      message.error("Please enter a valid 10-digit mobile number.");
      return false;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      message.error("Please enter a valid email address.");
      return false;
    }

    if (!/^\d{4,10}$/.test(pincode)) {
      message.error("Please enter a valid pincode.");
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    setLoading(true);
    onNext(formData); // Call parent handler
  };

  return (
    <div className="w-full  mx-auto bg-white rounded-2xl p-6">
      <h2 className="text-2xl font-bold text-blue-600 mb-6">Billing Details</h2>

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Company */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">
            Company <span className="text-red-500">*</span>
          </label>
          <input
            name="company"
            value={formData.company}
            onChange={handleChange}
            placeholder="Enter company"
            className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-blue-500"
          />
        </div>

        {/* GST */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">
            GST No.<span className="text-red-500">*</span>
          </label>
          <input
            name="gst"
            value={formData.gst}
            onChange={handleChange}
            placeholder="Enter GST no."
            className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-blue-500"
          />
        </div>

        {/* Name */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your name"
            className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-blue-500"
          />
        </div>

        {/* Mobile */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">
            Mobile Number <span className="text-red-500">*</span>
          </label>
          <input
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
            placeholder="Enter your mobile number"
            className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-blue-500"
          />
        </div>

        {/* Email */}
        <div className="md:col-span-2">
          <label className="text-sm font-semibold text-gray-700 mb-1 block">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-blue-500"
          />
        </div>

        {/* Country */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">
            Country
          </label>
          <input
            name="country"
            value={formData.country}
            onChange={handleChange}
            placeholder="country"
            className="border border-gray-300 bg-blue-50 rounded px-3 py-2 w-full focus:outline-blue-500"
          />
        </div>

        {/* State */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">
            State/Province
          </label>
          <input
            name="state"
            value={formData.state}
            onChange={handleChange}
            placeholder="State/Province"
            className="border border-gray-300 bg-blue-50 rounded px-3 py-2 w-full focus:outline-blue-500"
          />
        </div>

        {/* Pincode */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">
            Pincode <span className="text-red-500">*</span>
          </label>
          <input
            name="pincode"
            value={formData.pincode}
            onChange={handleChange}
            placeholder="pincode"
            className="border border-gray-300 bg-blue-50 rounded px-3 py-2 w-full focus:outline-blue-500"
          />
        </div>

        {/* City */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">
            City
          </label>
          <input
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="City"
            className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-blue-500"
          />
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <label className="text-sm font-semibold text-gray-700 mb-1 block">
            Address <span className="text-red-500">*</span>
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Address"
            className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-blue-500"
            rows="3"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          className="text-blue-600 font-medium hover:underline"
          onClick={onBack}
        >
          &lt; Back
        </button>
        <button
          className={`py-2 px-6 rounded-xl font-semibold transition ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Processing..." : "Next"}
        </button>
      </div>
    </div>
  );
};

export default AddFundsForm;
