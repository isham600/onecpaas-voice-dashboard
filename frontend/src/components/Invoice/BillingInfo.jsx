import { useEffect } from "react";

const BillingInfo = ({
  billingDate,
  dueDate,
  status,
  invoiceDated,
  deliveryNote,
  paymentTerms,
  setBillingDate,
  setDueDate,
  setStatus,
  setInvoiceDated,
  setDeliveryNote,
  setPaymentTerms,
  EditInvoiceData,
}) => {
  // Prefill safely if EditInvoiceData exists
  useEffect(() => {
    if (EditInvoiceData) {
      if (EditInvoiceData.billing_date) {
        setBillingDate(EditInvoiceData.billing_date.split("T")[0]);
      }
      if (EditInvoiceData.due_date) {
        setDueDate(EditInvoiceData.due_date.split("T")[0]);
      }
      if (EditInvoiceData.payment_status) {
        setStatus(EditInvoiceData.payment_status);
      }
      if (EditInvoiceData.invoice_dated) {
        setInvoiceDated(EditInvoiceData.invoice_dated.split("T")[0]);
      }
      if (EditInvoiceData.delivery_note) {
        setDeliveryNote(EditInvoiceData.delivery_note);
      }
      if (EditInvoiceData.payment_terms) {
        setPaymentTerms(EditInvoiceData.payment_terms);
      }
    }
  }, [EditInvoiceData]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-100 rounded-lg mt-12">
      {/* Billing Date */}
      <div>
        <label className="block text-gray-700 font-medium mb-1">
          Billing Date<span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="date"
          value={billingDate}
          onChange={(e) => setBillingDate(e.target.value)}
          className="p-2 w-full border rounded-lg bg-white"
        />
      </div>

      {/* Status */}
      <div>
        <label className="block text-gray-700 font-medium mb-1">Status<span className="text-red-500 ml-1">*</span></label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="p-2 w-full border rounded-lg bg-white"
        >
          <option value="Fully Paid">Fully Paid</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Overdue">Overdue</option>
        </select>
      </div>

      {/* Delivery Note */}
      <div>
        <label className="block text-gray-700 font-medium mb-1">Delivery Note</label>
        <input
          type="text"
          placeholder="e.g. Note-123"
          value={deliveryNote}
          onChange={(e) => setDeliveryNote(e.target.value)}
          className="p-2 w-full border rounded-lg bg-white"
        />
      </div>

      {/* Payment Terms */}
      <div>
        <label className="block text-gray-700 font-medium mb-1">Mode/Terms of Payment</label>
        <input
          type="text"
          placeholder="e.g. Bank Transfer"
          value={paymentTerms}
          onChange={(e) => setPaymentTerms(e.target.value)}
          className="p-2 w-full border rounded-lg bg-white"
        />
      </div>
    </div>
  );
};

export default BillingInfo;
