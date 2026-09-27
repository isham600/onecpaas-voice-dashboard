import { useEffect, useState } from "react";
import CryptoJS from "crypto-js";
import { Spin } from "antd";
import {
  DollarCircleOutlined,
  PhoneOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import Button from "../Button/index";
import PurchaseDialog from "./PurchaseDialog";

const NumberDetailsModal = ({ number }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [conditions, setConditions] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    productInfo: "",
    amount: 0,
    gstAmount: 0,
    totalAmount: 0,
    txnid: "",
  });

  const MERCHANT_KEY = "pxFzD35x";
  const SALT = "3xOUWFBy4D";
  const PAYU_URL = "https://secure.payu.in/_payment";

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const newAmount =
      name === "amount"
        ? parseFloat(value) || 0
        : parseFloat(formData.amount) || 0;
    const gstAmount = newAmount * 0.18;
    const totalAmount = newAmount + gstAmount;

    setFormData({
      ...formData,
      [name]: name === "amount" ? newAmount : value,
      gstAmount: Number(gstAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
    });
  };

  const handleFormOpen = () => {
    setConditions(true);
    const txnid = `Txn${Date.now()}`;
    const amount = parseFloat(formData.amount) || 0;
    const gstAmount = amount * 0.18;
    const totalAmount = amount + gstAmount;
    setShowForm(true);

    setFormData((prev) => ({
      ...prev,
      txnid,
      gstAmount: Number(gstAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
    }));
  };

  const handleFormClose = () => {
    setConditions(false);
  };

  const generateHash = () => {
    const hashString = `${MERCHANT_KEY}|${formData.txnid}|${formData.totalAmount}|${formData.productInfo}|${formData.firstName}|${formData.email}|||||||||||${SALT}`;
    return CryptoJS.SHA512(hashString).toString(CryptoJS.enc.Hex);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const hash = generateHash();

      const successUrl = `${window.location.origin}/payment-success?txnid=${formData.txnid}&amount=${formData.totalAmount}`;

      const payuForm = document.createElement("form");
      payuForm.action = PAYU_URL;
      payuForm.method = "POST";

      const formFields = {
        key: MERCHANT_KEY,
        txnid: formData.txnid,
        amount: formData.totalAmount,
        productinfo: formData.productInfo,
        firstname: formData.firstName,
        email: formData.email,
        phone: number?.phone || "9876543210",
        surl: successUrl,
        furl: "https://your-failure-url.com",
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
      payuForm.submit();
    } catch (err) {
      console.error("Error initiating payment:", err);
      setError("Failed to initiate payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showForm && number) {
      setFormData((prev) => ({
        ...prev,
        productInfo: `Number ${number.number} Details`,
        amount: number?.monthly_fee || 0,
      }));
    }
  }, [showForm, number]);

  return (
    <div className="transition-transform duration-300 ease-in-out">
      <div className="flex justify-between mb-4">
        <h2 id="transition-modal-title" className="text-2xl font-bold">
          Buy Number
        </h2>
      </div>

      <div>
        <div className="flex justify-between items-end mb-9">
          <div className="flex flex-col items-end">
            <div className="flex justify-between mb-4">
              <h2 id="transition-modal-title" className="text-2xl font-bold">
                Number {number?.number}
              </h2>
            </div>
          </div>
          <div className="flex items-center">
            <DollarCircleOutlined
              className="text-green-500 mr-2"
              style={{ fontSize: 24 }}
            />
            <span className="text-lg font-semibold">
              ₹{number?.monthly_fee} Monthly Fee
            </span>
          </div>
        </div>
      </div>

      <hr className="my-6 border-gray-300" />

      <div className="mt-9">
        <h2 id="transition-modal-title" className="text-2xl font-bold mb-4">
          Capabilities
        </h2>

        <div className="mt-5 ml-5">
          <div className="flex items-start">
            <PhoneOutlined
              className="text-green-500"
              style={{ fontSize: 30 }}
            />
            <span className="text-lg font-medium mt-1 ml-2">Voice</span>
          </div>
          {number.voice === 1 ? "Available" : "Not Available"}
        </div>

        <div className="mt-5 ml-5">
          <div className="flex items-start">
            <MessageOutlined
              className="text-blue-500"
              style={{ fontSize: 30 }}
            />
            <span className="text-lg font-medium mt-1 ml-2">SMS</span>
          </div>
          {number.sms === 1 ? "Available" : "Not Available"}
        </div>

        <div className="mt-5 ml-5">
          <div className="flex items-start">
            <FaWhatsapp className="text-green-500" style={{ fontSize: 30 }} />
            <span className="text-lg font-medium mt-1 ml-2">WhatsApp</span>
          </div>
          {number.whatsapp === 1 ? "Available" : "Not Available"}
        </div>

        <div className="mt-5 ml-5">
          <div className="flex items-start">
            <FaInstagram className="text-pink-500" style={{ fontSize: 30 }} />
            <span className="text-lg font-medium mt-1 ml-2">Instagram</span>
          </div>
          {number.instagram === 1 ? "Available" : "Not Available"}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center h-full">
          <Spin size="large" />
        </div>
      )}
      {error && <div className="text-red-500 text-center mt-4">{error}</div>}

      <div className="mt-6 flex justify-center">
        <Button
          variant="contained"
          color="primary"
          onClick={handleFormOpen}
          className="bg-blue-500 px-6 py-2 text-white font-semibold rounded hover:bg-blue-500"
        >
          Buy Now
        </Button>
      </div>

      {/* confirm form */}
      <PurchaseDialog
        showForm={conditions}
        handleFormClose={() => setConditions(false)}
        formData={formData}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
      />
    </div>
  );
};

export default NumberDetailsModal;
