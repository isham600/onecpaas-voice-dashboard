// components/Invoice/AddInvoice.jsx
// Restyled with green theme, no duplicate navbar/sidebar

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Button, Modal, message, Typography, Space } from "antd";
import {
  ArrowLeftOutlined,
  UnorderedListOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { FileText, ChevronLeft, List, Save } from "lucide-react";
import { useMemo } from "react";

import ProductsAndServices from "./ProductsAndServices";
import BillingInfo from "./BillingInfo";
import TermsAndConditions from "./TermsAndConditions";
import InvoiceList from "./InvoiceList";
import AddressComponent from "./NewCompany";

const { Title } = Typography;
const baseURL = import.meta.env.VITE_API_BASE_URL;

const AddInvoice = ({ user, setSelectedMenu }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  // Route Data
  const { companyData, customerData, productsData } = location.state || {};
  const invoiceData = location.state?.invoiceData || {};

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Invoice Data State
  const [totalCGST, setTotalCGST] = useState(0);
  const [totalSGST, setTotalSGST] = useState(0);
  const [totalIGST, setTotalIGST] = useState(0);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  const [invoiceID, setInvoiceID] = useState(invoiceData?.invoice_no || "");
  const [billingDate, setBillingDate] = useState(
    invoiceData?.billing_date || "",
  );
  const [dueDate, setDueDate] = useState(invoiceData?.due_date || "");
  const [invoiceDated, setInvoiceDated] = useState(invoiceData?.invoice_dated || "");
  const [deliveryNote, setDeliveryNote] = useState(invoiceData?.delivery_note || "");
  const [paymentTerms, setPaymentTerms] = useState(invoiceData?.payment_terms || "");
  const [status, setStatus] = useState(
    invoiceData?.payment_status || "Fully Paid",
  );

  const [clientNote, setClientNote] = useState(
    invoiceData?.client_note || "Thank you for your business",
  );
  
  let initialAuthorisedSignatory = "";
  try {
    if (invoiceData?.items_detail) {
      const parsed = JSON.parse(invoiceData.items_detail);
      if (!Array.isArray(parsed) && parsed.extraData) {
        initialAuthorisedSignatory = parsed.extraData.authorisedSignatory || "";
      }
    }
  } catch (e) {}
  
  const [authorisedSignatory, setAuthorisedSignatory] = useState(initialAuthorisedSignatory);

  const [terms, setTerms] = useState(
    invoiceData?.termsncondition ||
      "Note: This is a system-generated invoice and does not require a signature",
  );

  const [selectedCompany, setSelectedCompany] = useState(companyData || null);
  const [selectedCustomer, setSelectedCustomer] = useState(
    customerData || null,
  );
  const [items, setItems] = useState(
    productsData || [
      { products: "", quantity: 1, price: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
    ],
  );

  // Totals State
  const [subtotal, setSubtotal] = useState(invoiceData?.sub_total || 0);
  const [totalTax, setTotalTax] = useState(invoiceData?.total_tax || 0);
  const [discount, setDiscount] = useState(invoiceData?.total_discount || 0);
  const [total, setTotal] = useState(0);

  const openInvoiceListModal = () => setIsModalOpen(true);
  const closeInvoiceListModal = () => setIsModalOpen(false);

  const calculateTotals = (items, discountValue) => {
    let subtotal = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;

    items.forEach((item) => {
      subtotal += item.quantity * item.price;
      totalCGST += item.quantity * item.price * (item.cgst / 100);
      totalSGST += item.quantity * item.price * (item.sgst / 100);
      totalIGST += item.quantity * item.price * (item.igst / 100);
    });

    const totalTax = totalCGST + totalSGST + totalIGST;

    setSubtotal(subtotal);
    setTotalTax(totalTax);
    setTotalCGST(totalCGST);
    setTotalSGST(totalSGST);
    setTotalIGST(totalIGST);
    setTotal(subtotal + totalTax - discountValue);
  };

  useEffect(() => {
    calculateTotals(items, discount);
  }, [items, discount]);

  const validateInputs = () => {
    if (!selectedCompany || !selectedCompany.id) {
      messageApi.error("Company information is required.");
      return false;
    }
    if (!selectedCompany?.company_address) {
      messageApi.error("Company address is required.");
      return false;
    }
    if (!selectedCompany?.phone_number) {
      messageApi.error("Company phone is required.");
      return false;
    }
    if (!selectedCustomer || !selectedCustomer.id) {
      messageApi.error("Customer information is required.");
      return false;
    }
    if (!selectedCustomer?.company_address && !selectedCustomer?.address) {
      messageApi.error("Customer address is required.");
      return false;
    }
    if (!selectedCustomer?.phone_number && !selectedCustomer?.mobile_no && !selectedCustomer?.phone) {
      messageApi.error("Customer phone is required.");
      return false;
    }
    if (!billingDate) {
      messageApi.error("Billing date is required.");
      return false;
    }
    if (!status) {
      messageApi.error("Payment status is required.");
      return false;
    }
    if (!items || items.length === 0) {
      messageApi.error("At least one product/service item is required.");
      return false;
    }
    if (!authorisedSignatory) {
      messageApi.error("Authorised Signatory is required.");
      return false;
    }

    for (const item of items) {
      if (!item.products) {
        messageApi.error("Each item must have a name.");
        return false;
      }
      if (!item.quantity || item.quantity <= 0) {
        messageApi.error("Each item must have a valid quantity.");
        return false;
      }
      if (!item.price || item.price < 0) {
        messageApi.error("Each item must have a valid price.");
        return false;
      }
    }
    return true;
  };

  const isFormValid = useMemo(() => {
    if (!selectedCompany || !selectedCompany.id) return false;
    if (!selectedCompany?.company_address) return false;
    if (!selectedCompany?.phone_number) return false;
    if (!selectedCustomer || !selectedCustomer.id) return false;
    if (!(selectedCustomer?.company_address || selectedCustomer?.address)) return false;
    if (!(selectedCustomer?.phone_number || selectedCustomer?.mobile_no || selectedCustomer?.phone)) return false;
    if (!billingDate) return false;
    if (!status) return false;
    if (!items || items.length === 0) return false;
    if (!authorisedSignatory) return false;

    for (const item of items) {
      if (!item.products) return false;
      if (!item.quantity || item.quantity <= 0) return false;
      if (item.price === undefined || item.price === null || item.price < 0) return false;
    }
    return true;
  }, [selectedCompany, selectedCustomer, billingDate, status, items, authorisedSignatory]);

  const handleSaveInvoice = async () => {
    if (!validateInputs()) return;

    setSaving(true);

    const products = items.map((item) => {
      const itemCGST = item.quantity * item.price * (item.cgst / 100);
      const itemSGST = item.quantity * item.price * (item.sgst / 100);
      const itemIGST = item.quantity * item.price * (item.igst / 100);
      const itemTotalTax = itemCGST + itemSGST + itemIGST;

      return {
        action: item.product_id ? "update" : "create",
        product_id: item.product_id,
        products: item.products,
        quantity: item.quantity,
        price: item.price,
        cgst: itemCGST,
        sgst: itemSGST,
        igst: itemIGST,
        tax: itemTotalTax,
      };
    });

    const payload = {
      action: invoiceData?.id ? "update" : "create",
      invoice_id: invoiceData?.id || null,
      company_id: selectedCompany?.id,
      user_id: selectedCustomer?.id,
      payment_date: billingDate,
      username: user,
      invoice_no: String(invoiceID),
      sub_total: subtotal,
      total_tax: totalTax,
      total_discount: discount,
      billing_date: billingDate,
      due_date: dueDate,
      invoice_dated: invoiceDated,
      delivery_note: deliveryNote,
      payment_terms: paymentTerms,
      client_note: clientNote,
      termsncondition: terms,
      gstin: selectedCompany?.gstin,
      products,
      items_detail: JSON.stringify({ items: products, extraData: { authorisedSignatory } }),
      payment_status: status,
    };

    try {
      const response = await axios.post(
        `${baseURL}/v1/invoices/create`,
        payload,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );

      if (response.data.status === 1) {
        messageApi.success("Invoice created successfully!");
        setSelectedMenu("InvoiceList");
      } else {
        messageApi.error(response.data.message || "Error creating invoice.");
      }
    } catch (error) {
      console.error("Error creating invoice:", error);
      const err = error?.response?.data?.errors;

      if (err?.invoice_id) messageApi.error(err.invoice_id[0]);
      else if (err?.payment_status) messageApi.error(err.payment_status[0]);
      else if (err?.products) messageApi.error("Invalid product details.");
      else
        messageApi.error(
          error?.response?.data?.message || "Something went wrong.",
        );
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewPDF = async () => {
    if (!validateInputs()) return;
    
    const products = items.map((item) => {
      const itemCGST = item.quantity * item.price * (item.cgst / 100);
      const itemSGST = item.quantity * item.price * (item.sgst / 100);
      const itemIGST = item.quantity * item.price * (item.igst / 100);
      const itemTotalTax = itemCGST + itemSGST + itemIGST;

      return {
        action: item.product_id ? "update" : "create",
        product_id: item.product_id,
        products: item.products,
        quantity: item.quantity,
        price: item.price,
        cgst: itemCGST,
        sgst: itemSGST,
        igst: itemIGST,
        tax: itemTotalTax,
      };
    });

    const payload = {
      action: "preview",
      company_id: selectedCompany?.id,
      user_id: selectedCustomer?.id,
      payment_date: billingDate,
      username: user,
      invoice_no: String(invoiceID),
      sub_total: subtotal,
      total_tax: totalTax,
      total_discount: discount,
      billing_date: billingDate,
      due_date: dueDate,
      invoice_dated: invoiceDated,
      delivery_note: deliveryNote,
      payment_terms: paymentTerms,
      client_note: clientNote,
      termsncondition: terms,
      gstin: selectedCompany?.gstin,
      company_name: selectedCompany?.company_name,
      company_address: selectedCompany?.company_address,
      company_email: selectedCompany?.company_email,
      phone_number: selectedCompany?.phone_number,
      company_country: selectedCompany?.country,
      payer_name: selectedCustomer?.company_name || selectedCustomer?.firstname || selectedCustomer?.name,
      payer_email: selectedCustomer?.company_email || selectedCustomer?.email,
      payer_mobile: selectedCustomer?.phone_number || selectedCustomer?.mobile_no || selectedCustomer?.phone,
      payer_address: selectedCustomer?.company_address || selectedCustomer?.address,
      products,
      items_detail: JSON.stringify({ items: products, extraData: { authorisedSignatory } }),
      payment_status: status,
    };

    try {
      setPreviewLoading(true);
      const response = await axios.post(`${baseURL}/v1/invoices/preview`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: response.data.type || "application/pdf" });
      
      if (blob.type === "application/json") {
        const text = await blob.text();
        const data = JSON.parse(text);
        messageApi.error(data.message || "Error generating preview");
        return;
      }
      
      const objectUrl = window.URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
      setIframeLoading(true);
      setIsPreviewModalOpen(true);
    } catch (error) {
      console.error("Error generating preview:", error);
      messageApi.error("Error generating preview PDF.");
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="min-h-[50vh]">
      {contextHolder}

      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/50 shadow-sm p-5 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Back + Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedMenu("InvoiceList")}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all duration-200 border border-gray-100 h-9 w-9 justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
                  style={{
                    background:
                      "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                  }}
                >
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {invoiceData?.id ? "Edit Invoice" : "Create New Invoice"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Fill in the details below
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {!invoiceData?.id && (
                <button
                  onClick={openInvoiceListModal}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100 transition-all duration-200"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">Invoice List</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <Space direction="vertical" size="large" className="w-full">
        {/* Address Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/50 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-1.5 h-6 rounded-full"
                style={{
                  background:
                    "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                }}
              />
              <h4 className="text-base font-bold text-gray-900">
                Company & Customer Details
              </h4>
            </div>
            <div className="flex flex-col lg:flex-row gap-8">
              <AddressComponent
                user={user}
                setSelectedCompany={setSelectedCompany}
                setSelectedCustomer={setSelectedCustomer}
                prefillData={selectedCompany}
              />
            </div>
          </div>
        </motion.div>

        {/* Billing Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/50 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-1.5 h-6 rounded-full"
                style={{
                  background:
                    "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                }}
              />
              <h4 className="text-base font-bold text-gray-900">
                Billing Information
              </h4>
            </div>
            <BillingInfo
              invoiceID={invoiceID}
              setInvoiceID={setInvoiceID}
              billingDate={billingDate}
              setBillingDate={setBillingDate}
              dueDate={dueDate}
              setDueDate={setDueDate}
              invoiceDated={invoiceDated}
              setInvoiceDated={setInvoiceDated}
              deliveryNote={deliveryNote}
              setDeliveryNote={setDeliveryNote}
              paymentTerms={paymentTerms}
              setPaymentTerms={setPaymentTerms}
              status={status}
              setStatus={setStatus}
            />
          </div>
        </motion.div>

        {/* Products Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/50 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-1.5 h-6 rounded-full"
                style={{
                  background:
                    "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                }}
              />
              <h4 className="text-base font-bold text-gray-900">
                Products & Services
              </h4>
            </div>
            <ProductsAndServices
              user={user}
              items={items}
              setItems={setItems}
              subtotal={subtotal}
              totalTax={totalTax}
              discount={discount}
              setDiscount={setDiscount}
              total={total}
              calculateTotals={calculateTotals}
              totalCGST={totalCGST}
              totalSGST={totalSGST}
              totalIGST={totalIGST}
            />
          </div>
        </motion.div>

        {/* Terms */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/50 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-1.5 h-6 rounded-full"
                style={{
                  background:
                    "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                }}
              />
              <h4 className="text-base font-bold text-gray-900">
                Terms & Notes
              </h4>
            </div>
            <TermsAndConditions
              clientNote={clientNote}
              setClientNote={setClientNote}
              terms={terms}
              setTerms={setTerms}
              authorisedSignatory={authorisedSignatory}
              setAuthorisedSignatory={setAuthorisedSignatory}
            />
          </div>
        </motion.div>

        {/* Footer Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="flex justify-end gap-3 pb-6"
        >
          <button
            onClick={handlePreviewPDF}
            disabled={saving || previewLoading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-base shadow-sm border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {previewLoading ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
            {previewLoading ? 'Loading...' : 'Preview'}
          </button>
          
          <button
            onClick={handleSaveInvoice}
            disabled={saving || !isFormValid}
            className="flex items-center gap-2 px-8 py-3 rounded-xl text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
            }}
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Invoice
              </>
            )}
          </button>
        </motion.div>
      </Space>

      {/* Invoice List Modal */}
      <Modal
        open={isModalOpen}
        onCancel={closeInvoiceListModal}
        footer={null}
        width={1000}
        title={
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: "#2563EB" }} />
            <span>Invoice List</span>
          </div>
        }
        centered
        className="themed-modal"
      >
        <InvoiceList user={user} />
      </Modal>

      {/* Preview Modal */}
      <Modal
        open={isPreviewModalOpen}
        onCancel={() => setIsPreviewModalOpen(false)}
        footer={null}
        width={1000}
        title={
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: "#2563EB" }} />
            <span>Invoice Preview</span>
          </div>
        }
        centered
        className="themed-modal"
        styles={{ body: { height: '80vh', padding: 0 } }}
      >
        {previewUrl && (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {iframeLoading && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', zIndex: 10 }}>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-2" />
                  <span className="text-gray-500 font-medium">Loading Preview...</span>
                </div>
              </div>
            )}
            <iframe
              src={previewUrl}
              title="Invoice Preview"
              style={{ width: '100%', height: '100%', border: 'none' }}
              onLoad={() => setIframeLoading(false)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AddInvoice;
