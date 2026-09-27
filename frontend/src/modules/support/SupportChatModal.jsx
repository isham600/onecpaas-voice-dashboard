import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Input,
  Spin,
  Typography,
  Upload,
  message,
} from "antd";
import {
  PaperClipOutlined,
  SendOutlined,
  FileOutlined,
} from "@ant-design/icons";
import {
  getTicketChatAttachmentUrl,
  getTicketChatByTicketId,
  sendTicketChatMessage,
  uploadTicketChatAttachment,
} from "./supportApi";
import handleApiError from "../../utils/errorHandler";
import Modal from "../../components/Modal";

const { Text } = Typography;
const { TextArea } = Input;

const THEME = {
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
};

const formatDayLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const resolveChatPayloadType = (mode) =>
  mode === "admin" ? "user" : "CustomerSupport";

const isOwnMessageForViewer = (item, ticket, mode) => {
  const clientMessage = isClientMessage(item, ticket);
  return mode === "admin" ? !clientMessage : clientMessage;
};

const isClientMessage = (item, ticket) => {
  if (item?.type) {
    const normalizedType = String(item.type).toLowerCase();
    if (normalizedType === "customersupport") return true;
    if (normalizedType === "user") return false;
  }

  if (item?.message_by) {
    const by = String(item.message_by).toLowerCase();
    if (by === "client" || by === "user") return true;
    if (by === "support" || by === "admin" || by === "reseller") return false;
  }

  return (
    String(item?.username || "").toLowerCase() ===
    String(ticket?.username || "").toLowerCase()
  );
};

const resolveChatEndpoint = (file) => {
  if (file.type.startsWith("image/")) {
    return { endpoint: "upload-image", fieldName: "image" };
  }
  if (file.type.startsWith("audio/")) {
    return { endpoint: "upload-audio", fieldName: "audio" };
  }
  if (file.type.startsWith("video/")) {
    return { endpoint: "upload-video", fieldName: "video" };
  }
  return { endpoint: "upload-file", fieldName: "file" };
};

const resolveAttachmentHref = (messageItem) => {
  if (!messageItem?.attachment_path) return null;
  if (/^https?:\/\//i.test(messageItem.attachment_path)) {
    return messageItem.attachment_path;
  }
  return getTicketChatAttachmentUrl(
    messageItem.attachment_path,
    messageItem.ticket_id,
  );
};

const messageText = (item) => item?.message || item?.body || "";

const hasTicketSummary = (item) =>
  Boolean(
    item?.category ||
      item?.sub_category ||
      item?.subject ||
      item?.subject_sub_category ||
      item?.body,
  );

const normalizeChatMessage = (item, fallbackUser, mode) => ({
  ...item,
  username: item?.username || fallbackUser || "",
  message_by:
    item?.message_by || (mode === "admin" ? "support" : "Client"),
  attachment_type: item?.attachment_type || "none",
});

const buildTicketSummaryMessage = (ticket) => ({
  id: `ticket-summary-${ticket?.id || ticket?.ticket_id || "unknown"}`,
  ticket_id: ticket?.ticket_id,
  username: ticket?.username || "",
  category: ticket?.category || null,
  sub_category: ticket?.sub_category || null,
  subject: ticket?.subject || null,
  subject_sub_category: ticket?.subject_sub_category || null,
  body: ticket?.body || null,
  message: null,
  attachment_type: Array.isArray(ticket?.media) && ticket.media.length > 0 ? "image" : "none",
  attachment_name: null,
  attachment_path: Array.isArray(ticket?.media) && ticket.media.length > 0 ? ticket.media[0] : null,
  created_at: ticket?.created_at || new Date().toISOString(),
  message_by: "Client",
  type: "CustomerSupport",
  is_ticket_summary: true,
});

