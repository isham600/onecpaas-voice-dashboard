import { useState, useEffect } from "react";
import { Input, Button, Space, Tag, Typography, Empty } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

const TagManagement = ({ initialTags, onTagsChange }) => {
  const parseInitialTags = () => {
    if (!initialTags) return [];
    if (Array.isArray(initialTags)) return initialTags;
    try {
      return JSON.parse(initialTags);
    } catch {
      return initialTags.split(",").map((tag) => tag.trim());
    }
  };

  const [tags, setTags] = useState(parseInitialTags());
  const [newTag, setNewTag] = useState("");
  const [editingTagIndex, setEditingTagIndex] = useState(null);
  const [editedTagValue, setEditedTagValue] = useState("");
  const [tagChanges, setTagChanges] = useState([]);
  const [showInput, setShowInput] = useState(false);

  // Add new tag
  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags((prev) => [...prev, trimmedTag]);
      setTagChanges((prev) => [
        ...prev,
        {
          action: "create",
          tag: trimmedTag,
        },
      ]);
      setNewTag("");
      setShowInput(false);
    }
  };

  // Delete tag
  const handleDeleteTag = (index) => {
    const tagToDelete = tags[index];
    setTags((prev) => prev.filter((_, i) => i !== index));
    setTagChanges((prev) => [
      ...prev,
      {
        action: "delete",
        tag: tagToDelete,
      },
    ]);
  };

  // Open edit mode
  const handleEditTag = (index) => {
    setEditingTagIndex(index);
    setEditedTagValue(tags[index]);
  };

  // Save edited tag
  const handleSaveTag = (index) => {
    const trimmedValue = editedTagValue.trim();
    if (trimmedValue && trimmedValue !== tags[index]) {
      const oldTag = tags[index];
      setTags((prev) =>
        prev.map((tag, i) => (i === index ? trimmedValue : tag)),
      );
      setTagChanges((prev) => [
        ...prev,
        {
          action: "update",
          tag: trimmedValue,
          old_tag: oldTag,
        },
      ]);
    }
    setEditingTagIndex(null);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingTagIndex(null);
    setEditedTagValue("");
  };

  // Cancel add new tag
  const handleCancelAdd = () => {
    setShowInput(false);
    setNewTag("");
  };

  // Handle enter key press
  const handleKeyPress = (e, action, index = null) => {
    if (e.key === "Enter") {
      if (action === "add") {
        handleAddTag();
      } else if (action === "edit") {
        handleSaveTag(index);
      }
    } else if (e.key === "Escape") {
      if (action === "add") {
        handleCancelAdd();
      } else if (action === "edit") {
        handleCancelEdit();
      }
    }
  };

  // Update parent component with tags
  useEffect(() => {
    onTagsChange({ tags, changes: tagChanges });
  }, [tags, tagChanges]);

  return (
    <div
      className="border border-gray-300 rounded-md p-3 bg-white"
      style={{ height: "180px" }}
    >
      {/* Header with Add Button */}
      <div className="flex items-center justify-between mb-3">
        <Text strong className="text-gray-700">
          Tags
        </Text>
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => setShowInput(true)}
          className="text-blue-500 hover:bg-blue-50"
          disabled={showInput}
        />
      </div>

      {/* Scrollable Content Area */}
      <div className="overflow-y-auto" style={{ height: "calc(100% - 40px)" }}>
        {/* Add New Tag Input */}
        {showInput && (
          <div className="mb-3 p-2 bg-gray-50 rounded border">
            <Space.Compact className="w-full">
              <Input
                placeholder="Enter new tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => handleKeyPress(e, "add")}
                size="small"
                autoFocus
              />
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={handleAddTag}
                disabled={!newTag.trim()}
                className="bg-green-500 hover:bg-green-600 border-green-500"
              />
              <Button
                size="small"
                icon={<CloseOutlined />}
                onClick={handleCancelAdd}
                danger
              />
            </Space.Compact>
          </div>
        )}

        {/* Tags List */}
        <div className="space-y-2">
          {tags.length > 0 ? (
            tags.map((tag, index) => (
              <div key={index} className="w-full">
                {editingTagIndex === index ? (
                  <div className="p-2 bg-blue-50 rounded border border-blue-200">
                    <Space.Compact className="w-full">
                      <Input
                        value={editedTagValue}
                        onChange={(e) => setEditedTagValue(e.target.value)}
                        onKeyDown={(e) => handleKeyPress(e, "edit", index)}
                        size="small"
                        autoFocus
                      />
                      <Button
                        type="primary"
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={() => handleSaveTag(index)}
                        disabled={!editedTagValue.trim()}
                        className="bg-green-500 hover:bg-green-600 border-green-500"
                      />
                      <Button
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={handleCancelEdit}
                        danger
                      />
                    </Space.Compact>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded border hover:bg-gray-100 transition-colors">
                    <Tag color="blue" className="flex-1 m-0 py-1 px-2">
                      {tag}
                    </Tag>
                    <Space size="small" className="ml-2">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEditTag(index)}
                        className="text-blue-500 hover:bg-blue-50"
                      />
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteTag(index)}
                        className="text-red-500 hover:bg-red-50"
                      />
                    </Space>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Text type="secondary" className="text-sm">
                    No tags available
                  </Text>
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TagManagement;
