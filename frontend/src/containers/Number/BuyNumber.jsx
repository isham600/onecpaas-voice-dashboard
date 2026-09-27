import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Table,
  Input,
  Typography,
  Select,
  Spin,
  message,
  Card,
  Row,
  Col,
  Tooltip,
  Tag,
} from "antd";
import {
  ArrowLeftOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { buyNumber } from "../../services/api";
import Modal from "../../components/Modal";
import NumberDetailsModal from "../../components/Number/BuyNumberModal";

const { Title, Text } = Typography;
const { Search } = Input;

const NumberInbox = ({ user }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("");
  const [numberData, setNumberData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ["5", "10", "25", "50"],
  });

  const fetchBuyNumberData = async () => {
    const payload = {
      username: user?.username,
      action: "read",
    };

    setLoading(true);
    try {
      const response = await buyNumber(payload);
      setNumberData(response?.data?.data || []);
      setFilteredData(response?.data?.data || []);
    } catch (error) {
      message.error("Failed to fetch buy numbers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuyNumberData();
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

  const handleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleTableChange = (pagination) => {
    setPagination(pagination);
  };

  const handleBuyNumber = (number) => {
    setSelectedNumber(number);
    handleModal();
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
      render: (number) => (
        <Text strong className="text-blue-600">
          {number}
        </Text>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      sorter: true,
      render: (type) => <Tag color="blue">{type}</Tag>,
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
    {
      title: "Address Requirement",
      dataIndex: "addresRequirement",
      key: "addresRequirement",
      render: (requirement) => (
        <Tag color={requirement === 1 ? "orange" : "green"}>
          {requirement === 1 ? "Yes" : "No"}
        </Tag>
      ),
    },
    {
      title: "Monthly Fee",
      dataIndex: "monthly_fee",
      key: "monthly_fee",
      sorter: true,
      render: (fee) => (
        <Text strong className="text-green-600">
          ₹{fee}
        </Text>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Tooltip title="Buy this number">
          <Button
            type="primary"
            icon={<ShoppingCartOutlined />}
            onClick={() => handleBuyNumber(record)}
            className="bg-blue-500 hover:bg-blue-600"
            loading={loading}
          >
            Buy
          </Button>
        </Tooltip>
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
                Buy Number
              </Title>
            </div>
          </div>

          <div></div>
        </div>
      </Card>

      {/* Controls */}
      <Card className="mb-6">
        <Title level={4} className="mb-4">
          Number Filters
        </Title>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="Search Buy Number"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>

          <Col xs={24} sm={12} md={8}>
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
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <img
              src="/assets/images/png/filehostingmaincontain.png"
              alt="No files"
              className="w-1/2 h-60 mb-4 max-w-xs"
            />
            <Title level={4} className="text-gray-500">
              Nothing Here
            </Title>
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
            className="custom-buy-table"
            scroll={{ x: "max-content" }}
          />
        )}
      </Card>

      {/* Modal */}
      <Modal
        isModalOpen={isModalOpen}
        closeModal={handleModal}
        className="rounded-lg"
      >
        <NumberDetailsModal number={selectedNumber} />
      </Modal>

      {/* Custom Styling */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-buy-table .ant-table-thead > tr > th {
          background: #1890ff;
          color: white;
          font-weight: 600;
        }
        .custom-buy-table .ant-table-tbody > tr:nth-child(odd) {
          background-color: #f0f7ff;
        }
        .custom-buy-table .ant-table-tbody > tr:nth-child(even) {
          background-color: #ffffff;
        }
        .custom-buy-table .ant-table-row:hover {
          background: #e6f7ff !important;
        }
        .custom-buy-table .ant-table-cell {
          padding: 12px 16px;
        }
      `}} />
    </motion.div>
  );
};

export default NumberInbox;
