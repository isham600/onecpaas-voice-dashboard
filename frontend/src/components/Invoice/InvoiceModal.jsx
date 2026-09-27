import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ReactDOM from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faDownload,
  faEnvelope,
} from "@fortawesome/free-solid-svg-icons";

const InvoiceModal = ({ isOpen, onClose, invoiceData }) => {
  const navigate = useNavigate();
  const data = invoiceData?.data || {}; // Access invoice data

  // Handle Edit Button Click - Navigate to AddInvoice with data
  const handleEdit = () => {
    navigate("/addinvoice", {
      state: {
        invoiceData: data, // Pass full invoice data
        companyData: data.company, // Pass company data
        customerData: data.user, // Pass customer data
        productsData: data.products, // Pass products data
      },
    });
  };

  // Close modal on "Escape" key press
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Prevent body scroll when the modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50 backdrop-blur-sm"
        >
          <motion.div
            onClick={onClose}
            initial={{ backdropFilter: "blur(0px)" }}
            animate={{ backdropFilter: "blur(5px)" }}
            exit={{ backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          />

          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative bg-white rounded-xl w-full max-w-7xl mx-4 p-6 shadow-2xl"
            style={{ maxHeight: "100vh", overflowY: "auto" }}
          >
            {/* Close button */}
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              onClick={onClose}
              aria-label="Close Modal"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Modal Content */}
            <div id="modal-title" className="text-gray-800">
              <div className="flex justify-end gap-4 mt-14">
                <button className="bg-green-500 text-white py-1 px-4 rounded hover:bg-green-600 flex items-center">
                  <FontAwesomeIcon icon={faDownload} className="mr-2" />
                  Download
                </button>

                <button
                  onClick={handleEdit}
                  className="bg-blue-500 text-white py-1 px-4 rounded hover:bg-blue-600 flex items-center"
                >
                  <FontAwesomeIcon icon={faEdit} className="mr-2" />
                  Edit
                </button>

                <button className="bg-red-500 text-white py-1 px-4 rounded hover:bg-red-600 flex items-center">
                  <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                  Email
                </button>
              </div>

              {/* Invoice Details */}
              <div className="mt-5">
                <div className="flex justify-between">
                  {/* Company Information */}
                  <div className="text-right ml-auto">
                    <h4 className="font-bold">
                      Company Name: {data.company?.company_name || "N/A"}
                    </h4>
                    <p>Address: {data.company?.company_address || "N/A"}</p>
                    <p>GSTIN: {data.company?.gstin || "N/A"}</p>
                  </div>
                </div>

                {/* Invoice Title */}
                <div className="relative text-center mb-2  ">
                  <h2 className="inline-block text-2xl font-bold ">INVOICE</h2>
                </div>

                {/* Customer & Invoice Details */}
                <div className="flex justify-between items-start gap-6">
                  <div className="w-1/2">
                    <h4 className="font-bold">
                      Customer Name: {data.user?.customer || "N/A"}
                    </h4>
                    <p>Address: {data.user?.address || "N/A"}</p>
                    <p>GSTIN: {data.user?.gstin || "N/A"}</p>
                  </div>
                  <table className="w-1/2 mt-2 border-collapse border border-gray-300">
                    <thead
                      style={{
                        backgroundColor: "rgb(26, 189, 156)",
                        color: "white",
                      }}
                    >
                      <tr>
                        <th className="py-2 px-4 border">Field</th>
                        <th className="py-2 px-4 border">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-2 px-4 border">Invoice ID</td>
                        <td className="py-2 px-4 border">{data.id || "N/A"}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 border">Billing Date</td>
                        <td className="py-2 px-4 border">
                          {data.billing_date || "N/A"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 border">Due Date</td>
                        <td className="py-2 px-4 border">
                          {data.due_date || "N/A"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Products Table */}
                <h4 className="mt-8 font-bold">Products/Services</h4>
                <table className="w-full border-collapse border border-gray-300 mt-2">
                  <thead
                    style={{
                      backgroundColor: "rgb(26, 189, 156)",
                      color: "white",
                    }}
                  >
                    <tr>
                      <th className="py-2 px-4 border">Product</th>
                      <th className="py-2 px-4 border">Quantity</th>
                      <th className="py-2 px-4 border">Price</th>
                      <th className="py-2 px-4 border">Tax (%)</th>
                      <th className="py-2 px-4 border">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.products?.length > 0 ? (
                      data.products.map((products, index) => (
                        <tr key={index}>
                          <td className="py-2 px-4 border">
                            {products.products || "N/A"}
                          </td>
                          <td className="py-2 px-4 border">
                            {products.quantity || "N/A"}
                          </td>
                          <td className="py-2 px-4 border">
                            {products.price || "N/A"}
                          </td>
                          <td className="py-2 px-4 border">
                            {products.itemTotalTax || "N/A"}
                          </td>
                          <td className="py-2 px-4 border">
                            {(products.price * products.quantity).toFixed(2) ||
                              "N/A"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-2 px-4 border" colSpan="5">
                          No Products Available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Invoice Summary */}
                <div className="text-right mt-5">
                  <p>Subtotal: {data.sub_total || "0.00"}</p>
                  <p>Total Discount: {data.total_discount || "0.00"}</p>
                  <p className="font-bold">
                    Payment Status: {data.payment_status || "N/A"}
                  </p>
                </div>

                {/* Client Notes */}
                <div className="mt-8">
                  <h4 className="font-bold">Client Notes:</h4>
                  <p>{data.client_note || "N/A"}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default InvoiceModal;
