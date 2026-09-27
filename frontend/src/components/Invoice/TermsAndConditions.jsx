import { useEffect } from "react";

const TermsAndConditions = ({
  clientNote,
  terms,
  authorisedSignatory,
  setClientNote,
  setTerms,
  setAuthorisedSignatory,
  EditInvoiceData,
}) => {
  useEffect(() => {
    if (EditInvoiceData) {
      if (EditInvoiceData.client_note) {
        setClientNote(EditInvoiceData.client_note);
      }
      if (EditInvoiceData.termsncondition) {
        setTerms(EditInvoiceData.termsncondition);
      }
    }
  }, [EditInvoiceData, setClientNote, setTerms]);

  return (
    <div className="mt-6 p-4 flex flex-col md:flex-row justify-center gap-4 w-full bg-gray-100 rounded-lg shadow-sm">
      <div className="mb-4 w-full">
        <label className="block text-gray-700 font-semibold mb-2">
          Client Note
        </label>
        <textarea
          value={clientNote}
          onChange={(e) => setClientNote(e.target.value)}
          rows="3"
          className="p-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="mb-4 w-full">
        <label className="block text-gray-700 font-semibold mb-2">
          Terms & Conditions
        </label>
        <textarea
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          rows="3"
          className="p-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="mb-4 w-full">
        <label className="block text-gray-700 font-semibold mb-2">
          Authorised Signatory<span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="text"
          value={authorisedSignatory}
          onChange={(e) => setAuthorisedSignatory(e.target.value)}
          placeholder=""
          className="p-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};

export default TermsAndConditions;
