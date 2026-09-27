import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { message } from "antd";
import axios from "axios";

import ProductsAndServices from "./ProductsAndServices";
import BillingInfo from "./BillingInfo";
import TermsAndConditions from "./TermsAndConditions";
import Modal from "./Modal";
import InvoiceList from "./InvoiceList";
import AddressComponent from "./NewCompany";
import Button from "../../components/Button/index";
import AddInvoiceIcon from "/assets/images/png/add-invoice.png";

const baseURL = import.meta.env.VITE_API_BASE_URL;

const EditInvoice = ({ user, setSelectedMenu, EditInvoiceData, onClose }) => {
  const location = useLocation();
  const { companyData, customerData, productsData } = location.state || {};
  const navigate = useNavigate();
  const invoiceData = location.state?.invoiceData || {};

  const [messageApi, contextHolder] = message.useMessage();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totalCGST, setTotalCGST] = useState(0);
  const [totalSGST, setTotalSGST] = useState(0);
  const [totalIGST, setTotalIGST] = useState(0);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [invoiceID, setInvoiceID] = useState(invoiceData?.invoice_no || "");
  const [billingDate, setBillingDate] = useState(
    invoiceData?.billing_date || "",
  );
  const [dueDate, setDueDate] = useState(invoiceData?.due_date || "");
  const [invoiceDated, setInvoiceDated] = useState(
    invoiceData?.invoice_dated || "",
  );
  const [deliveryNote, setDeliveryNote] = useState(
    invoiceData?.delivery_note || "",
  );
  const [paymentTerms, setPaymentTerms] = useState(
    invoiceData?.payment_terms || "",
  );
  const [status, setStatus] = useState(
    invoiceData?.payment_status || "Fully Paid",
  );
  const [clientNote, setClientNote] = useState(
    invoiceData?.client_note || "Thank you for your business",
  );
  const [terms, setTerms] = useState(
    invoiceData?.termsncondition ||
      "Note: This is a system-generated invoice and does not require a signature",
  );

  const resolvedInvoiceData = EditInvoiceData || location.state?.invoiceData || {};
  let initialAuthorisedSignatory = "";
  let initialItems = productsData || null;
  try {
    if (resolvedInvoiceData?.items_detail) {
      const parsed = typeof resolvedInvoiceData.items_detail === 'string' ? JSON.parse(resolvedInvoiceData.items_detail) : resolvedInvoiceData.items_detail;
      if (Array.isArray(parsed)) {
        initialItems = parsed;
      } else if (parsed && parsed.items) {
        initialItems = parsed.items;
      }
      if (!Array.isArray(parsed) && parsed.extraData) {
        initialAuthorisedSignatory = parsed.extraData.authorisedSignatory || "";
      }
    }
  } catch (e) {}
  const [authorisedSignatory, setAuthorisedSignatory] = useState(initialAuthorisedSignatory);

  const [selectedCompany, setSelectedCompany] = useState(companyData || null);
  const [selectedCustomer, setSelectedCustomer] = useState(
    customerData || null,
  );
  const [items, setItems] = useState(
    initialItems || [
      { products: "", quantity: 1, price: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
    ],
  );

  const [subtotal, setSubtotal] = useState(invoiceData?.sub_total || 0);
  const [totalTax, setTotalTax] = useState(invoiceData?.total_tax || 0);
  const [discount, setDiscount] = useState(invoiceData?.total_discount || 0);
  const [total, setTotal] = useState(0);

  const openInvoiceListModal = () => setIsModalOpen(true);
  const closeInvoiceListModal = () => setIsModalOpen(false);

  useEffect(() => {
    calculateTotals(items, discount);
  }, [items, discount]);

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

  const validateInputs = () => {
    if (!selectedCompany?.id && !EditInvoiceData?.company_id && !EditInvoiceData?.gstin) {
      messageApi.error(
        "Company information is required. Please select a company to update the invoice",
      );
      return false;
    }
    const compAddress = selectedCompany?.company_address || EditInvoiceData?.company_address;
    if (!compAddress) {
      messageApi.error("Company address is required.");
      return false;
    }
    const compPhone = selectedCompany?.phone_number || EditInvoiceData?.phone_number;
    if (!compPhone) {
      messageApi.error("Company phone is required.");
      return false;
    }
    if (!selectedCustomer?.id && !EditInvoiceData?.user_id) {
      messageApi.error("Customer information is required.");
      return false;
    }
    const custAddress = selectedCustomer?.company_address || selectedCustomer?.address || EditInvoiceData?.payer_address;
    if (!custAddress) {
      messageApi.error("Customer address is required.");
      return false;
    }
    const custPhone = selectedCustomer?.phone_number || selectedCustomer?.mobile_no || selectedCustomer?.phone || EditInvoiceData?.payer_mobile;
    if (!custPhone) {
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
    const compId = selectedCompany?.id || EditInvoiceData?.company_id || EditInvoiceData?.gstin;
    const compAddress = selectedCompany?.company_address || EditInvoiceData?.company_address;
    const compPhone = selectedCompany?.phone_number || EditInvoiceData?.phone_number;
    
    if (!compId || !compAddress || !compPhone) return false;

    const custId = selectedCustomer?.id || EditInvoiceData?.user_id;
    const custAddress = selectedCustomer?.company_address || selectedCustomer?.address || EditInvoiceData?.payer_address;
    const custPhone = selectedCustomer?.phone_number || selectedCustomer?.mobile_no || selectedCustomer?.phone || EditInvoiceData?.payer_mobile;

    if (!custId || !custAddress || !custPhone) return false;
    
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
  }, [selectedCompany, selectedCustomer, billingDate, status, items, authorisedSignatory, EditInvoiceData]);

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
      id: invoiceData?.id || EditInvoiceData?.id,
      action: (invoiceData?.id || EditInvoiceData?.id) ? "update" : "create",
      invoice_id: invoiceData?.id || EditInvoiceData?.id || null,
      company_id: selectedCompany?.id || EditInvoiceData?.company_id,
      user_id: selectedCustomer?.id || EditInvoiceData?.user_id,
      payment_date: billingDate || EditInvoiceData?.payment_date,
      username: user || EditInvoiceData?.username,
      invoice_no: invoiceID || EditInvoiceData?.invoice_no,
      sub_total: subtotal || EditInvoiceData?.sub_total,
      total_tax: totalTax || EditInvoiceData?.total_tax,
      total_discount: discount || EditInvoiceData?.total_discount,
      billing_date: billingDate || EditInvoiceData?.billing_date,
      due_date: dueDate || EditInvoiceData?.due_date,
      invoice_dated: invoiceDated || EditInvoiceData?.invoice_dated,
      delivery_note: deliveryNote || EditInvoiceData?.delivery_note,
      payment_terms: paymentTerms || EditInvoiceData?.payment_terms,
      client_note: clientNote || EditInvoiceData?.client_note,
      termsncondition: terms || EditInvoiceData?.termsncondition,
      gstin: selectedCompany?.gstin || EditInvoiceData?.gstin,
      products,
      items_detail: JSON.stringify({ items: products, extraData: { authorisedSignatory } }),
      payment_status: status || EditInvoiceData?.payment_status,
      logo: EditInvoiceData?.logo || null,
    };

    try {
      const response = await axios.post(
        `${baseURL}/v1/invoices/create`,
        payload,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );

      if (response.data.status === 1) {
        messageApi.success("Invoice updated successfully!");
        if (setSelectedMenu) {
          setSelectedMenu("InvoiceList");
        } else if (onClose) {
          onClose();
        }
      } else {
        messageApi.error(response.data.message || "Error creating invoice.");
      }
    } catch (error) {
      console.error("Error saving invoice:", error);
      const err = error?.response?.data?.errors;

      if (err?.invoice_id) {
        messageApi.error(err.invoice_id[0]);
      } else if (err?.payment_status) {
        messageApi.error(err.payment_status[0]);
      } else if (err?.products) {
        messageApi.error("Invalid product details.");
      }
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
      company_id: selectedCompany?.id || EditInvoiceData?.company_id,
      user_id: selectedCustomer?.id || EditInvoiceData?.user_id,
      payment_date: billingDate || EditInvoiceData?.payment_date,
      username: user || EditInvoiceData?.username,
      invoice_no: invoiceID || EditInvoiceData?.invoice_no,
      sub_total: subtotal || EditInvoiceData?.sub_total,
      total_tax: totalTax || EditInvoiceData?.total_tax,
      total_discount: discount || EditInvoiceData?.total_discount,
      billing_date: billingDate || EditInvoiceData?.billing_date,
      due_date: dueDate || EditInvoiceData?.due_date,
      invoice_dated: invoiceDated || EditInvoiceData?.invoice_dated,
      delivery_note: deliveryNote || EditInvoiceData?.delivery_note,
      payment_terms: paymentTerms || EditInvoiceData?.payment_terms,
      client_note: clientNote || EditInvoiceData?.client_note,
      termsncondition: terms || EditInvoiceData?.termsncondition,
      gstin: selectedCompany?.gstin || EditInvoiceData?.gstin,
      company_name: selectedCompany?.company_name || EditInvoiceData?.company_name,
      company_address: selectedCompany?.company_address || EditInvoiceData?.company_address,
      company_email: selectedCompany?.company_email || EditInvoiceData?.company_email,
      phone_number: selectedCompany?.phone_number || EditInvoiceData?.phone_number,
      company_country: selectedCompany?.country || EditInvoiceData?.country,
      payer_name: selectedCustomer?.company_name || selectedCustomer?.firstname || selectedCustomer?.name || EditInvoiceData?.payer_name,
      payer_email: selectedCustomer?.company_email || selectedCustomer?.email || EditInvoiceData?.payer_email,
      payer_mobile: selectedCustomer?.phone_number || selectedCustomer?.mobile_no || selectedCustomer?.phone || EditInvoiceData?.payer_mobile,
      payer_address: selectedCustomer?.company_address || selectedCustomer?.address || EditInvoiceData?.payer_address,
      products,
      items_detail: JSON.stringify({ items: products, extraData: { authorisedSignatory } }),
      payment_status: status || EditInvoiceData?.payment_status,
      logo: EditInvoiceData?.logo || null,
    };

    try {
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
    }
  };

  return (
    <div>
      {contextHolder}
      <div className="p-10">
        <div className="flex w-full mr">
          <div className="bg-white p-6 shadow-md mb-5 rounded-xl w-full">
            <div className="flex items-center">
              <button
                onClick={() => setSelectedMenu ? setSelectedMenu("InvoiceList") : (onClose ? onClose() : navigate(-1))}
                className="bg-white text-indigo-600 py-2 px-4 rounded-full hover:bg-indigo-100 transition duration-300 flex items-center border border-indigo-100 shadow-sm mr-4"
                aria-label="Go back"
              >
                ← Back
              </button>
              <h1 className="relative text-2xl md:text-3xl font-bold text-indigo-800 text-center flex-grow">
                <span className="absolute top-0 ml-[-40px]">
                  <img
                    src={AddInvoiceIcon}
                    alt="invoice-img"
                    className="w-10 h-10"
                  />
                </span>
                {invoiceData?.id ? "Edit Invoice" : "Edit Invoice"}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex space-x-28 mb-10">
          <AddressComponent
            user={user}
            setSelectedCompany={setSelectedCompany}
            setSelectedCustomer={setSelectedCustomer}
            prefillData={selectedCompany}
            EditInvoiceData={EditInvoiceData}
          />
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
          EditInvoiceData={EditInvoiceData}
        />

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
          EditInvoiceData={EditInvoiceData}
        />

        <TermsAndConditions
          clientNote={clientNote}
          setClientNote={setClientNote}
          terms={terms}
          setTerms={setTerms}
          authorisedSignatory={authorisedSignatory}
          setAuthorisedSignatory={setAuthorisedSignatory}
          EditInvoiceData={EditInvoiceData}
        />

        <div className="flex justify-end mt-4 gap-3">
          <Button variant="secondary" onClick={handlePreviewPDF} disabled={saving || !isFormValid}>
            Preview
          </Button>

          <Button variant="primary" onClick={handleSaveInvoice} disabled={!isFormValid || saving}>
            {saving ? 'Updating...' : 'Update Invoice'}
          </Button>

          <Modal isModalOpen={isModalOpen} closeModal={closeInvoiceListModal}>
            <InvoiceList user={user} />
          </Modal>

          <Modal isModalOpen={isPreviewModalOpen} closeModal={() => setIsPreviewModalOpen(false)}>
            {previewUrl && (
              <div style={{ position: 'relative', width: '100%', height: '80vh' }}>
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
      </div>
    </div>
  );
};

export default EditInvoice;
