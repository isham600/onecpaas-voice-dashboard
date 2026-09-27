// components/Invoice/InvoiceList.jsx
// Restyled with green theme, no duplicate navbar/sidebar/back buttons

import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  Input,
  Select,
  Spin,
  Button,
  Pagination,
  Tooltip,
  Space,
  Typography,
  Modal,
} from "antd";
import {
  DownloadOutlined,
  EyeOutlined,
  EditOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  HelpCircle,
  FileText,
  Download,
  Filter,
} from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";
import handleApiError from "../../utils/errorHandler";
import EditInvoice from "./EditInvoice";

const baseURL = import.meta.env.VITE_API_BASE_URL;
const { Search } = Input;
const { Option } = Select;

const InvoiceList = ({ user, setSelectedMenu, setEditInvoiceDataParent }) => {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // Track row-specific loading
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ["5", "10", "25", "50", "100"],
  });

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const response = await axios.post(
          `${baseURL}/v1/invoices/get-invoice`,
          { action: "read", username: user },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        const data = Array.isArray(response.data.data)
          ? response.data.data
          : [];
        setInvoices(data);
        setFilteredInvoices(data);
        setPagination((prev) => ({ ...prev, total: data.length }));
      } catch (error) {
        handleApiError(error);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchInvoices();
  }, [user]);

  useEffect(() => {
    let filtered = invoices;
    if (searchTerm) {
      filtered = filtered.filter((invoice) =>
        Object.values(invoice)
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      );
    }
    if (statusFilter !== "All") {
      filtered = filtered.filter((inv) => inv.payment_status === statusFilter);
    }
    setFilteredInvoices(filtered);
    setPagination((prev) => ({
      ...prev,
      total: filtered.length,
      current: 1,
    }));
  }, [searchTerm, statusFilter, invoices]);

  const handleEditClick = (invoice) => {
    if (setEditInvoiceDataParent && setSelectedMenu) {
      setEditInvoiceDataParent(invoice);
      setSelectedMenu("EditInvoice");
    }
  };

  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  const handleViewPDF = async (record) => {
    if (!record.id) {
      return;
    }

    if (record.pdf_link && record.pdf_link.includes('/uploads/invoices/')) {
      const fullUrl = record.pdf_link.startsWith('http') 
        ? record.pdf_link 
        : `${baseURL.replace(/\/api\/?$/, '')}${record.pdf_link.startsWith('/') ? '' : '/'}${record.pdf_link}`;
      setPreviewUrl(fullUrl);
      setIframeLoading(true);
      setIsPreviewModalOpen(true);
      return;
    }

    try {
      setActionLoading(`${record.id}-view`);
      const response = await axios.get(`${baseURL}/v1/invoices/${record.id}/pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: response.data.type || "application/pdf" });

      if (blob.type === "application/json") {
        const text = await blob.text();
        const data = JSON.parse(text);
        message.error(data.message || "Error generating preview");
        return;
      }

      const objectUrl = window.URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
      setIframeLoading(true);
      setIsPreviewModalOpen(true);
    } catch (error) {
      console.error("Error fetching PDF:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadPDF = async (record) => {
    if (!record.id) return;

    if (record.pdf_link && record.pdf_link.includes('/uploads/invoices/')) {
      const fullUrl = record.pdf_link.startsWith('http') 
        ? record.pdf_link 
        : `${baseURL.replace(/\/api\/?$/, '')}${record.pdf_link.startsWith('/') ? '' : '/'}${record.pdf_link}`;
      const link = document.createElement("a");
      link.href = fullUrl;
      link.setAttribute("target", "_blank");
      link.setAttribute("download", `invoice-${record.invoice_no}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    try {
      setActionLoading(`${record.id}-download`);
      const response = await axios.get(`${baseURL}/v1/invoices/${record.id}/pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.setAttribute("download", `invoice-${record.invoice_no}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading PDF:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "Fully Paid":
        return {
          icon: <CheckCircle className="w-3.5 h-3.5" />,
          bg: "rgba(37,99,235,0.1)",
          text: "#1D4ED8",
          border: "rgba(37,99,235,0.3)",
        };
      case "Unpaid":
        return {
          icon: <XCircle className="w-3.5 h-3.5" />,
          bg: "rgba(239,68,68,0.1)",
          text: "#dc2626",
          border: "rgba(239,68,68,0.3)",
        };
      case "Partially Paid":
        return {
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          bg: "rgba(245,158,11,0.1)",
          text: "#d97706",
          border: "rgba(245,158,11,0.3)",
        };
      case "Pending":
        return {
          icon: <Clock className="w-3.5 h-3.5" />,
          bg: "rgba(59,130,246,0.1)",
          text: "#2563eb",
          border: "rgba(59,130,246,0.3)",
        };
      default:
        return {
          icon: <HelpCircle className="w-3.5 h-3.5" />,
          bg: "rgba(107,114,128,0.1)",
          text: "#6b7280",
          border: "rgba(107,114,128,0.3)",
        };
    }
  };

  const handleTableChange = (page, pageSize) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
  };

  const goToFirstPage = () => handleTableChange(1, pagination.pageSize);
  const goToLastPage = () => {
    const lastPage = Math.ceil(pagination.total / pagination.pageSize);
    handleTableChange(lastPage, pagination.pageSize);
  };

  const handleDownloadCSV = () => {
    const headers = [
      "Invoice ID",
      "Invoice No",
      "Username",
      "Company Name",
      "Company Address",
      "Company Email",
      "Company Mobile",
      "Payer Name",
      "Payer Email",
      "Payer Address",
      "Payer Mobile",
      "GSTIN",
      "Subtotal (₹)",
      "Total Tax (₹)",
      "Total Discount (₹)",
      "Total (₹)",
      "Payment Status",
      "Payment Date",
      "Billing Date",
      "Due Date",
      "Client Note",
      "Terms & Conditions",
      "PDF Link",
      "Created At",
    ];

    const rows = invoices.map((invoice) => {
      const total =
        Number(invoice.sub_total) +
        Number(invoice.total_tax) -
        Number(invoice.total_discount);

      return [
        invoice.id || "N/A",
        invoice.invoice_no || "N/A",
        invoice.username || "N/A",
        invoice.company_name || "N/A",
        invoice.company_address || "N/A",
        invoice.company_email || "N/A",
        invoice.company_mobile || "N/A",
        invoice.payer_name || "N/A",
        invoice.payer_email || "N/A",
        invoice.payer_address || "N/A",
        invoice.payer_mobile || "N/A",
        invoice.gstin || "N/A",
        invoice.sub_total || 0,
        invoice.total_tax || 0,
        invoice.total_discount || 0,
        total.toFixed(2),
        invoice.payment_status || "N/A",
        invoice.payment_date
          ? new Date(invoice.payment_date).toLocaleDateString()
          : "N/A",
        invoice.billing_date
          ? new Date(invoice.billing_date).toLocaleDateString()
          : "N/A",
        invoice.due_date
          ? new Date(invoice.due_date).toLocaleDateString()
          : "N/A",
        invoice.client_note || "N/A",
        invoice.termsncondition || "N/A",
        invoice.pdf_link || "N/A",
        invoice.created_at
          ? new Date(invoice.created_at).toLocaleDateString()
          : "N/A",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `invoices_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  const columns = [
    {
      title: "Invoice #",
      dataIndex: "invoice_no",
      key: "invoice_no",
      sorter: (a, b) =>
        String(a.invoice_no).localeCompare(String(b.invoice_no)),
      render: (text) => (
        <span className="font-semibold text-gray-900">#{text}</span>
      ),
    },
    {
      title: "Client",
      dataIndex: "username",
      key: "username",
      render: (text) => <span className="text-gray-700">{text || "N/A"}</span>,
    },
    {
      title: "Amount",
      dataIndex: "sub_total",
      key: "sub_total",
      sorter: (a, b) => Number(a.sub_total) - Number(b.sub_total),
      render: (text) => (
        <span className="font-semibold text-gray-900">
          ₹{Number(text || 0).toLocaleString()}
        </span>
      ),
    },
    {
      title: "Due Date",
      dataIndex: "due_date",
      key: "due_date",
      render: (text) => (
        <span className="text-gray-600">{text?.split("T")[0] || "N/A"}</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "payment_status",
      key: "payment_status",
      render: (status) => {
        const config = getStatusConfig(status);
        return (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: config.bg,
              color: config.text,
              border: `1px solid ${config.border}`,
            }}
          >
            {config.icon}
            {status}
          </span>
        );
      },
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      render: (text) => (
        <span className="text-gray-500 text-xs">
          {text?.split("T")[0] || "N/A"}
        </span>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit">
            <button
              onClick={() => handleEditClick(record)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
            >
              <EditOutlined style={{ fontSize: 16 }} />
            </button>
          </Tooltip>
          <Tooltip title="View PDF">
            <button
              onClick={() => handleViewPDF(record)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
              disabled={actionLoading === `${record.id}-view`}
            >
              {actionLoading === `${record.id}-view` ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              ) : (
                <EyeOutlined style={{ fontSize: 16 }} />
              )}
            </button>
          </Tooltip>
          <Tooltip title="Download PDF">
            <button
              onClick={() => handleDownloadPDF(record)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
              disabled={actionLoading === `${record.id}-download`}
            >
              {actionLoading === `${record.id}-download` ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              ) : (
                <DownloadOutlined style={{ fontSize: 16 }} />
              )}
            </button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const paginatedData = useMemo(() => {
    const startIndex = (pagination.current - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredInvoices.slice(startIndex, endIndex);
  }, [filteredInvoices, pagination.current, pagination.pageSize]);

  // Stats
  const stats = useMemo(() => {
    const total = invoices.length;
    const paid = invoices.filter(
      (i) => i.payment_status === "Fully Paid",
    ).length;
    const pending = invoices.filter(
      (i) => i.payment_status === "Pending",
    ).length;
    const unpaid = invoices.filter((i) => i.payment_status === "Unpaid").length;
    return { total, paid, pending, unpaid };
  }, [invoices]);

  return (
    <div>
      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
      >
        {[
          {
            label: "Total",
            value: stats.total,
            color: "#2563EB",
            bg: "rgba(37,99,235,0.08)",
          },
          {
            label: "Paid",
            value: stats.paid,
            color: "#1D4ED8",
            bg: "rgba(2,158,75,0.08)",
          },
          {
            label: "Pending",
            value: stats.pending,
            color: "#2563eb",
            bg: "rgba(37,99,235,0.08)",
          },
          {
            label: "Unpaid",
            value: stats.unpaid,
            color: "#dc2626",
            bg: "rgba(220,38,38,0.08)",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-xl border border-gray-100 bg-white/70 backdrop-blur-sm"
          >
            <p className="text-xs font-medium text-gray-500 mb-1">
              {stat.label}
            </p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Filters Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/50 shadow-sm p-4 mb-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative">
              <Search
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: 280 }}
                allowClear
                className="invoice-search"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              style={{ width: 160 }}
              className="invoice-select"
            >
              <Option value="All">
                <span className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5" />
                  All Status
                </span>
              </Option>
              <Option value="Fully Paid">Fully Paid</Option>
              <Option value="Partially Paid">Partially Paid</Option>
              <Option value="Unpaid">Unpaid</Option>
              <Option value="Pending">Pending</Option>
            </Select>
          </div>

          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
            }}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/50 shadow-sm overflow-hidden"
      >
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "#2563EB" }}
              />
              <span className="text-sm text-gray-500">Loading invoices...</span>
            </div>
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              dataSource={paginatedData}
              loading={loading}
              pagination={false}
              rowKey="id"
              className="themed-invoice-table"
              scroll={{ x: "max-content" }}
              locale={{
                emptyText: (
                  <div className="py-12 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">
                      No invoices found
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Create your first invoice to get started
                    </p>
                  </div>
                ),
              }}
            />

            {/* Pagination */}
            {pagination.total > 0 && (
              <div className="flex justify-between items-center px-5 py-4 border-t border-gray-100">
                <span className="text-sm text-gray-500">
                  Showing {(pagination.current - 1) * pagination.pageSize + 1}{" "}
                  to{" "}
                  {Math.min(
                    pagination.current * pagination.pageSize,
                    pagination.total,
                  )}{" "}
                  of {pagination.total}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    size="small"
                    icon={<DoubleLeftOutlined />}
                    onClick={goToFirstPage}
                    disabled={pagination.current === 1}
                    className="border-gray-200"
                  />

                  <Pagination
                    current={pagination.current}
                    pageSize={pagination.pageSize}
                    total={pagination.total}
                    onChange={handleTableChange}
                    showSizeChanger
                    pageSizeOptions={pagination.pageSizeOptions}
                    onShowSizeChange={(_, size) => {
                      setPagination((prev) => ({
                        ...prev,
                        current: 1,
                        pageSize: size,
                      }));
                    }}
                    size="small"
                  />

                  <Button
                    size="small"
                    icon={<DoubleRightOutlined />}
                    onClick={goToLastPage}
                    disabled={
                      pagination.current ===
                      Math.ceil(pagination.total / pagination.pageSize)
                    }
                    className="border-gray-200"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Edit Modal Removed */}

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
                <Spin size="large" tip="Loading Preview..." />
              </div>
            )}
            <iframe
              src={previewUrl}
              title="Invoice Preview"
              style={{ width: "100%", height: "100%", border: "none" }}
              onLoad={() => setIframeLoading(false)}
            />
          </div>
        )}
      </Modal>

      {/* Theme Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .themed-invoice-table .ant-table-thead > tr > th {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%) !important;
          color: white !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          border-bottom: none !important;
          padding: 14px 16px !important;
        }
        .themed-invoice-table .ant-table-thead > tr > th::before {
          display: none !important;
        }
        .themed-invoice-table .ant-table-tbody > tr > td {
          padding: 12px 16px !important;
          border-bottom: 1px solid #f3f4f6 !important;
        }
        .themed-invoice-table .ant-table-tbody > tr:hover > td {
          background: rgba(3, 207, 101, 0.04) !important;
        }
        .themed-invoice-table .ant-table-tbody > tr:nth-child(even) > td {
          background-color: #fafbfc;
        }
        .themed-invoice-table .ant-table-tbody > tr:nth-child(even):hover > td {
          background: rgba(3, 207, 101, 0.04) !important;
        }
        .themed-invoice-table .ant-table-column-sorter-up.active,
        .themed-invoice-table .ant-table-column-sorter-down.active {
          color: white !important;
        }
        .ant-pagination-item-active {
          border-color: #2563EB !important;
        }
        .ant-pagination-item-active a {
          color: #2563EB !important;
        }
        .ant-pagination-item:hover {
          border-color: #2563EB !important;
        }
        .ant-pagination-item:hover a {
          color: #2563EB !important;
        }
        .ant-pagination-prev:hover .ant-pagination-item-link,
        .ant-pagination-next:hover .ant-pagination-item-link {
          color: #2563EB !important;
          border-color: #2563EB !important;
        }
      `}} />
    </div>
  );
};

export default InvoiceList;
