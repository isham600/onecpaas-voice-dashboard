import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Table,
  Input,
  Typography,
  Space,
  Select,
  Spin,
  message,
  Card,
  Row,
  Col,
} from "antd";
import {
  ArrowLeftOutlined,
  SearchOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { activeNumber } from "../../services/api";
import NumbersIcon from "/assets/images/svg/four.svg";

const { Title, Text } = Typography;
const { Search } = Input;

const ActiveNumberInbox = ({ user }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("");
  const [numberData, setNumberData] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ["5", "10", "25", "50"],
  });

  const handleSelectionChange = (selectedValue) => {
    setSelectedNumber(selectedValue);

    if (selectedValue) {
      const filtered = numberData.filter(
        (number) => number.number === selectedValue
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(numberData);
    }
  };

  const fetchActiveNumberData = async () => {
    const payload = {
      username: user?.username,
      action: "read",
    };

    setLoading(true);
    try {
      const response = await activeNumber(payload);
      setNumberData(response?.data?.data || []);
      setFilteredData(response?.data?.data || []);
    } catch (error) {
      message.error("Failed to fetch active numbers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveNumberData();
  }, [user]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredData(numberData);
    } else {
      const filtered = numberData.filter((number) =>
        number.number
          .toString()
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
      setFilteredData(filtered);
    }
  }, [searchTerm, numberData]);

  const getCategoryText = (category) => {
    switch (category) {
      case 1:
        return "Marketing";
      case 2:
        return "Utility";
      case 3:
        return "Authentication";
      default:
        return "";
    }
  };

  const handleTableChange = (pagination) => {
    setPagination(pagination);
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      sorter: true,
    },
    {
      title: "Number",
      dataIndex: "number",
      key: "number",
      sorter: true,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      sorter: true,
    },
    {
      title: "SMS",
      dataIndex: "sms",
      key: "sms",
      render: (sms) => (
        <span
          style={{
            color: sms === 1 ? "green" : "gray",
            fontSize: "16px",
          }}
        >
          📱
        </span>
      ),
    },
    {
      title: "WhatsApp",
      dataIndex: "whatsapp",
      key: "whatsapp",
      render: (whatsapp) => (
        <span
          style={{
            color: whatsapp === 1 ? "green" : "gray",
            fontSize: "16px",
          }}
        >
          💬
        </span>
      ),
    },
    {
      title: "Voice",
      dataIndex: "voice",
      key: "voice",
      render: (voice) => (
        <span
          style={{
            color: voice === 1 ? "green" : "gray",
            fontSize: "16px",
          }}
        >
          📞
        </span>
      ),
    },
    {
      title: "Instagram",
      dataIndex: "instagram",
      key: "instagram",
      render: (instagram) => (
        <span
          style={{
            color: instagram === 1 ? "green" : "gray",
            fontSize: "16px",
          }}
        >
          📷
        </span>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <Card className="mb-6">
        <div className="flex items-center justify-between w-full">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-lg border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 flex items-center justify-center"
          />

          <div className="flex-1 flex justify-center">
            <div className="flex items-center space-x-3">
              <Title level={2} className="m-0 text-blue-800">
                Active Number
              </Title>
            </div>
          </div>

          <div></div>
        </div>
      </Card>

      {/* Controls */}
      <Card className="mb-6">
        <Title level={4} className="mb-4">
          Inventory Filters
        </Title>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Select Number"
              value={selectedNumber}
              onChange={handleSelectionChange}
              className="w-full"
              allowClear
            >
              {numberData.map((number, index) => (
                <Select.Option key={index} value={number.number}>
                  <Text strong>{number.number}</Text>
                </Select.Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Search
              placeholder="Search text or number"
              value={searchTerm}
              onChange={(e) => {
                const value = e.target.value;
                if (/^[a-zA-Z0-9]*$/.test(value)) {
                  setSearchTerm(value);
                }
              }}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Category"
              value={category}
              onChange={setCategory}
              className="w-full"
              allowClear
            >
              <Select.Option value="">All</Select.Option>
              <Select.Option value="Marketing">Marketing</Select.Option>
              <Select.Option value="Utility">Utility</Select.Option>
              <Select.Option value="Authentication">
                Authentication
              </Select.Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Table Section */}
      <Card>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Spin size="large" />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredData}
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: filteredData.length,
              showSizeChanger: true,
              pageSizeOptions: pagination.pageSizeOptions,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} items`,
            }}
            onChange={handleTableChange}
            rowKey="id"
            className="custom-active-table"
            scroll={{ x: "max-content" }}
          />
        )}
      </Card>

      {/* Custom Styling */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-active-table .ant-table-thead > tr > th {
          background: #1890ff;
          color: white;
          font-weight: 600;
        }
        .custom-active-table .ant-table-tbody > tr:nth-child(odd) {
          background-color: #f0f7ff;
        }
        .custom-active-table .ant-table-tbody > tr:nth-child(even) {
          background-color: #ffffff;
        }
        .custom-active-table .ant-table-row:hover {
          background: #e6f7ff !important;
        }
        .custom-active-table .ant-table-cell {
          padding: 12px 16px;
        }
      `}} />
    </motion.div>
  );
};

export default ActiveNumberInbox;
