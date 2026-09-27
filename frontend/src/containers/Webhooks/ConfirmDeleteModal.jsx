import { Modal, Button, Typography } from "antd";
import { ExclamationCircleOutlined, DeleteOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;

const THEME = {
  gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
  gradientLight: "linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(220,38,38,0.05) 100%)",
};

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm }) => {
  return (
    <Modal
      title={null}
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={420}
      centered
      maskClosable={false}
      destroyOnClose
      className="delete-modal"
    >
      {/* Custom Header */}
      <div
        className="px-6 py-5 -mx-6 -mt-6 mb-6"
        style={{
          background: THEME.gradientLight,
          borderBottom: "1px solid rgba(239,68,68,0.1)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{
              background: THEME.gradient,
              boxShadow: "0 4px 12px rgba(239,68,68,0.3)",
            }}
          >
            <DeleteOutlined style={{ fontSize: 20, color: "white" }} />
          </div>
          <div>
            <Title level={4} className="m-0" style={{ color: "#1f2937" }}>
              Delete Webhook
            </Title>
            <Text className="text-xs text-gray-500">
              This action cannot be undone
            </Text>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-start gap-3 p-4 rounded-lg" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)" }}>
          <ExclamationCircleOutlined
            style={{ color: "#ef4444", fontSize: 20, marginTop: 2 }}
          />
          <div>
            <Text style={{ fontSize: 15, fontWeight: 500, color: "#374151", display: "block" }}>
              Are you sure you want to delete this webhook?
            </Text>
            <Text type="secondary" style={{ fontSize: 13, display: "block", marginTop: 4 }}>
              This will permanently remove the webhook configuration. This action cannot be reversed.
            </Text>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button onClick={onClose} size="large" className="h-9 rounded-lg">
          Cancel
        </Button>
        <Button
          type="primary"
          danger
          onClick={onConfirm}
          icon={<DeleteOutlined />}
          size="large"
          className="h-9 rounded-lg font-semibold"
          style={{
            background: THEME.gradient,
            border: "none",
            boxShadow: "0 4px 12px rgba(239,68,68,0.3)",
          }}
        >
          Delete
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmDeleteModal;
