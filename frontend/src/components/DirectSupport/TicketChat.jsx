import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  Input,
  Button,
  List,
  Typography,
  Skeleton,
  Tooltip,
} from "antd";
import {
  CloseOutlined,
  SendOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import chatBg from "../../../public/assets/images/png/whatsapp-chat_BG.png";
import { replyToTicket } from "../../services/api";
import handleApiError from "../../utils/errorHandler";

const { TextArea } = Input;
const { Text } = Typography;

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

const shouldShowDate = (messages, index) => {
  if (index === 0) return true;

  const currentDate = new Date(messages[index].created_at).toDateString();
  const prevDate = new Date(messages[index - 1].created_at).toDateString();

  return currentDate !== prevDate;
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
  const [loading, setLoading] = useState(false);
  const messageEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Send message using new API
  const sendMessage = async (file) => {
    const payload = {
      body: newMessage,
    };
    
    if (file) {
      payload.media = file;
    }

    try {
      await replyToTicket(ticketId, payload);
      if (fetchTickets) fetchTickets();
    } catch (error) {
      handleApiError(error);
    }
  };

  //set message data
  useEffect(() => {
    setLoading(true);
    if (Array.isArray(message)) {
      setMessages((prev) => [...message]);
      setLoading(false);
    } else {
      setMessages([]);
      setLoading(false);
    }
  }, [message]);

  const handleSendMessage = () => {
    sendMessage();
    if (!newMessage.trim()) return;

    const newMessageObject = {
      message: newMessage, // For local display if your logic relies on 'message' key
      body: newMessage, // Original logic seemed to mix body/message
      created_at: new Date(),
      message_by: "user",
      left: true,
      username: user.username, // Add username for immediate display
    };

    setMessages((prevMessages) => [...prevMessages, newMessageObject]);
    setNewMessage("");
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    sendMessage(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const newMessageObject = {
          created_at: new Date(),
          message_by: "user",
          media: reader.result,
          left: true,
          username: user.username,
        };
        setMessages((prev) => [...prev, newMessageObject]);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      title={
        <div className="flex justify-between items-center pr-6">
          <span>Customer Support</span>
        </div>
      }
      styles={{ body: { padding: 0 } }}
      centered
    >
      <div className="flex flex-col h-[500px]">
        {/* Chat Area */}
        <div
          className="flex-1 overflow-y-auto p-4"
          style={{
            backgroundImage: `url(${chatBg})`,
            backgroundRepeat: "repeat",
            backgroundSize: "contain",
            backgroundColor: "#ede9e2",
          }}
        >
          {loading || (messages.length === 0 && loading) ? (
            // Loading Skeletons
            <div className="flex flex-col gap-4">
              <div className="flex justify-start">
                <Skeleton.Input
                  active
                  size="large"
                  style={{ width: 200, height: 60 }}
                />
              </div>
              <div className="flex justify-end">
                <Skeleton.Input
                  active
                  size="large"
                  style={{ width: 200, height: 60 }}
                />
              </div>
            </div>
          ) : (
            // Messages List
            <div className="flex flex-col">
              {messages.map((msg, index) => (
                <React.Fragment key={index}>
                  {shouldShowDate(messages, index) && (
                    <div className="flex justify-center my-4">
                      <div className="px-3 py-1 rounded-lg text-xs text-gray-600 bg-[#ecebe9] shadow-sm">
                        {getMessageDateDisplay(msg.created_at)}
                      </div>
                    </div>
                  )}

                  <div
                    className={`flex mb-4 px-2 ${
                      msg?.message_by === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`relative p-3 rounded-lg max-w-[70%] shadow-sm text-sm ${
                        msg?.message_by === "user"
                          ? "bg-[#dcf8c6] text-black rounded-tr-none"
                          : "bg-white text-black rounded-tl-none"
                      }`}
                    >
                      {/* Triangle Pointer */}
                      <div
                        className={`absolute top-0 w-0 h-0 border-[8px] border-transparent ${
                          msg?.message_by === "user"
                            ? "border-t-[#dcf8c6] -right-2 left-auto border-r-0"
                            : "border-t-white -left-2 right-auto border-l-0"
                        }`}
                      ></div>

                      {/* Message Content */}
                      <div className="mb-1">
                        {msg?.message_by === "user" && (
                          <div className="text-xs font-semibold mb-1 text-gray-700">
                            {msg.username && (
                              <span>Client: {msg.username}</span>
                            )}
                            {msg.category && (
                              <span className="block">
                                Category: {msg.category}
                              </span>
                            )}
                            {msg.sub_category && (
                              <span className="block">
                                Sub Category: {msg.sub_category}
                              </span>
                            )}
                            {msg.subject && (
                              <span className="block">
                                Subject: {msg.subject}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="whitespace-pre-wrap break-words">
                          {msg?.category != null
                            ? `Message : ${msg?.body || ""}`
                            : msg?.body || msg?.message || ""}
                        </div>

                        {msg?.media && (
                          <img
                            src={msg.media}
                            alt="Attachment"
                            className="mt-2 rounded-md max-w-full h-auto max-h-64 object-cover"
                          />
                        )}
                      </div>

                      {/* Time and User Label */}
                      <div className="flex justify-between items-end gap-4 mt-1">
                        <span className="text-[10px] text-gray-500 font-medium">
                          {msg?.message_by === "user"
                            ? msg.username || "You"
                            : msg.reseller === "adminindew"
                              ? "System"
                              : msg.reseller || "Reseller"}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {msg?.created_at
                            ? new Date(msg.created_at).toLocaleString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })
                            : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              ))}
              <div ref={messageEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 bg-[#f0f2f5] border-t border-gray-200">
          <div className="flex items-end gap-2 bg-white rounded-2xl p-2 shadow-sm">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*"
            />
            <Tooltip title="Attach File">
              <Button
                type="text"
                shape="circle"
                icon={<PaperClipOutlined className="text-gray-500 text-lg" />}
                onClick={() => fileInputRef.current.click()}
                className="mb-1"
              />
            </Tooltip>

            <TextArea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (newMessage.trim()) handleSendMessage();
                }
              }}
              placeholder="Type your message..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              bordered={false}
              className="flex-1 py-2 px-0 resize-none !shadow-none focus:!shadow-none"
            />

            <Button
              type="text"
              shape="circle"
              icon={<SendOutlined className="text-green-500 text-lg" />}
              onClick={() => {
                if (newMessage.trim()) handleSendMessage();
              }}
              disabled={!newMessage.trim()}
              className="mb-1"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TicketChat;