const SupportChatModal = ({
  open,
  onClose,
  ticket,
  mode,
  user,
}) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef(null);

  const chatType = useMemo(() => resolveChatPayloadType(mode), [mode]);
  const isTicketClosed = Number(ticket?.status) === 2;

  const fetchMessages = async () => {
    if (!ticket?.ticket_id) return;
    setLoading(true);
    try {
      const response = await getTicketChatByTicketId(ticket.ticket_id);
      const rows = Array.isArray(response.data?.messages)
        ? response.data.messages
        : Array.isArray(response.data?.data)
          ? response.data.data
        : [];
      const normalizedRows = rows.map((item) =>
        normalizeChatMessage(item, user?.username, mode),
      );
      const hasSummaryMessage = normalizedRows.some(
        (item) =>
          item?.category ||
          item?.sub_category ||
          item?.subject ||
          item?.subject_sub_category ||
          item?.body,
      );

      setMessages(
        hasSummaryMessage
          ? normalizedRows
          : [buildTicketSummaryMessage(ticket), ...normalizedRows],
      );
    } catch (error) {
      setMessages([]);
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchMessages();
    } else {
      setDraft("");
    }
  }, [open, ticket?.ticket_id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (isTicketClosed) {
      message.warning("This ticket is closed. Chat is disabled.");
      return;
    }
    if (!draft.trim() || !ticket?.ticket_id || !user?.username) return;
    setSending(true);
    try {
      const response = await sendTicketChatMessage({
        ticket_id: ticket.ticket_id,
        username: user.username,
        message: draft.trim(),
        type: chatType,
      });

      const isSent =
        response.status === 201 ||
        response.data?.success === true ||
        response.data?.status === 1;

      if (isSent) {
        const sentMessage = response.data?.data;
        if (sentMessage) {
          setMessages((current) => [
            ...current,
            normalizeChatMessage(sentMessage, user.username, mode),
          ]);
        }
        setDraft("");
        return;
      }

      message.error(response.data?.message || "Failed to send chat message");
    } catch (error) {
      handleApiError(error);
    } finally {
      setSending(false);
    }
  };

  const handleUpload = async (file) => {
    if (isTicketClosed) {
      message.warning("This ticket is closed. Attachment upload is disabled.");
      return false;
    }
    if (!ticket?.ticket_id || !user?.username) return false;
    setSending(true);
    try {
      const { endpoint, fieldName } = resolveChatEndpoint(file);
      const response = await uploadTicketChatAttachment({
        endpoint,
        fieldName,
        file,
        ticket_id: ticket.ticket_id,
        username: user.username,
        message: draft.trim() || undefined,
        type: chatType,
      });

      const isUploaded =
        response.status === 201 ||
        response.data?.success === true ||
        response.data?.status === 1;

      if (isUploaded) {
        const uploadedMessage = response.data?.data;
        if (uploadedMessage) {
          setMessages((current) => [
            ...current,
            normalizeChatMessage(uploadedMessage, user.username, mode),
          ]);
        }
        setDraft("");
      } else {
        message.error(response.data?.message || "Attachment upload failed");
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setSending(false);
    }
    return false;
  };

  return (
    <Modal
      isModalOpen={open}
      closeModal={onClose}
      closeOnBackdrop={false}
      closeOnEscape={false}
      width="760px"
      height="72vh"
    >
      <div className="-mx-6 -mt-6 h-[calc(72vh-3rem)] flex flex-col">
        <div
          className="px-6 py-5 border-b border-gray-100"
          style={{
            background: "linear-gradient(135deg, #f5f6ff 0%, #eef0ff 100%)",
            boxShadow: "0 1px 8px rgba(37,99,235,0.06)",
          }}
        >
          <div className="flex items-center justify-between pr-10 gap-4">
            <div className="min-w-0">
              <div className="text-lg font-semibold text-gray-900">
                {ticket?.ticket_id || "Ticket Chat"}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {ticket?.subject || "Customer Support"}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-gray-500">{ticket?.username || "N/A"}</div>
              <div className="text-xs text-gray-400">{ticket?.status_name || "Pending"}</div>
            </div>
          </div>
        </div>

        <div className="support-chat-shell">
        <div className="support-chat-body">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Spin size="large" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              No messages found
            </div>
          ) : (
            messages.map((item, index) => {
              const clientMessage = isClientMessage(item, ticket);
              const mine = isOwnMessageForViewer(item, ticket, mode);
              const showDate =
                index === 0 ||
                new Date(messages[index - 1].created_at).toDateString() !==
                  new Date(item.created_at).toDateString();
              const attachmentHref = resolveAttachmentHref(item);
              const imageAttachment =
                attachmentHref &&
                ((item.attachment_type || "").toLowerCase() === "image" ||
                  /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(attachmentHref));

              return (
                <React.Fragment key={item.id || `${item.ticket_id}-${index}`}>
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <div className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-500">
                        {formatDayLabel(item.created_at)}
                      </div>
                    </div>
                  )}

                  <div className={`flex mb-4 ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`support-chat-bubble ${mine ? "mine" : "other"}`}>
                      {hasTicketSummary(item) && (
                        <div className="mb-3 space-y-1 text-[15px] leading-6 text-gray-900">
                          <div>
                            <span>Client: </span>
                            <span>{ticket?.username || item.username || "N/A"}</span>
                          </div>
                          {item.category && (
                            <div>
                              <span>Category: </span>
                              <span>{item.category}</span>
                            </div>
                          )}
                          {item.sub_category && (
                            <div>
                              <span>Sub Category: </span>
                              <span>{item.sub_category}</span>
                            </div>
                          )}
                          {item.subject && (
                            <div>
                              <span>Subject: </span>
                              <span>{item.subject}</span>
                            </div>
                          )}
                          {item.subject_sub_category && (
                            <div>
                              <span>Subject sub Category: </span>
                              <span>{item.subject_sub_category}</span>
                            </div>
                          )}
                          {item.body && (
                            <div>
                              <span>Message : </span>
                              <span>{item.body}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {messageText(item) && !hasTicketSummary(item) && (
                        <div className="whitespace-pre-wrap break-words text-sm text-gray-800">
                          {messageText(item)}
                        </div>
                      )}

                      {attachmentHref && (
                        <div className="mt-3">
                          {imageAttachment ? (
                            <a href={attachmentHref} target="_blank" rel="noreferrer">
                              <img
                                src={attachmentHref}
                                alt={item.attachment_name || "Attachment"}
                                className="max-w-[240px] rounded-xl border border-black/10"
                              />
                            </a>
                          ) : (
                            <a
                              href={attachmentHref}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm text-blue-600"
                            >
                              <FileOutlined />
                              <span>{item.attachment_name || "View attachment"}</span>
                            </a>
                          )}
                        </div>
                      )}

                      <div className="mt-2 flex items-center justify-end text-[11px] text-gray-500">
                        <span>
                          {new Date(item.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="support-chat-input">
          {isTicketClosed && (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500">
              This ticket is closed. New messages and attachments are disabled.
            </div>
          )}
          <div className="support-chat-input-inner">
            <Upload beforeUpload={handleUpload} showUploadList={false}>
              <Button
                shape="circle"
                icon={<PaperClipOutlined />}
                disabled={sending || isTicketClosed}
              />
            </Upload>
            <TextArea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onPressEnter={(event) => {
                if (!event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              autoSize={{ minRows: 1, maxRows: 4 }}
              placeholder={
                isTicketClosed ? "This ticket is closed" : "Type your message..."
              }
              bordered={false}
              disabled={isTicketClosed}
            />
            <Button
              type="primary"
              shape="circle"
              icon={<SendOutlined />}
              loading={sending}
              onClick={handleSend}
              disabled={(!draft.trim() && !sending) || isTicketClosed}
              style={{ background: THEME.gradient, border: "none" }}
            />
          </div>
        </div>
      </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .support-chat-shell {
              flex: 1;
              display: flex;
              flex-direction: column;
              min-height: 0;
            }
            .support-chat-body {
              flex: 1;
              overflow-y: auto;
              padding: 20px;
              background: #efeae2;
            }
            .support-chat-input {
              border-top: 1px solid rgba(37,99,235,0.08);
              background: #f8fafc;
              padding: 14px 16px;
            }
            .support-chat-input-inner {
              display: flex;
              align-items: flex-end;
              gap: 10px;
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 18px;
              padding: 10px;
            }
            .support-chat-bubble {
              max-width: 68%;
              border-radius: 16px;
              padding: 12px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.06);
              overflow: hidden;
            }
            .support-chat-bubble.mine {
              background: #dcf8c6;
            }
            .support-chat-bubble.other {
              background: #fff;
            }
          `,
        }}
      />
    </Modal>
  );
};

export default SupportChatModal;
