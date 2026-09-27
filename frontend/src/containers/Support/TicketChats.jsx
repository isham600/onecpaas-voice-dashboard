import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  Input,
  Button,
  Select,
  Upload,
  Skeleton,
  Typography,
  message as antMessage,
} from "antd";
import {
  CloseOutlined,
  SendOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";

import { replyToTicket } from "../../services/api";
import chatBg from "../../../public/assets/images/png/whatsapp-chat_BG.png";

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Theme colors - matching BroadcastHistory
const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

const TicketChat = ({
  open,
  onClose,
  ticketId,
  message,
  user,
  fetchTickets,
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [status, setStatus] = useState(1);
  const [loading, setLoading] = useState(false);
  const messageEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Status update is handled by the API, we'll keep the UI but won't call an update endpoint
  // The status is managed server-side

  // Send message
  const sendMessage = async (file) => {
    const payload = {
      body: newMessage,
    };
    
    if (file) {
      payload.media = file;
    }

    try {
      // Extract ticket ID from ticketId object (it has ticket_id property)
      const ticketIdValue = ticketId?.ticket_id || ticketId?.id;
      await replyToTicket(ticketIdValue, payload);
      fetchTickets();
    } catch (error) {
      antMessage.error(error?.response?.data?.message || "Error sending message");
    }
  };

  // Set message data
  useEffect(() => {
    setLoading(true);
    if (Array.isArray(message)) {
      setMessages([...message]);
      setLoading(false);
    } else {
      setMessages([]);
      setLoading(false);
    }
  }, [message]);

  // Handle send message
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    sendMessage();

    const newMessageObject = {
      message: newMessage,
      created_at: new Date(),
      message_by: "reseller",
      left: true,
    };

    setMessages((prevMessages) => [...prevMessages, newMessageObject]);
    setNewMessage("");
  };

  // Handle file upload
  const handleFileUpload = (file) => {
    sendMessage(file);

    const reader = new FileReader();
    reader.onload = () => {
      const newMessageObject = {
        message: "Sent an attachment",
        created_at: new Date(),
        message_by: "reseller",
        media: reader.result,
        left: true,
      };
      setMessages((prev) => [...prev, newMessageObject]);
    };
    reader.readAsDataURL(file);

    return false; // Prevent auto upload
  };

  // Auto scroll to bottom
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Format date display
  const getMessageDateDisplay = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return "Today";
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return messageDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  // Check if date should be shown
  const shouldShowDate = (messages, index) => {
    if (index === 0) return true;
    const currentDate = new Date(messages[index].created_at).toDateString();
    const prevDate = new Date(messages[index - 1].created_at).toDateString();
    return currentDate !== prevDate;
  };

  // Get status color
  const getStatusColor = (statusValue) => {
    switch (statusValue) {
      case 0:
        return "#f59e0b"; // Pending
      case 1:
        return "#3b82f6"; // Open
      case 2:
        return "#ef4444"; // Closed
      case 3:
        return THEME.primary; // Solved
      default:
        return "#9ca3af";
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      className="ticket-chat-modal"
      closeIcon={
        <motion.div whileHover={{ scale: 1.1, rotate: 90 }}>
          <CloseOutlined style={{ fontSize: 18, color: "#6b7280" }} />
        </motion.div>
      }
    >
      {/* Header with Status */}
      <div
        className="flex items-center justify-between px-6 py-4 mb-4"
        style={{
          background: THEME.gradientLight,
          borderBottom: "1px solid rgba(37,99,235,0.2)",
          marginTop: -24,
          marginLeft: -24,
          marginRight: -24,
        }}
      >
        <div>
          <Text strong className="text-lg" style={{ color: "#1f2937" }}>
            Ticket #{ticketId?.ticket_id || "N/A"}
          </Text>
          <br />
          <Text className="text-xs text-gray-500">
            {ticketId?.username || "Client"}
          </Text>
        </div>

        <Select
          value={status}
          onChange={setStatus}
          size="large"
          className="w-32"
          getPopupContainer={(trigger) => trigger.parentNode}
          style={{
            borderColor: getStatusColor(status),
          }}
        >
          <Option value={0}>Pending</Option>
          <Option value={1}>Open</Option>
          <Option value={2}>Closed</Option>
          <Option value={3}>Solved</Option>
        </Select>
      </div>

      {/* Chat Messages */}
      <div
        className="overflow-y-auto rounded-lg p-4"
        style={{
          height: "500px",
          backgroundImage: `url(${chatBg})`,
          backgroundRepeat: "repeat",
          backgroundSize: "contain",
          backgroundColor: "#ede9e2",
        }}
      >
        <AnimatePresence>
          {message.length === 0
            ? [...Array(3)].map((_, index) => (
                <div
                  key={index}
                  className="flex mb-4"
                  style={{
                    justifyContent: index % 2 === 0 ? "flex-start" : "flex-end",
                  }}
                >
                  <Skeleton.Input
                    active
                    size="large"
                    style={{
                      width: 300,
                      height: 80,
                      borderRadius: 12,
                    }}
                  />
                </div>
              ))
            : messages?.map((msg, index) => (
                <React.Fragment key={index}>
                  {/* Date Separator */}
                  {shouldShowDate(messages, index) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-center my-4"
                    >
                      <div className="sticky top-0 px-3 py-1 rounded-lg text-sm text-gray-600 bg-[#E8E8E8] shadow-sm">
                        {getMessageDateDisplay(msg.created_at)}
                      </div>
                    </motion.div>
                  )}

                  {/* Message Bubble */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="flex mb-6"
                    style={{
                      justifyContent:
                        msg?.message_by === "reseller"
                          ? "flex-end"
                          : "flex-start",
                    }}
                  >
                    <div
                      className={`relative p-3 rounded-lg max-w-[66%] shadow-md ${
                        msg?.message_by === "reseller"
                          ? "bg-[#dcf8c6] text-black rounded-tl-lg rounded-bl-lg rounded-br-sm"
                          : "bg-white text-black rounded-tr-lg rounded-br-lg rounded-bl-sm"
                      }`}
                      style={{
                        wordBreak: "break-word",
                      }}
                    >
                      {/* Message Content */}
                      {msg?.reseller !== "reseller" && (
                        <div className="mb-2 pb-2 border-b border-gray-200">
                          {msg?.username && (
                            <Text
                              strong
                              className="text-blue-600 block text-sm"
                            >
                              Client: {msg.username}
                            </Text>
                          )}
                          {msg?.category && (
                            <Text className="text-xs text-gray-600 block">
                              Category: {msg.category}
                            </Text>
                          )}
                          {msg?.sub_category && (
                            <Text className="text-xs text-gray-600 block">
                              Sub Category: {msg.sub_category}
                            </Text>
                          )}
                          {msg?.subject && (
                            <Text className="text-xs text-gray-600 block">
                              Subject: {msg.subject}
                            </Text>
                          )}
                          {msg?.subject_sub_category && (
                            <Text className="text-xs text-gray-600 block">
                              Subject Sub Category: {msg.subject_sub_category}
                            </Text>
                          )}
                        </div>
                      )}

                      <div className="whitespace-pre-wrap break-words">
                        {msg?.reseller === "reseller" ? (
                          <Text className="text-sm">
                            <strong>Message:</strong> {msg?.body}
                          </Text>
                        ) : (
                          <Text className="text-sm">
                            {msg?.body || msg?.message || ""}
                          </Text>
                        )}
                      </div>

                      {/* Media Attachment */}
                      {msg?.media && (
                        <img
                          src={msg.media}
                          alt="Attachment"
                          className="w-64 h-auto rounded-md mt-2 mb-2"
                        />
                      )}

                      {/* Message Footer */}
                      <div className="flex items-center justify-between mt-2 pt-2">
                        <Text className="text-xs text-gray-500">
                          {msg?.message_by === "reseller"
                            ? msg.reseller || "You"
                            : msg.username || "User"}
                        </Text>
                        <Text className="text-xs text-gray-400">
                          {msg?.created_at
                            ? new Date(msg.created_at).toLocaleString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })
                            : ""}
                        </Text>
                      </div>
                    </div>
                  </motion.div>
                </React.Fragment>
              ))}
          <div ref={messageEndRef} />
        </AnimatePresence>
      </div>

      {/* Message Input */}
      <div
        className="flex items-center gap-3 px-4 py-4 mt-4"
        style={{
          borderTop: "1px solid rgba(37,99,235,0.1)",
          background: THEME.gradientLight,
        }}
      >
        <div className="flex-1 bg-white rounded-lg shadow-sm">
          <TextArea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                if (newMessage.trim()) {
                  handleSendMessage();
                }
              }
            }}
            placeholder="Type your message..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            className="border-none"
            style={{
              resize: "none",
              padding: "8px 12px",
            }}
          />
        </div>

        <Upload
          beforeUpload={handleFileUpload}
          showUploadList={false}
          accept="image/*"
        >
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button
              icon={<PaperClipOutlined />}
              shape="circle"
              size="large"
              className="flex items-center justify-center"
              style={{
                borderColor: "rgba(37,99,235,0.3)",
              }}
            />
          </motion.div>
        </Upload>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            type="primary"
            icon={<SendOutlined />}
            shape="circle"
            size="large"
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="flex items-center justify-center"
            style={{
              background: newMessage.trim() ? THEME.gradient : undefined,
              border: "none",
            }}
          />
        </motion.div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        /* Modal Styling */
        .ticket-chat-modal .ant-modal-content {
          border-radius: 16px;
          overflow: hidden;
          padding: 0;
        }

        .ticket-chat-modal .ant-modal-body {
          padding: 0;
        }

        .ticket-chat-modal .ant-modal-close {
          top: 16px;
          right: 16px;
        }

        /* Select Styling */
        .ticket-chat-modal .ant-select-selector {
          border-radius: 8px !important;
        }

        .ticket-chat-modal .ant-select:hover .ant-select-selector {
          border-color: #2563EB !important;
        }

        .ticket-chat-modal .ant-select-focused .ant-select-selector {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(3, 207, 101, 0.1) !important;
        }

        /* TextArea Styling */
        .ticket-chat-modal .ant-input:focus,
        .ticket-chat-modal .ant-input-focused {
          border-color: transparent !important;
          box-shadow: none !important;
        }

        /* Upload Button */
        .ticket-chat-modal .ant-btn-circle {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Scrollbar Styling */
        .ticket-chat-modal .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }

        .ticket-chat-modal .overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }

        .ticket-chat-modal .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }

        .ticket-chat-modal .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }

        /* Message Bubble Tail */
        .ticket-chat-modal .bg-\\[\\#dcf8c6\\]:before {
          content: "";
          position: absolute;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 0 10px 10px 0;
          border-color: transparent #dcf8c6 transparent transparent;
          right: -8px;
          top: 0;
        }

        .ticket-chat-modal .bg-white:before {
          content: "";
          position: absolute;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 0 0 10px 10px;
          border-color: transparent transparent transparent white;
          left: -8px;
          top: 0;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .ticket-chat-modal .ant-modal {
            max-width: calc(100vw - 32px) !important;
            margin: 16px;
          }

          .ticket-chat-modal .overflow-y-auto {
            height: 400px !important;
          }
        }
      `}} />
    </Modal>
  );
};

export default TicketChat;
