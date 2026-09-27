import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Table,
  Button,
  Input,
  Typography,
  Select,
  Spin,
  message,
  Tag,
  Empty,
  Tooltip,
} from "antd";
import {
  SearchOutlined,
  DownloadOutlined,
  ArrowLeftOutlined,
  MessageOutlined,
  TagOutlined,
  DeleteOutlined,
  ImportOutlined,
  ExportOutlined,
  TeamOutlined,
  PhoneOutlined,
  UserOutlined,
  MailOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  ApartmentOutlined,
  CustomerServiceOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

import ImportContacts from "../../components/Contacts/ImportContacts";
import ContactDetailsModal from "../../components/Contacts/ContactDetailModal";
import AssignTag from "../../components/Contacts/AssignTag";
import DeleteConfirmation from "../../components/DeleteConfirmation/DeleteModal";

import handleApiError from "../../utils/errorHandler";
import {
  listGroups,
  listContacts,
  deleteGroup,
  bulkDeleteContacts,
  exportContacts,
  importContacts,
  assignTagContacts,
} from "../../services/api";
import Modal from "../../components/Modal";

const { Title, Text } = Typography;
const { Option } = Select;

// Theme colors
const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

const exportContactsToCSV = (contacts) => {
  const headers = [
    "company_name",
    "contact_mobile_number",
    "contact_name",
    "Contact_email_address",
    "birth_date",
    "tags",
    "source",
    "agent",
    "address",
  ];

  const rows = contacts.map((contact) => {
    let parsedTags;
    try {
      parsedTags = JSON.parse(contact.tags);
    } catch (e) {
      parsedTags = "N/A";
    }

    return [
      contact.company_name || "N/A",
      contact.contact_mobile_number || "N/A",
      contact.contact_name || "N/A",
      contact.Contact_email_address || "N/A",
      contact.birth_date || "N/A",
      Array.isArray(parsedTags) ? `"${parsedTags.join(", ")}"` : "N/A",
      contact.source || "N/A",
      contact.agent || "N/A",
      contact.address || "N/A",
    ];
  });

  let csvContent =
    "data:text/csv;charset=utf-8," +
    [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "contacts_export.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const downloadSampleCSV = () => {
  const headers = [
    "company_name",
    "contact_mobile_number",
    "contact_name",
    "Contact_email_address",
    "birth_date",
    "tags",
    "source",
    "agent",
    "address",
  ];
  const sampleData = [
    [
      "Acme Corp",
      "9755631171",
      "John Doe",
      "john@acme.com",
      "1990-01-15",
      "VIP, Premium",
      "Website",
      "Agent1",
      "123 Main St, City",
    ],
    [
      "Tech Solutions",
      "8109692811",
      "Jane Smith",
      "jane@techsolutions.com",
      "1985-05-20",
      "Regular",
      "Referral",
      "Agent2",
      "456 Oak Ave, Town",
    ],
    [
      "Business Inc",
      "7111206013",
      "Bob Wilson",
      "bob@business.com",
      "1992-12-10",
      "New",
      "Cold Call",
      "Agent3",
      "789 Pine Rd, Village",
    ],
  ];

  let csvContent =
    "data:text/csv;charset=utf-8," +
    [headers.join(","), ...sampleData.map((row) => row.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "sample_contacts.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const ContactTable = ({ user }) => {
  const { groupId: initialGroupId, groupName: initialGroupName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isAssignTagModalOpen, setIsAssignTagModalOpen] = useState(false);

  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(initialGroupName || "");
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId || "");
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal]       = useState(0);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await listGroups({ page: 1, limit: 100 });
      const fetchedGroups = (response?.data?.data || []).map((group) => ({
        id: group.id,
        name: group.Group_name,
      }));
      setGroups(fetchedGroups);
      if (!fetchedGroups.some((group) => group.name === selectedGroup)) {
        setSelectedGroup("");
      }
    } catch (error) {
      handleApiError(error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = useCallback(async (groupId, pg = page, ps = pageSize, search = searchTerm) => {
    if (!groupId) return;
    setLoading(true);
    try {
      const params = { group_id: groupId, page: pg, limit: ps };
      if (search.trim()) params.search = search.trim();
      const response = await listContacts(params);
      const res = response?.data;
      const contactData = res?.data || [];
      setContacts(contactData);
      setTotal(res?.meta?.total ?? contactData.length);
    } catch (error) {
      handleApiError(error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBulkDeleteContacts = async () => {
    try {
      await bulkDeleteContacts(selectedContacts);
      message.success(`${selectedContacts.length} contact(s) deleted!`);
      setSelectedContacts([]);
      fetchContacts(selectedGroupId, page, pageSize, searchTerm);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

  const handleExportContacts = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const params = {};
      if (selectedGroupId) params.group_id = selectedGroupId;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const response = await exportContacts(params);
      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: `contacts${selectedGroupId ? `_group${selectedGroupId}` : ""}_${new Date().toISOString().slice(0, 10)}.csv`,
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success("Contacts exported");
    } catch (error) {
      handleApiError(error);
      exportContactsToCSV(contacts);
    } finally {
      setIsExporting(false);
    }
  };

  const handleAssignTags = async (tags) => {
    try {
      const payload = {
        contact_ids: selectedContacts,
        tags: tags,
        username: user,
      };
      await assignTagContacts(payload);
      message.success("Tags assigned successfully!");
      setSelectedContacts([]);
      handleCloseAssignTagModal();
      fetchContacts(selectedGroupId, page, pageSize, searchTerm);
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleGroupChange = (groupName) => {
    setSelectedGroup(groupName);
    const selectedGroupObj = groups.find((group) => group.name === groupName);
    const groupId = selectedGroupObj?.id || "";
    setSelectedGroupId(groupId);

    if (groupId) {
      setSelectedContacts([]);
      setPage(1);
      setSearchTerm("");
      navigate(
        `/dashboard/voice/contacts/${groupId}/${encodeURIComponent(groupName)}`,
      );
      fetchContacts(groupId, 1, pageSize, "");
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setPage(1);
    fetchContacts(selectedGroupId, 1, pageSize, value);
  };

  const handleTableChange = (pg, ps) => {
    setPage(pg);
    setPageSize(ps);
    fetchContacts(selectedGroupId, pg, ps, searchTerm);
  };

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);
  const handleOpenContactModal = (contact) => {
    setSelectedContact(contact);
    setIsContactModalOpen(true);
  };
  const handleCloseContactModal = () => {
    setSelectedContact(null);
    setIsContactModalOpen(false);
  };
  const handleOpenAssignTagModal = () => setIsAssignTagModalOpen(true);
  const handleCloseAssignTagModal = () => setIsAssignTagModalOpen(false);
  const openChooseChannelModal = () => navigate("/dashboard/voice/broadcast");

  const processedContacts = contacts.map((contact) => ({
    ...contact,
    key: contact.id,
    contact_name: contact.contact_name || "N/A",
    company_name: contact.company_name || "N/A",
    contact_mobile_number: contact.contact_mobile_number || "N/A",
    Contact_email_address: contact.Contact_email_address || "N/A",
    birthDate: contact.birth_date || "N/A",
    tags: Array.isArray(contact.tags) ? contact.tags : [],
    source: contact.source || "N/A",
    agent: contact.agent || "N/A",
    address: contact.address || "N/A",
  }));

  const rowSelection = {
    selectedRowKeys: selectedContacts,
    onChange: (selectedRowKeys) => {
      setSelectedContacts(selectedRowKeys);
    },
  };

  const selectedContactMobileNumbers = contacts
    .filter((contact) => selectedContacts.includes(contact.id))
    .map((contact) => contact.contact_mobile_number);

  const columns = [
    {
      title: (
        <div className="flex items-center gap-1.5">
          <ApartmentOutlined className="text-xs opacity-80" />
          <span>Company</span>
        </div>
      ),
      dataIndex: "company_name",
      key: "company_name",
      width: 150,
      sorter: true,
      render: (text) => (
        <span className="font-medium text-gray-800">{text}</span>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <PhoneOutlined className="text-xs opacity-80" />
          <span>Mobile</span>
        </div>
      ),
      dataIndex: "contact_mobile_number",
      key: "contact_mobile_number",
      width: 140,
      sorter: true,
      render: (text) => (
        <span
          className="font-mono text-sm"
          style={{ color: THEME.primaryDark }}
        >
          {text}
        </span>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <UserOutlined className="text-xs opacity-80" />
          <span>Contact Person</span>
        </div>
      ),
      dataIndex: "contact_name",
      key: "contact_name",
      width: 150,
      sorter: true,
      render: (text) => (
        <span className="font-medium text-gray-700">{text}</span>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <MailOutlined className="text-xs opacity-80" />
          <span>Email</span>
        </div>
      ),
      dataIndex: "Contact_email_address",
      key: "Contact_email_address",
      width: 180,
      sorter: true,
      render: (text) => <span className="text-sm text-gray-600">{text}</span>,
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <CalendarOutlined className="text-xs opacity-80" />
          <span>Birth Date</span>
        </div>
      ),
      dataIndex: "birthDate",
      key: "birthDate",
      width: 120,
      sorter: true,
      render: (text) => <span className="text-sm text-gray-500">{text}</span>,
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <TagOutlined className="text-xs opacity-80" />
          <span>Tags</span>
        </div>
      ),
      dataIndex: "tags",
      key: "tags",
      width: 200,
      render: (tags) => (
        <div className="flex flex-wrap gap-1">
          {Array.isArray(tags) && tags.length > 0 ? (
            tags.map((tag, index) => (
              <Tag
                key={index}
                style={{
                  background: THEME.gradientLight,
                  border: `1px solid #2563EB30`,
                  color: THEME.primaryDark,
                  fontWeight: 500,
                  fontSize: 11,
                  borderRadius: 12,
                }}
              >
                {tag}
              </Tag>
            ))
          ) : (
            <span className="text-gray-400 text-xs">No tags</span>
          )}
        </div>
      ),
    },
    {
      title: "Source",
      dataIndex: "source",
      key: "source",
      width: 100,
      sorter: true,
      render: (text) => <span className="text-sm text-gray-500">{text}</span>,
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <CustomerServiceOutlined className="text-xs opacity-80" />
          <span>Agent</span>
        </div>
      ),
      dataIndex: "agent",
      key: "agent",
      width: 100,
      sorter: true,
      render: (text) => <span className="text-sm text-gray-600">{text}</span>,
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <EnvironmentOutlined className="text-xs opacity-80" />
          <span>Address</span>
        </div>
      ),
      dataIndex: "address",
      key: "address",
      width: 180,
      sorter: true,
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span className="text-sm text-gray-500">{text}</span>
        </Tooltip>
      ),
    },
  ];

  useEffect(() => {
    fetchGroups();
    if (initialGroupId) {
      setSelectedGroupId(initialGroupId);
      setSelectedGroup(initialGroupName);
      fetchContacts(initialGroupId, 1, pageSize, "");
    }
  }, [initialGroupId, initialGroupName]);

  return (
    <div className="min-h-screen p-4" style={{ background: "#F8F9FB" }}>
      {/* ── HEADER CARD — sticky ── */}
      <div
        className="sticky top-0 z-40 px-4 pt-4 pb-3"
        style={{ background: "#F8F9FB" }}
      >
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div
            className="rounded-2xl border border-gray-100 px-6 py-5 flex items-center justify-between gap-4 flex-wrap"
            style={{
              background: "linear-gradient(135deg, #f5f6ff 0%, #eef0ff 100%)",
              boxShadow: "0 1px 8px rgba(37,99,235,0.06)",
            }}
          >
            {/* Left: back + icon + labels */}
            <div className="flex items-center gap-4">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => {
                  const basePath = location.pathname.includes("/utility/")
                    ? "/dashboard/utility/contacts"
                    : "/dashboard/voice/contacts";
                  navigate(basePath);
                }}
                className="h-9 w-9 rounded-lg border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 flex items-center justify-center"
              />
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: THEME.gradient,
                  boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
                }}
              >
                <TeamOutlined style={{ color: "#fff", fontSize: 22 }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                  {selectedGroup || "Contacts"}
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  {contacts.length > 0
                    ? `${contacts.length} contact${contacts.length !== 1 ? "s" : ""} in this group`
                    : "Manage contacts in this group"}
                </p>
              </div>
            </div>

            {/* Right: refresh */}
            <div className="flex items-center gap-2">
              <Tooltip title="Refresh">
                <Button
                  icon={<ReloadOutlined spin={loading} />}
                  onClick={() => fetchContacts(selectedGroupId)}
                  className="h-9 rounded-lg border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-300"
                />
              </Tooltip>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-4 pb-4">
        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl border border-gray-100 px-5 py-3.5 mb-4 flex flex-wrap items-center gap-3"
          style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
        >
          {/* Search */}
          <Input
            placeholder="Search contacts..."
            prefix={<SearchOutlined style={{ color: THEME.primary }} />}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            style={{ width: 220, borderRadius: 10, borderColor: `#2563EB40` }}
            className="h-9 contact-search"
          />

          {/* Group selector */}
          {loading ? (
            <Spin size="small" />
          ) : (
            <Select
              placeholder="Select Group"
              value={selectedGroup || undefined}
              onChange={handleGroupChange}
              style={{ width: 160, borderRadius: 10 }}
              allowClear
            >
              {groups.map((group) => (
                <Option key={group.id} value={group.name}>
                  {group.name}
                </Option>
              ))}
            </Select>
          )}

          {/* Contact count */}
          <span className="text-xs text-gray-400 font-medium">
            {total} contact
            {total !== 1 ? "s" : ""}
            {selectedContacts.length > 0 && (
              <span
                className="ml-1.5 font-semibold"
                style={{ color: THEME.primary }}
              >
                · {selectedContacts.length} selected
              </span>
            )}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Selection actions — only active when rows are checked */}
          <Tooltip
            title={selectedContacts.length === 0 ? "Select contacts first" : ""}
          >
            <Button
              icon={<MessageOutlined />}
              disabled={selectedContacts.length === 0}
              onClick={openChooseChannelModal}
              className="h-9 rounded-lg text-sm font-medium"
              style={
                selectedContacts.length > 0
                  ? {
                      background: THEME.gradient,
                      color: "#fff",
                      border: "none",
                      boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
                    }
                  : {}
              }
            >
              Send
              {selectedContacts.length > 0
                ? ` (${selectedContacts.length})`
                : ""}
            </Button>
          </Tooltip>

          <Tooltip
            title={selectedContacts.length === 0 ? "Select contacts first" : ""}
          >
            <Button
              icon={<TagOutlined />}
              disabled={selectedContacts.length === 0}
              onClick={handleOpenAssignTagModal}
              className="h-9 rounded-lg text-sm"
            >
              Assign Tag
            </Button>
          </Tooltip>

          <Tooltip
            title={selectedContacts.length === 0 ? "Select contacts first" : ""}
          >
            <Button
              icon={<DeleteOutlined />}
              disabled={selectedContacts.length === 0}
              onClick={() => setIsDeleteModalOpen(true)}
              danger
              className="h-9 rounded-lg text-sm"
            >
              Delete
            </Button>
          </Tooltip>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200" />

          {/* Import / Export */}
          <Button
            icon={<DownloadOutlined />}
            onClick={downloadSampleCSV}
            className="h-9 rounded-lg text-sm border-gray-200 text-gray-500"
          >
            Sample CSV
          </Button>

          <Button
            icon={<ImportOutlined />}
            onClick={handleOpenModal}
            className="h-9 rounded-lg text-sm"
            style={{ borderColor: THEME.primary, color: THEME.primaryDark }}
          >
            Import
          </Button>

          <Button
            icon={<ExportOutlined />}
            onClick={handleExportContacts}
            loading={isExporting}
            disabled={isExporting}
            className="h-9 rounded-lg text-sm font-medium"
            style={{
              background: THEME.gradient,
              color: "#fff",
              border: "none",
              boxShadow: "0 2px 8px rgba(37,99,235,0.2)",
            }}
          >
            {isExporting ? "Exporting…" : "Export"}
          </Button>
        </motion.div>

        {/* Table Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Spin size="large" />
              <p className="mt-4 text-sm text-gray-500">Loading contacts...</p>
            </div>
          ) : processedContacts.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div className="text-gray-500">
                  <p className="text-base font-medium">No contacts found</p>
                  <p className="mt-1 text-sm">
                    {searchTerm
                      ? "Try adjusting your search"
                      : selectedGroup
                        ? "This group has no contacts yet"
                        : "Select a group to view contacts"}
                  </p>
                </div>
              }
              className="py-16"
            >
              {!selectedGroup && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleOpenModal}
                  className="flex items-center gap-2 mx-auto px-5 py-2 rounded-xl font-medium text-white transition-all"
                  style={{
                    background: THEME.gradient,
                    boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
                  }}
                >
                  <ImportOutlined style={{ fontSize: 14 }} />
                  Import Contacts
                </motion.button>
              )}
            </Empty>
          ) : (
            <Table
              columns={columns}
              dataSource={processedContacts}
              loading={loading}
              rowSelection={rowSelection}
              pagination={{
                current: page,
                pageSize: pageSize,
                total: total,
                onChange: handleTableChange,
                onShowSizeChange: handleTableChange,
                showSizeChanger: true,
                pageSizeOptions: ["10", "25", "50", "100"],
                showTotal: (tot, range) => (
                  <span className="text-xs text-gray-500">
                    {range[0]}-{range[1]} of {tot} contacts
                  </span>
                ),
              }}
              className="contact-table"
              scroll={{ x: 1200 }}
              size="middle"
              onRow={(record) => ({
                onClick: () => handleOpenContactModal(record),
                style: { cursor: "pointer" },
              })}
            />
          )}
        </motion.div>

        {/* Modals */}
        <Modal isModalOpen={isModalOpen} closeModal={handleCloseModal}>
          <ImportContacts
            user={user}
            closeContactModal={handleCloseModal}
            refreshGroups={fetchGroups}
            reFetchContacts={fetchContacts}
            selectedGroupId={selectedGroupId}
            selectedGroupName={selectedGroup}
          />
        </Modal>

        <Modal
          isModalOpen={isContactModalOpen}
          closeModal={handleCloseContactModal}
          width="60%"
          className="rounded"
        >
          {selectedContact && (
            <ContactDetailsModal
              contact={selectedContact}
              closeModal={handleCloseContactModal}
              refreshContacts={() => fetchContacts(selectedGroupId)}
            />
          )}
        </Modal>

        <Modal
          isModalOpen={isDeleteModalOpen}
          closeModal={() => setIsDeleteModalOpen(false)}
          width="40%"
          height=""
        >
          <DeleteConfirmation
            itemType="contact"
            onConfirm={handleBulkDeleteContacts}
            onCancel={() => setIsDeleteModalOpen(false)}
          />
        </Modal>

        <Modal
          isModalOpen={isAssignTagModalOpen}
          closeModal={handleCloseAssignTagModal}
        >
          <AssignTag onSubmitTags={handleAssignTags} />
        </Modal>

        {/* Custom Styling */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          /* Table Container */
          .contact-table {
            border-radius: 12px;
            overflow: hidden;
          }

          /* Header Styling */
          .contact-table .ant-table-thead > tr > th {
            background: #f8fafc !important;
            color: #374151;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid rgba(37,99,235,0.2) !important;
            padding: 14px 16px;
          }

          .contact-table .ant-table-thead > tr > th::before {
            display: none !important;
          }

          /* Row Styling */
          .contact-table .ant-table-tbody > tr > td {
            padding: 14px 16px;
            border-bottom: 1px solid #f1f5f9;
            transition: all 0.2s ease;
          }

          .contact-table .ant-table-tbody > tr:hover > td {
            background: rgba(37,99,235,0.04) !important;
          }

          .contact-table .ant-table-tbody > tr:last-child > td {
            border-bottom: none;
          }

          /* Selection Checkbox */
          .contact-table .ant-checkbox-checked .ant-checkbox-inner {
            background-color: #2563EB;
            border-color: #2563EB;
          }

          .contact-table
            .ant-checkbox-indeterminate
            .ant-checkbox-inner::after {
            background-color: #2563EB;
          }

          .contact-table .ant-checkbox-wrapper:hover .ant-checkbox-inner,
          .contact-table .ant-checkbox:hover .ant-checkbox-inner {
            border-color: #2563EB;
          }

          /* Pagination Styling */
          .contact-table .ant-pagination-item {
            border-radius: 8px !important;
            border-color: #e5e7eb !important;
          }

          .contact-table .ant-pagination-item-active {
            background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%) !important;
            border-color: #2563EB !important;
          }

          .contact-table .ant-pagination-item-active a {
            color: white !important;
          }

          .contact-table .ant-pagination-item:hover {
            border-color: #2563EB !important;
          }

          .contact-table .ant-pagination-item:hover a {
            color: #2563EB !important;
          }

          .contact-table .ant-pagination-prev .ant-pagination-item-link,
          .contact-table .ant-pagination-next .ant-pagination-item-link {
            border-radius: 8px !important;
          }

          .contact-table .ant-pagination-prev:hover .ant-pagination-item-link,
          .contact-table .ant-pagination-next:hover .ant-pagination-item-link {
            color: #2563EB !important;
            border-color: #2563EB !important;
          }

          /* Select Styling */
          .ant-select-selector {
            border-radius: 10px !important;
          }

          .ant-select:hover .ant-select-selector {
            border-color: #2563EB !important;
          }

          .ant-select-focused .ant-select-selector {
            border-color: #2563EB !important;
            box-shadow: 0 0 0 2px rgba(37,99,235,0.1) !important;
          }

          /* Search Input */
          .contact-search:hover,
          .contact-search:focus {
            border-color: #2563EB !important;
          }

          .contact-search:focus {
            box-shadow: 0 0 0 2px rgba(37,99,235,0.1) !important;
          }

          /* Tag Styling */
          .contact-table .ant-tag {
            border-radius: 12px;
            padding: 2px 10px;
          }

          /* Row Selection Background */
          .contact-table .ant-table-tbody > tr.ant-table-row-selected > td {
            background: rgba(37,99,235,0.08) !important;
          }

          .contact-table
            .ant-table-tbody
            > tr.ant-table-row-selected:hover
            > td {
            background: rgba(37,99,235,0.12) !important;
          }

          /* Page Size Select */
          .contact-table .ant-select-selector {
            border-radius: 8px !important;
          }
        `,
          }}
        />
      </div>
    </div>
  );
};

export default ContactTable;
