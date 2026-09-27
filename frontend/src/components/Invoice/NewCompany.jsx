import { useState, useEffect } from "react";
import { Modal, Typography, message } from "antd";
import { EditOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import Button from "../../components/Button/index";
import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL;
const { Text, Title } = Typography;

const AddressComponent = ({
  user,
  setSelectedCompany,
  setSelectedCustomer,
  EditInvoiceData,
}) => {
  const [open, setOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedCompanyLocal, setSelectedCompanyLocal] = useState();
  const [selectedCustomerLocal, setSelectedCustomerLocal] = useState();
  const [newCompany, setNewCompany] = useState("");
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [customer, setCustomer] = useState([]);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editCompanyId, setEditCompanyId] = useState(null);

  //search company
  const [companySearch, setCompanySearch] = useState("");

  //search customer
  const [customerSearch, setCustomerSearch] = useState("");

  useEffect(() => {
    if (EditInvoiceData) {
      // Prefill company info
      const prefillCompany = {
        company_name: EditInvoiceData.company_name || "",
        company_address: EditInvoiceData.company_address || "",
        phone_number: EditInvoiceData.company_mobile || "",
        gstin: EditInvoiceData.gstin || "",
        company_email: EditInvoiceData.company_email || "",
        city: EditInvoiceData.city || "",
        country: EditInvoiceData.country || "",
      };
      setSelectedCompanyLocal(prefillCompany);
      setSelectedCompany(prefillCompany);
      setCompanySearch("");

      // Prefill customer info
      const prefillCustomer = {
        company_name: EditInvoiceData.payer_company_name || "",
        company_address: EditInvoiceData.payer_address || "",
        phone_number: EditInvoiceData.payer_mobile || "",
      };
      setSelectedCustomerLocal(prefillCustomer);
      setSelectedCustomer(prefillCustomer);
      setCustomerSearch("");
    }
  }, [EditInvoiceData]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const handleAddModalOpen = () => setAddModalOpen(true);
  const handleAddModalClose = () => {
    setAddModalOpen(false);
    setEditCompanyId(null);
    setFormData({
      action: "create",
      username: user,
      company_name: "",
      company_address: "",
      gstin: "",
      company_email: "",
      phone_number: "",
      city: "",
      country: "",
    });
  };

  const openCompanyModal = () => setIsCompanyModalOpen(true);
  const closeCompanyModal = () => setIsCompanyModalOpen(false);

  const openCustomerModal = () => setIsCustomerModalOpen(true);
  const closeCustomerModal = () => setIsCustomerModalOpen(false);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await axios.post(
          `${baseURL}/v1/invoices/getcompany-invoice`,
          {
            action: "read",
            username: user,
          },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        if (response.status === 200) {
          const companyArray = response.data.data || [];
          setCompanies(Array.isArray(companyArray) ? companyArray : []);
          setCustomer(Array.isArray(companyArray) ? companyArray : []);
        } else {
          message.error(`Failed to fetch companies: ${response.data.error}`);
        }
      } catch (error) {
        message.error(
          `Error fetching companies: ${error.response?.data || error.message}`,
        );
      }
    };

    if (user) {
      fetchCompanies();
    }
  }, [user, addModalOpen]);


  const [formData, setFormData] = useState({
    action: "create",
    username: user,
    company_name: "",
    company_address: "",
    gstin: "",
    company_email: "",
    phone_number: "",
    city: "",
    country: "",
  });

  const handleInputChange = (e) => {
    e.preventDefault();
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleCompanySelect = (company) => {
    setSelectedCompanyLocal(company);
    setSelectedCompany(company);
    closeCompanyModal();
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomerLocal(customer);
    setSelectedCustomer(customer);
    closeCustomerModal();
  };

  const handleEditClick = (e, company) => {
    e.stopPropagation();
    setEditCompanyId(company.id);
    setFormData({
      action: "update",
      username: user,
      company_name: company.company_name || "",
      company_address: company.company_address || "",
      gstin: company.gstin || "",
      company_email: company.company_email || "",
      phone_number: company.phone_number || "",
      city: company.city || "",
      country: company.country || "",
    });
    setAddModalOpen(true);
  };

  const handleDeleteClick = async (e, companyId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this company?")) {
      try {
        const response = await axios.post(
          `${baseURL}/v1/invoices/delete-company`,
          { id: companyId },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        if (response.status === 200 || response.data.status === 1) {
          message.success("Company deleted successfully!");
          setCompanies(companies.filter(c => c.id !== companyId));
          setCustomer(customer.filter(c => c.id !== companyId));
          if (selectedCompanyLocal?.id === companyId) setSelectedCompanyLocal(null);
          if (selectedCustomerLocal?.id === companyId) setSelectedCustomerLocal(null);
        } else {
          message.error("Failed to delete company");
        }
      } catch (error) {
        message.error(`Error: ${error?.response?.data?.message || error.message}`);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const fd = new FormData();
      fd.append("action", formData.action);
      fd.append("username", formData.username);
      fd.append("company_name", formData.company_name);
      fd.append("company_address", formData.company_address);
      fd.append("gstin", formData.gstin);
      fd.append("company_email", formData.company_email);
      fd.append("phone_number", formData.phone_number);
      fd.append("city", formData.city);
      fd.append("country", formData.country);
      if (editCompanyId) {
        fd.append("id", editCompanyId);
      }
      
      const endpoint = editCompanyId 
        ? `${baseURL}/v1/invoices/update-company` 
        : `${baseURL}/v1/invoices/invoice_company`;

      const response = await axios.post(
        endpoint,
        fd,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      if (response.status === 200 || response.data.status === 1) {
        message.success(`Company ${editCompanyId ? 'updated' : 'created'} successfully!`);
        
        const newImage = response.data.company_image || null;
        const updatedData = { ...formData };
        if (newImage) updatedData.company_image = newImage;

        if (editCompanyId) {
          setCompanies(companies.map(c => c.id === editCompanyId ? { ...c, ...updatedData } : c));
          setCustomer(customer.map(c => c.id === editCompanyId ? { ...c, ...updatedData } : c));
        } else {
          setCompanies([...companies, { id: response.data.company_id || Date.now(), ...updatedData }]);
          setCustomer([...customer, { id: response.data.company_id || Date.now(), ...updatedData }]);
        }
        handleAddModalClose();
      } else {
        message.error(
          `Failed to create company: ${response.data.error || "Unknown error"}`,
        );
      }
    } catch (error) {
      if (error?.response?.data?.errors?.company_email) {
        message.error(error?.response?.data?.errors?.company_email?.[0]);
      }
      if (error?.response?.data?.error) {
        message.error(error?.response?.data?.error);
      }
    }
  };

  // Safe default for search inputs
  const companySearchLower = (companySearch || "").toLowerCase();
  const customerSearchLower = (customerSearch || "").toLowerCase();

  // Safe filter for companies
  const filteredCompanies = companies.filter((company) =>
    (company.company_name || "").toLowerCase().includes(companySearchLower),
  );

  // Safe filter for customers
  const filteredCustomers = customer.filter((c) =>
    (c.company_name || "").toLowerCase().includes(customerSearchLower),
  );

  return (
    <div className="flex flex-row justify-between items-center w-full max-w-[1100px] p-4 border border-gray-300 rounded-lg shadow-md bg-white">
      {/* From Section */}
      <div className="flex-1 w-full ml-3 border-r border-gray-300 pr-4">
        <div className="flex items-center">
          <h6 className="text-lg font-semibold mb-1 mr-10">From:</h6>
          <button
            onClick={openCompanyModal}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <EditOutlined className="text-lg" />
          </button>
        </div>
        <p className="text-base mb-1">
          <strong>{selectedCompanyLocal?.company_name || <span>Select a Company<span className="text-red-500 ml-1">*</span></span>}</strong>
        </p>
        <p className="text-sm text-gray-600 mb-1">
          {selectedCompanyLocal?.company_address ||
            <span>Company Address<span className="text-red-500 ml-1">*</span></span>}
        </p>
        <p className="text-sm text-gray-600 mb-1">
          {selectedCompanyLocal?.phone_number || <span>Company Phone<span className="text-red-500 ml-1">*</span></span>}
        </p>
      </div>

      {/* Modal for Company */}
      <Modal
        open={isCompanyModalOpen}
        onCancel={closeCompanyModal}
        footer={null}
        title={
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Select a Company</span>
            <button
              onClick={handleAddModalOpen}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors mr-6"
            >
              <PlusOutlined className="text-lg" />
            </button>
          </div>
        }
        width={400}
        centered
      >
        {/* Search Input */}
        <input
          type="text"
          placeholder="Search company..."
          value={companySearch}
          onChange={(e) => setCompanySearch(e.target.value)}
          className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring focus:border-indigo-300"
        />

        <div className="max-h-[300px] overflow-y-auto overflow-x-hidden border border-gray-300 rounded p-2">
          {filteredCompanies.map((company) => (
            <div
              key={company.id}
              onClick={() => handleCompanySelect(company)}
              className={`cursor-pointer border-b border-gray-200 last:border-none p-3 flex flex-row items-center justify-between hover:bg-gray-50 transition-colors ${
                selectedCompanyLocal?.company_name === company.company_name
                  ? "bg-indigo-50"
                  : ""
              }`}
            >
              <div className="flex-1">
                <p className="text-base mb-1">
                  <strong>{company.company_name}</strong>
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  {company.company_address}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  {company.phone_number}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => handleEditClick(e, company)}
                  className="p-1 hover:bg-gray-200 rounded text-blue-600"
                >
                  <EditOutlined />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteClick(e, company.id)}
                  className="p-1 hover:bg-gray-200 rounded text-red-600"
                >
                  <DeleteOutlined />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-4">
          <Button type="button" variant="secondary" onClick={closeCompanyModal}>
            Close
          </Button>
        </div>
      </Modal>

      {/* To Section */}
      <div className="flex-1 w-full ml-4">
        <div className="flex items-center">
          <h6 className="text-lg font-semibold mb-1 mr-10">To:</h6>
          <button
            onClick={openCustomerModal}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <EditOutlined className="text-lg" />
          </button>
        </div>
        <p className="text-base mb-1">
          <strong>
            {selectedCustomerLocal?.company_name || <span>Select a Customer<span className="text-red-500 ml-1">*</span></span>}
          </strong>
        </p>
        <p className="text-sm text-gray-600 mb-1">
          {selectedCustomerLocal?.company_address ||
            <span>Customer Address<span className="text-red-500 ml-1">*</span></span>}
        </p>
        <p className="text-sm text-gray-600 mb-1">
          {selectedCustomerLocal?.phone_number || <span>Customer Phone<span className="text-red-500 ml-1">*</span></span>}
        </p>
      </div>

      {/* Modal for Customer */}
      <Modal
        open={isCustomerModalOpen}
        onCancel={closeCustomerModal}
        footer={null}
        title={
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Select a Customer</span>
            <button
              onClick={handleAddModalOpen}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors mr-6"
            >
              <PlusOutlined className="text-lg" />
            </button>
          </div>
        }
        width={400}
        centered
      >
        {/* Search Input */}
        <input
          type="text"
          placeholder="Search customer..."
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring focus:border-indigo-300"
        />

        <div className="max-h-[300px] overflow-y-auto overflow-x-hidden border border-gray-300 rounded p-2">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              onClick={() => handleCustomerSelect(customer)}
              className={`cursor-pointer border-b border-gray-200 last:border-none p-3 flex flex-row items-center justify-between hover:bg-gray-50 transition-colors ${
                selectedCustomerLocal?.company_name === customer.company_name
                  ? "bg-indigo-50"
                  : ""
              }`}
            >
              <div className="flex-1">
                <p className="text-base mb-1">
                  <strong>{customer.company_name}</strong>
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  {customer.company_address}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  {customer.phone_number}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => handleEditClick(e, customer)}
                  className="p-1 hover:bg-gray-200 rounded text-blue-600"
                >
                  <EditOutlined />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteClick(e, customer.id)}
                  className="p-1 hover:bg-gray-200 rounded text-red-600"
                >
                  <DeleteOutlined />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-4">
          <Button
            variant="secondary"
            type="button"
            onClick={closeCustomerModal}
          >
            Close
          </Button>
        </div>
      </Modal>

      {/* Modal for Add Company */}
      <Modal
        open={addModalOpen}
        onCancel={handleAddModalClose}
        footer={null}
        width={672}
        centered
        closable={false}
        zIndex={9999}
      >
        <div className="p-2 relative">
          {/* Close Button */}
          <button
            type="button"
            onClick={handleAddModalClose}
            className="absolute top-0 right-0 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full w-10 h-10 text-2xl flex items-center justify-center"
          >
            &times;
          </button>

          {/* Modal Header */}
          <h3 className="text-2xl font-semibold text-gray-800 mb-10 mt-8 text-center">
            Company Information
          </h3>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">


              {/* Company Name */}
              <div>
                <label className="block text-gray-700 font-medium mb-4">
                  Company Name<span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="company_name"
                  placeholder="Enter Company Name"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  required
                  className="p-2 block w-full border rounded-md text-gray-700 focus:outline-none focus:ring focus:border-indigo-300"
                />
              </div>

              {/* Company Address */}
              <div>
                <label className="block text-gray-700 font-medium mb-4">
                  Address<span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="company_address"
                  placeholder="Enter Address"
                  value={formData.company_address}
                  onChange={handleInputChange}
                  required
                  className="p-2 block w-full border rounded-md text-gray-700 focus:outline-none focus:ring focus:border-indigo-300"
                />
              </div>

              {/* Company city */}
              <div>
                <label className="block text-gray-700 font-medium mb-4">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  placeholder="Enter Address"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                  className="p-2 block w-full border rounded-md text-gray-700 focus:outline-none focus:ring focus:border-indigo-300"
                />
              </div>

              {/* Company country */}
              <div>
                <label className="block text-gray-700 font-medium mb-4">
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  placeholder="Enter Address"
                  value={formData.country}
                  onChange={handleInputChange}
                  required
                  className="p-2 block w-full border rounded-md text-gray-700 focus:outline-none focus:ring focus:border-indigo-300"
                />
              </div>

              {/* GSTIN */}
              <div>
                <label className="block text-gray-700 font-medium mb-4">
                  GSTIN
                </label>
                <input
                  type="text"
                  name="gstin"
                  placeholder="Enter GSTIN"
                  value={formData.gstin}
                  onChange={handleInputChange}
                  className="p-2 block w-full border rounded-md text-gray-700 focus:outline-none focus:ring focus:border-indigo-300"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-gray-700 font-medium mb-4">
                  Email
                </label>
                <input
                  type="email"
                  name="company_email"
                  placeholder="Enter Email"
                  value={formData.company_email}
                  onChange={handleInputChange}
                  className="p-2 block w-full border rounded-md text-gray-700 focus:outline-none focus:ring focus:border-indigo-300"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-gray-700 font-medium mb-4">
                  Mobile No<span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="phone_number"
                  placeholder="Enter mobile"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  required
                  className="p-2 block w-full border rounded-md text-gray-700 focus:outline-none focus:ring focus:border-indigo-300"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6 mb-4">
              <Button type="submit" variant="primary">
                Save Company
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={handleAddModalClose}
              >
                Close
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default AddressComponent;
