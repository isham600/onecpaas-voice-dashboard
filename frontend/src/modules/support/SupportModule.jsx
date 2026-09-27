import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  ConfigProvider,
  Empty,
  Form,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  Upload,
  message,
  Col,
} from "antd";
import {
  CustomerServiceOutlined,
  CommentOutlined,
  PaperClipOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import handleApiError from "../../utils/errorHandler";
import {
  DEFAULT_SUPPORT_PLATFORM,
  SUPPORT_CATEGORIES,
  SUPPORT_STATUS_OPTIONS,
} from "./constants";
import {
  closeTicketWithoutOtp,
  createPlatformSupportTicket,
  getSupportTicketsByPlatform,
} from "./supportApi";
import SupportChatModal from "./SupportChatModal";
import Modal from "../../components/Modal";

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const THEME = {
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

const getStatusOption = (value) =>
  SUPPORT_STATUS_OPTIONS.find((item) => item.value === value) ||
  SUPPORT_STATUS_OPTIONS[0];

const getSubCategoryOptions = (category) => {
  if (!category || !SUPPORT_CATEGORIES[category]) return [];
  const source = SUPPORT_CATEGORIES[category];
  return Array.isArray(source) ? source : Object.keys(source);
};

const getSubjectSubCategoryOptions = (category, subCategory) => {
  const source = SUPPORT_CATEGORIES[category];
  if (!source || Array.isArray(source)) return [];
  return source[subCategory] || [];
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const parseMediaField = (media) => {
  if (!media) return [];
  if (Array.isArray(media)) return media;
  if (typeof media === "string") {
    try {
      const parsed = JSON.parse(media);
      return Array.isArray(parsed) ? parsed : [media];
    } catch {
      return [media];
    }
  }
  return [];
};

const resolvePlatform = (user, platform) =>
  platform ||
  user?.platform ||
  user?.platform_name ||
  user?.service_name ||
  DEFAULT_SUPPORT_PLATFORM;

const resolveReseller = (user) =>
  user?.reseller || user?.parent_username || user?.master_reseller_name || "Direct";

const SupportModule = ({ user, mode = "user", platform }) => {
  const [form] = Form.useForm();
  const resolvedPlatform = resolvePlatform(user, platform);
  const isAdminView = mode === "admin";

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [closingTicketId, setClosingTicketId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [category, setCategory] = useState();
  const [subCategory, setSubCategory] = useState();
  const [searchText, setSearchText] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [chatTicket, setChatTicket] = useState(null);
  const modalContainerRef = useRef(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const ticketUsername = isAdminView ? undefined : user?.username;
      const response = await getSupportTicketsByPlatform(
        resolvedPlatform,
        ticketUsername,
      );
      const rows = Array.isArray(response.data?.tickets)
        ? response.data.tickets
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

      setTickets(
        rows.map((ticket) => ({
          ...ticket,
          media: parseMediaField(ticket.media),
          status: ticket.status_code ?? ticket.status,
          status_name: ticket.status_name ?? getStatusOption(ticket.status_code ?? ticket.status).label,
        })),
      );
    } catch (error) {
      setTickets([]);
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!resolvedPlatform) return;
    if (!isAdminView && !user?.username) return;
    fetchTickets();
  }, [resolvedPlatform, isAdminView, user?.username]);

  const filteredTickets = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return tickets;

    return tickets.filter((ticket) =>
      [
        ticket.ticket_id,
        ticket.username,
        ticket.category,
        ticket.platform,
        ticket.sub_category,
        ticket.subject_sub_category,
        ticket.subject,
        ticket.body,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [searchText, tickets]);

  const resetCreateForm = () => {
    form.resetFields();
    setSelectedFile(null);
    setCategory(undefined);
    setSubCategory(undefined);
    setPreviewOpen(false);
  };

  const handleCreateTicket = async (values) => {
    if (!user?.username) {
      message.error("User information is not available.");
      return;
    }

    const payload = {
      username: user.username,
      category: values.category,
      platform: resolvedPlatform,
      sub_category: values.sub_category,
      subject_sub_category: values.subject_sub_category,
      subject: values.subject,
      body: values.body,
      message_by: "Client",
      reseller: values.reseller || resolveReseller(user),
    };

    setSubmitting(true);
    try {
      const response = await createPlatformSupportTicket(payload, selectedFile);
      const isCreated =
        response.status === 201 ||
        response.data?.success === true ||
        response.data?.status === 1;

      if (isCreated) {
        message.success(response.data?.message || "Ticket created successfully");
        setCreateOpen(false);
        resetCreateForm();
        fetchTickets();
        return;
      }

      message.error(response.data?.message || "Ticket creation failed.");
    } catch (error) {
      handleApiError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTicketClosed = (closedTicket) => {
    const closedRowId = Number(closedTicket?.ticket_id ?? closedTicket?.id);
    if (!closedRowId) return;

    setTickets((current) =>
      current.map((item) =>
        Number(item.id) === closedRowId
          ? {
              ...item,
              status: 2,
              status_name: closedTicket.ticket_status || "Closed",
              updated_at: closedTicket.updated_at || new Date().toISOString(),
            }
          : item,
      ),
    );

    setChatTicket((current) =>
      current && Number(current.id) === closedRowId
        ? {
            ...current,
            status: 2,
            status_name: closedTicket.ticket_status || "Closed",
            updated_at: closedTicket.updated_at || new Date().toISOString(),
          }
        : current,
    );
  };

  const handleCloseTicket = async (ticket) => {
    if (mode !== "admin" || !ticket?.id) return;
    setClosingTicketId(ticket.id);
    try {
      const response = await closeTicketWithoutOtp({
        ticket_id: ticket.id,
        reason: "Closed via admin UI",
      });

      const isClosed =
        response.status === 200 ||
        response.status === 201 ||
        response.data?.success === true ||
        response.data?.status === 1;

      if (isClosed) {
        message.success(response.data?.message || "Ticket closed successfully");
        handleTicketClosed(response.data);
        return;
      }

      message.error(response.data?.message || "Failed to close ticket");
    } catch (error) {
      handleApiError(error);
    } finally {
      setClosingTicketId(null);
    }
  };

  const columns = [
    ...(isAdminView
      ? [
          {
            title: "Username",
            dataIndex: "username",
            key: "username",
            width: 140,
          },
        ]
      : []),
    {
      title: "ID",
      dataIndex: "ticket_id",
      key: "ticket_id",
      width: 170,
      render: (value) => (
        <Text
          strong
          style={{
            display: "block",
            wordBreak: "break-word",
            lineHeight: 1.5,
          }}
        >
          {value || "N/A"}
        </Text>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 170,
      ellipsis: true,
    },
    {
      title: "Subcategory",
      dataIndex: "sub_category",
      key: "sub_category",
      width: 180,
      ellipsis: true,
    },
    {
      title: "Subject",
      dataIndex: "subject",
      key: "subject",
      width: 220,
      ellipsis: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (value) => {
        const status = getStatusOption(value);
        return (
          <Tag
            style={{
              border: "none",
              color: status.color,
              background: status.background,
              fontWeight: 600,
              borderRadius: 999,
              paddingInline: 10,
            }}
          >
            {status.label}
          </Tag>
        );
      },
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      width: 190,
      render: formatDateTime,
    },
    {
      title: "Actions",
      key: "action",
      width: mode === "admin" ? 200 : 110,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<CommentOutlined />}
            onClick={() => setChatTicket(record)}
            style={{ borderRadius: 10, background: THEME.gradient, border: "none" }}
          >
            Chat
          </Button>
          {mode === "admin" && Number(record.status) !== 2 && (
            <Popconfirm
              title="Close ticket?"
              description={`This will close ${record.ticket_id || "this ticket"}.`}
              okText="Close"
              cancelText="Cancel"
              onConfirm={() => handleCloseTicket(record)}
            >
              <Button
                danger
                loading={closingTicketId === record.id}
                style={{ borderRadius: 10 }}
              >
                Close
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="min-h-screen px-4 py-4" style={{ background: "#F8F9FB" }}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div
          className="rounded-2xl border border-gray-100 px-6 py-5 mb-4 flex items-center justify-between gap-4 flex-wrap"
          style={{
            background: "linear-gradient(135deg, #f5f6ff 0%, #eef0ff 100%)",
            boxShadow: "0 1px 8px rgba(37,99,235,0.06)",
          }}
        >
          <Space size={16}>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: THEME.gradient }}
            >
              <CustomerServiceOutlined style={{ color: "#fff", fontSize: 20 }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                {isAdminView ? "Admin Support" : "Support Tickets"}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Platform: {resolvedPlatform}
              </p>
            </div>
          </Space>

          <Space wrap>
            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={fetchTickets}
            >
              Refresh
            </Button>
            {!isAdminView && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateOpen(true)}
                style={{ background: THEME.gradient, border: "none" }}
              >
                Create Ticket
              </Button>
            )}
          </Space>
        </div>
      </motion.div>

      <div
        className="bg-white rounded-2xl border border-gray-100 p-4 mb-4"
        style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
      >
        <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search tickets or username"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            style={{ width: 260 }}
          />
        </Space>
      </div>

      <div
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
      >
        {loading ? (
          <div className="py-20 text-center">
            <Spin size="large" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No tickets found"
            className="py-16"
          />
        ) : (
          <Table
            rowKey={(record) => record.id ?? record.ticket_id}
            columns={columns}
            dataSource={filteredTickets}
            size="middle"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 860 }}
          />
        )}
      </div>

      <Modal
        isModalOpen={createOpen}
        closeModal={() => {
          setCreateOpen(false);
          resetCreateForm();
        }}
        width="820px"
        height="auto"
      >
        <ConfigProvider
          getPopupContainer={() => modalContainerRef.current || document.body}
        >
          <motion.div
            ref={modalContainerRef}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="-mx-6 -mt-6"
          >
            <div
              className="px-6 py-5 border-b border-gray-100"
              style={{
                background: "linear-gradient(135deg, #f5f6ff 0%, #eef0ff 100%)",
                boxShadow: "0 1px 8px rgba(37,99,235,0.06)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: THEME.gradient }}
                >
                  <SendOutlined style={{ color: "#fff", fontSize: 18 }} />
                </div>
                <div>
                  <div className="text-xl font-semibold text-gray-900">Create Ticket</div>
                  <div className="text-sm text-gray-500">
                    Create and submit your support request
                  </div>
                </div>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 support-create-scroll">
              <Form
                form={form}
                layout="vertical"
                initialValues={{
                  platform: resolvedPlatform,
                  reseller: resolveReseller(user),
                }}
                onFinish={handleCreateTicket}
              >
                <div
                  className="p-4 rounded-xl border border-gray-100 mb-5"
                  style={{ background: THEME.gradientLight }}
                >
                  <Form.Item
                    label="Category"
                    name="category"
                    rules={[{ required: true, message: "Category is required" }]}
                  >
                    <Select
                      placeholder="Select category"
                      onChange={(value) => {
                        setCategory(value);
                        setSubCategory(undefined);
                        form.setFieldsValue({
                          sub_category: undefined,
                          subject_sub_category: undefined,
                        });
                      }}
                      options={Object.keys(SUPPORT_CATEGORIES).map((item) => ({
                        label: item,
                        value: item,
                      }))}
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item
                    label="Sub Category"
                    name="sub_category"
                    rules={[{ required: true, message: "Sub category is required" }]}
                  >
                    <Select
                      placeholder="Select sub category"
                      onChange={(value) => {
                        setSubCategory(value);
                        form.setFieldsValue({ subject_sub_category: undefined });
                      }}
                      options={getSubCategoryOptions(category).map((item) => ({
                        label: item,
                        value: item,
                      }))}
                      size="large"
                    />
                  </Form.Item>

                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        label="Subject"
                        name="subject"
                        rules={[{ required: true, message: "Subject is required" }]}
                      >
                        <Input
                          maxLength={30}
                          showCount
                          size="large"
                          placeholder="Enter subject (max 30 chars)"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="Attachment">
                        <Upload
                          beforeUpload={(file) => {
                            setSelectedFile(file);
                            return false;
                          }}
                          onRemove={() => {
                            setSelectedFile(null);
                          }}
                          maxCount={1}
                        >
                          <Button
                            icon={<PaperClipOutlined />}
                            size="large"
                            className="w-full"
                          >
                            {selectedFile ? selectedFile.name : "Select file"}
                          </Button>
                        </Upload>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    label="Message Body"
                    name="body"
                    rules={[{ required: true, message: "Body is required" }]}
                  >
                    <TextArea
                      rows={6}
                      maxLength={1024}
                      showCount
                      placeholder="Enter your message (max 1024 chars)"
                    />
                  </Form.Item>

                  <Form.Item name="platform" hidden>
                    <Input />
                  </Form.Item>

                  <Form.Item name="reseller" hidden>
                    <Input />
                  </Form.Item>
                </div>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                    <Button onClick={() => setPreviewOpen(true)}>Preview</Button>
                    <Button type="primary" htmlType="submit" loading={submitting}>
                      Submit
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </div>
          </motion.div>
        </ConfigProvider>
      </Modal>

      <Modal
        isModalOpen={previewOpen}
        closeModal={() => setPreviewOpen(false)}
        width="620px"
        height="auto"
      >
        <div className="-mx-6 -mt-6">
          <div
            className="px-6 py-5 border-b border-gray-100"
            style={{
              background: "linear-gradient(135deg, #f5f6ff 0%, #eef0ff 100%)",
            }}
          >
            <div className="text-xl font-semibold text-gray-900">Ticket Preview</div>
            <div className="text-sm text-gray-500">Review your support request</div>
          </div>
          <div className="px-6 py-5">
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <Paragraph>
                <Text strong>Category:</Text> {form.getFieldValue("category") || "N/A"}
              </Paragraph>
              <Paragraph>
                <Text strong>Sub Category:</Text> {form.getFieldValue("sub_category") || "N/A"}
              </Paragraph>
              <Paragraph>
                <Text strong>Subject Sub Category:</Text> {form.getFieldValue("subject_sub_category") || "N/A"}
              </Paragraph>
              <Paragraph>
                <Text strong>Subject:</Text> {form.getFieldValue("subject") || "N/A"}
              </Paragraph>
              <Paragraph>
                <Text strong>Attachment:</Text> {selectedFile?.name || "None"}
              </Paragraph>
              <Paragraph style={{ marginBottom: 0 }}>
                <Text strong>Body:</Text>
              </Paragraph>
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                {form.getFieldValue("body") || "N/A"}
              </div>
            </Space>
          </div>
        </div>
      </Modal>

      <SupportChatModal
        open={Boolean(chatTicket)}
        onClose={() => setChatTicket(null)}
        ticket={chatTicket}
        mode={mode}
        user={user}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .support-create-scroll::-webkit-scrollbar {
              width: 8px;
            }
            .support-create-scroll::-webkit-scrollbar-thumb {
              background: rgba(107, 114, 128, 0.35);
              border-radius: 999px;
            }
          `,
        }}
      />
    </div>
  );
};

export default SupportModule;
