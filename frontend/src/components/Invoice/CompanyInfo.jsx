import { useState, useEffect } from "react";
import { invoice } from "../../services/api";
import {
  Button,
  Input,
  Select,
  message,
  Typography,
  Card,
  Upload,
  Row,
  Col,
} from "antd";
import {
  UploadOutlined,
  PlusOutlined,
  CloseOutlined,
  SaveOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { Option } = Select;

const CompanyInfo = ({
  user,
  errors,
  setSelectedCompany,
  prefillData,
  logoPreview,
  setLogoPreview,
}) => {
  const [companyLogo, setCompanyLogo] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyLocal, setSelectedCompanyLocal] = useState({
    company_name: "",
    company_address: "",
    gstin: "",
    phone_number: "",
    company_email: "",
  });

  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // Fetch companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await invoice({
          action: "read",
          username: user,
        });

        if (response.status === 200) {
          const companyArray = response.data.data || [];
          setCompanies(Array.isArray(companyArray) ? companyArray : []);
        } else {
          messageApi.error("Failed to fetch companies: " + response.data.error);
        }
      } catch (error) {
        messageApi.error(
          "Error fetching companies: " +
            (error.response?.data || error.message),
        );
      }
    };

    if (user) {
      fetchCompanies();
    }
  }, [user]);

  useEffect(() => {
    if (prefillData) {
      setSelectedCompanyLocal(prefillData);
      setSelectedCompany(prefillData);
    }
  }, [prefillData, setSelectedCompany]);

  // Handle company dropdown selection
  const handleCompanyChange = async (value) => {
    const companyId = parseInt(value, 10);

    try {
      const response = await invoice({
        action: "readSpecific",
        company_id: companyId,
      });

      if (response.status === 200 && response.data) {
        const companyDetails = response.data.data[0];
        setSelectedCompany(companyDetails || {});
        setSelectedCompanyLocal(companyDetails || {});
        setLogoPreview(companyDetails?.company_image || null);
      } else {
        messageApi.error(
          "Failed to fetch specific company details: " + response.data.error,
        );
      }
    } catch (error) {
      messageApi.error(
        "Error fetching specific company details: " +
          (error.response?.data || error.message),
      );
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSelectedCompanyLocal((prevState) => ({
      ...prevState,
      [name]: value,
    }));
    setSelectedCompany((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  // Handle company logo upload via Antd Upload
  const handleLogoUpload = ({ file }) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];

    if (!allowedTypes.includes(file.type)) {
      messageApi.error(
        "Invalid file type. Please upload a JPEG, JPG, or PNG file.",
      );
      return false; // Prevent upload
    }

    setCompanyLogo(file);
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);
    return false; // Prevent automatic upload request by Antd
  };

  const handleRemoveLogo = () => {
    setCompanyLogo(null);
    setLogoPreview(null);
  };

  // Add new company
  const handleAddCompany = async () => {
    if (
      !selectedCompanyLocal.company_name ||
      !selectedCompanyLocal.company_address ||
      !selectedCompanyLocal.gstin ||
      !selectedCompanyLocal.company_email
    ) {
      messageApi.error("Please provide complete company details.");
      return;
    }

    const formData = new FormData();
    formData.append("action", "create");
    formData.append("username", user || "defaultUsername");
    formData.append("company_name", selectedCompanyLocal.company_name);
    formData.append("company_address", selectedCompanyLocal.company_address);
    formData.append("gstin", selectedCompanyLocal.gstin);
    formData.append("phone_number", selectedCompanyLocal.phone_number || "");
    formData.append("company_email", selectedCompanyLocal.company_email || "");

    if (companyLogo) {
      formData.append("company_image", companyLogo);
    }

    try {
      const response = await invoice(formData);
      if (response.status === 200 || response.data.status === 1) {
        messageApi.success("Company created successfully");
        setCompanies([
          ...companies,
          { ...selectedCompanyLocal, id: response.data.company_id },
        ]);
        setIsAddingCompany(false);
        setCompanyLogo(null);
        setLogoPreview(null);
      } else {
        messageApi.error(
          "Failed to create company: " +
            (response.data.error || "Unknown error"),
        );
      }
    } catch (error) {
      if (error?.response?.data?.errors?.company_email)
        messageApi.error(error?.response?.data?.errors?.company_email?.[0]);
      if (error?.response?.data?.error)
        messageApi.error(error?.response?.data?.error);
    }
  };

  return (
    <Card className="rounded-lg shadow-sm border-gray-200 w-full lg:w-1/2 ml-0 lg:ml-10">
      {contextHolder}
      <Title level={4} className="mb-4 text-gray-700">
        Company Information
      </Title>

      <Row gutter={[24, 24]}>
        {/* Upload Company Logo */}
        <Col span={12}>
          <label className="block text-gray-600 font-bold mb-2">
            Upload Company Logo
          </label>
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={() => false} // Prevent auto upload
            onChange={handleLogoUpload}
          >
            <Button icon={<UploadOutlined />}>Click to Upload</Button>
          </Upload>

          {logoPreview && (
            <div className="relative mt-3 inline-block">
              <img
                src={logoPreview}
                alt="Company Logo Preview"
                className="w-20 h-20 object-cover border border-gray-300 rounded-lg"
              />
              <Button
                type="primary"
                danger
                shape="circle"
                size="small"
                icon={<CloseOutlined />}
                onClick={handleRemoveLogo}
                className="absolute -top-2 -right-2 shadow-sm"
              />
            </div>
          )}
        </Col>

        {/* Company Name */}
        <Col span={12}>
          <label className="block text-gray-600 font-bold mb-2">
            Company Name
          </label>
          {isAddingCompany ? (
            <Input
              name="company_name"
              placeholder="Enter Company Name"
              value={selectedCompanyLocal.company_name || ""}
              onChange={handleInputChange}
              size="large"
            />
          ) : (
            <Select
              placeholder="Select a Company"
              value={selectedCompanyLocal?.id || undefined}
              onChange={handleCompanyChange}
              style={{ width: "100%" }}
              size="large"
            >
              {companies.map((company) => (
                <Option key={company.id} value={company.id}>
                  {company.company_name}
                </Option>
              ))}
            </Select>
          )}
          {errors?.companyName && (
            <Text type="danger" className="text-xs">
              {errors.companyName}
            </Text>
          )}
        </Col>

        {/* Company Address */}
        <Col span={12}>
          <label className="block text-gray-600 font-bold mb-2">Address</label>
          <Input
            name="company_address"
            placeholder="Enter Address"
            value={selectedCompanyLocal.company_address || ""}
            onChange={handleInputChange}
            readOnly={!isAddingCompany}
            className={!isAddingCompany ? "bg-gray-50 text-gray-500" : ""}
            size="large"
          />
          {errors?.companyAddress && (
            <Text type="danger" className="text-xs">
              {errors.companyAddress}
            </Text>
          )}
        </Col>

        {/* GSTIN */}
        <Col span={12}>
          <label className="block text-gray-600 font-bold mb-2">GSTIN</label>
          <Input
            name="gstin"
            placeholder="Enter GSTIN"
            value={selectedCompanyLocal.gstin || ""}
            onChange={handleInputChange}
            readOnly={!isAddingCompany}
            className={!isAddingCompany ? "bg-gray-50 text-gray-500" : ""}
            size="large"
          />
          {errors?.companyGSTIN && (
            <Text type="danger" className="text-xs">
              {errors.companyGSTIN}
            </Text>
          )}
        </Col>

        {/* Email */}
        <Col span={12}>
          <label className="block text-gray-600 font-bold mb-2">Email</label>
          <Input
            name="company_email"
            placeholder="Enter Email"
            value={selectedCompanyLocal.company_email || ""}
            onChange={handleInputChange}
            readOnly={!isAddingCompany}
            className={!isAddingCompany ? "bg-gray-50 text-gray-500" : ""}
            size="large"
          />
        </Col>

        {/* Phone Number */}
        <Col span={12}>
          <label className="block text-gray-600 font-bold mb-2">
            Mobile No
          </label>
          <Input
            name="phone_number"
            placeholder="Enter mobile"
            value={selectedCompanyLocal.phone_number || ""}
            onChange={handleInputChange}
            readOnly={!isAddingCompany}
            className={!isAddingCompany ? "bg-gray-50 text-gray-500" : ""}
            size="large"
          />
        </Col>

        {/* Action Buttons */}
        <Col span={24} className="flex gap-3 mt-2">
          {isAddingCompany && (
            <Button
              onClick={handleAddCompany}
              icon={<SaveOutlined />}
              className="text-indigo-600 border-indigo-200 hover:text-indigo-800 hover:border-indigo-400 font-bold rounded-lg h-10 px-6"
            >
              Save Company
            </Button>
          )}
          <Button
            type="primary"
            onClick={() => setIsAddingCompany(!isAddingCompany)}
            icon={isAddingCompany ? <CloseOutlined /> : <PlusOutlined />}
            className="bg-blue-500 h-10 px-6 font-semibold"
          >
            {isAddingCompany ? "Cancel" : "Add Company"}
          </Button>
        </Col>
      </Row>
    </Card>
  );
};

export default CompanyInfo;
