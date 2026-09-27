import { useState } from "react";
import {
  Form,
  Input,
  Typography,
  Row,
  Col,
  Button,
  DatePicker,
  Space,
  message,
} from "antd";
import { SaveOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import DeleteConfirmation from "../DeleteConfirmation/DeleteModal";
import TagManagement from "./TagManagement";

import handleApiError from "../../utils/errorHandler";
import { handleContactOperations } from "../../services/api";
import Modal from "../Modal";

const { Title } = Typography;
const { TextArea } = Input;

const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight: "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

const ContactDetailsModal = ({ contact, closeModal, refreshContacts }) => {
  const [form] = Form.useForm();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // State to hold the edited contact fields
  const [editedContact, setEditedContact] = useState({
    ...contact,
    company_name: contact.company_name !== "N/A" ? contact.company_name : "",
    contact_mobile_number:
      contact.contact_mobile_number !== "N/A"
        ? contact.contact_mobile_number
        : "",
    contact_name: contact.contact_name !== "N/A" ? contact.contact_name : "",
    Contact_email_address:
      contact.Contact_email_address !== "N/A"
        ? contact.Contact_email_address
        : "",
    birthDate: contact.birthDate !== "N/A" ? contact.birthDate : "",
    tags: Array.isArray(contact.tags) ? contact.tags : [],
    source: contact.source !== "N/A" ? contact.source : "",
    agent: contact.agent !== "N/A" ? contact.agent : "",
    address: contact.address !== "N/A" ? contact.address : "",
  });

  // Update contact details locally
  const handleChange = (field, value) => {
    setEditedContact({
      ...editedContact,
      [field]: value,
    });
  };

  // Update contact API
  const handleUpdateContact = async (values) => {
    setLoading(true);
    try {
      const tagsPayload = editedContact.tagChanges || [];

      // Convert date to string format if it exists
      const updateData = {
        ...values,
        birthDate: values.birthDate
          ? dayjs(values.birthDate).format("YYYY-MM-DD")
          : "",
        tags: JSON.stringify(tagsPayload),
      };

      await handleContactOperations({
        action: "update",
        contact_id: editedContact.id,
        ...updateData,
      });

      message.success("Contact updated successfully");
      refreshContacts();
      closeModal();
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // Trigger delete confirmation modal
  const handleOpenDeleteConfirmation = () => {
    setIsDeleteModalOpen(true);
  };

  // Delete contact API
  const handleDeleteContact = async () => {
    setDeleteLoading(true);
    try {
      await handleContactOperations({
        action: "delete",
        contact_id: contact.id,
      });
      message.success("Contact deleted successfully");
      refreshContacts();
      closeModal();
    } catch (error) {
      handleApiError(error);
    } finally {
      setDeleteLoading(false);
      setIsDeleteModalOpen(false);
    }
  };

  // Set initial form values
  const initialValues = {
    company_name: editedContact.company_name,
    contact_mobile_number: editedContact.contact_mobile_number,
    contact_name: editedContact.contact_name,
    Contact_email_address: editedContact.Contact_email_address,
    birthDate: editedContact.birthDate ? dayjs(editedContact.birthDate) : null,
    source: editedContact.source,
    agent: editedContact.agent,
    address: editedContact.address,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-6 py-4 -mx-6 -mt-6 mb-5"
        style={{
          background: THEME.gradientLight,
          borderBottom: "1px solid rgba(37,99,235,0.1)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: THEME.gradient, boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}
          >
            <EditOutlined style={{ fontSize: 18, color: "white" }} />
          </div>
          <Title level={4} className="!mb-0" style={{ color: "#1f2937" }}>
            Edit Contact Details
          </Title>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateContact}
          initialValues={initialValues}
          className="space-y-4"
        >
          <Row gutter={16}>
            {/* Company Name */}
            <Col xs={24} sm={12}>
              <Form.Item label="Company Name" name="company_name">
                <Input
                  placeholder="Enter company name"
                  onChange={(e) => handleChange("company_name", e.target.value)}
                />
              </Form.Item>
            </Col>

            {/* Mobile Number */}
            <Col xs={24} sm={12}>
              <Form.Item
                label="Mobile Number"
                name="contact_mobile_number"
                rules={[
                  {
                    pattern: /^[0-9]{10}$/,
                    message: "Please enter a valid 10-digit mobile number",
                  },
                ]}
              >
                <Input
                  placeholder="Enter mobile number"
                  onChange={(e) =>
                    handleChange("contact_mobile_number", e.target.value)
                  }
                />
              </Form.Item>
            </Col>

            {/* Contact Person */}
            <Col xs={24} sm={12}>
              <Form.Item label="Contact Person" name="contact_name">
                <Input
                  placeholder="Enter contact person name"
                  onChange={(e) => handleChange("contact_name", e.target.value)}
                />
              </Form.Item>
            </Col>

            {/* Email */}
            <Col xs={24} sm={12}>
              <Form.Item
                label="Email Address"
                name="Contact_email_address"
                rules={[
                  {
                    type: "email",
                    message: "Please enter a valid email address",
                  },
                ]}
              >
                <Input
                  placeholder="Enter email address"
                  onChange={(e) =>
                    handleChange("Contact_email_address", e.target.value)
                  }
                />
              </Form.Item>
            </Col>

            {/* Birth Date */}
            <Col xs={24} sm={12}>
              <Form.Item label="Birth Date" name="birthDate">
                <DatePicker
                  placeholder="Select birth date"
                  className="w-full"
                  format="YYYY-MM-DD"
                  onChange={(date) =>
                    handleChange(
                      "birthDate",
                      date ? date.format("YYYY-MM-DD") : "",
                    )
                  }
                />
              </Form.Item>
            </Col>

            {/* Source */}
            <Col xs={24} sm={12}>
              <Form.Item label="Source" name="source">
                <Input
                  placeholder="Enter source"
                  onChange={(e) => handleChange("source", e.target.value)}
                />
              </Form.Item>
            </Col>

            {/* Agent */}
            <Col xs={24}>
              <Form.Item label="Agent" name="agent">
                <Input
                  placeholder="Enter agent name"
                  onChange={(e) => handleChange("agent", e.target.value)}
                />
              </Form.Item>
            </Col>

            {/* Tags Management */}
            <Col xs={24} sm={12}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <TagManagement
                  initialTags={editedContact.tags}
                  onTagsChange={({ tags, changes }) => {
                    setEditedContact((prev) => ({
                      ...prev,
                      tags,
                      tagChanges: changes,
                    }));
                  }}
                />
              </div>
            </Col>

            {/* Address */}
            <Col xs={24} sm={12}>
              <Form.Item label="Address" name="address">
                <TextArea
                  rows={7}
                  placeholder="Enter address"
                  onChange={(e) => handleChange("address", e.target.value)}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-gray-200">
            <Row justify="space-between" align="middle">
              <Col>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleOpenDeleteConfirmation}
                  loading={deleteLoading}
                >
                  Delete Contact
                </Button>
              </Col>

              <Col>
                <Space>
                  <Button onClick={closeModal}>Cancel</Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={loading}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    Update Contact
                  </Button>
                </Space>
              </Col>
            </Row>
          </div>
        </Form>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isModalOpen={isDeleteModalOpen}
        closeModal={() => setIsDeleteModalOpen(false)}
        width="400px"
        height="200px"
      >
        <DeleteConfirmation
          itemType="contact"
          onConfirm={handleDeleteContact}
          onCancel={() => setIsDeleteModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default ContactDetailsModal;
