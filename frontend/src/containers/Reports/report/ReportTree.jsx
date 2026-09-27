// ReportsTree.jsx — Theme-only update, zero logic changes
import { useState, useEffect } from "react";
import {
  Tree,
  Spin,
  Typography,
  Button,
  Input,
  List,
  Avatar,
  Tooltip,
  Space,
  Pagination,
} from "antd";
import {
  UserOutlined,
  CrownOutlined,
  ShopOutlined,
  ArrowLeftOutlined,
  SearchOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import handleApiError from "../../../utils/errorHandler";
import axios from "axios";

const { Text, Title } = Typography;
const { Search } = Input;

// ─── User type style config (theme only) ───
const userTypeStyles = {
  Admin: {
    gradient: "linear-gradient(135deg, #ef4444, #dc2626)",
    bg: "rgba(239, 68, 68, 0.08)",
    border: "rgba(239, 68, 68, 0.15)",
    color: "#ef4444",
  },
  Reseller: {
    gradient: "linear-gradient(135deg, #3b82f6, #2563eb)",
    bg: "rgba(59, 130, 246, 0.08)",
    border: "rgba(59, 130, 246, 0.15)",
    color: "#3b82f6",
  },
  User: {
    gradient: "linear-gradient(135deg, #2563EB, #1D4ED8)",
    bg: "rgba(3, 207, 101, 0.08)",
    border: "rgba(3, 207, 101, 0.15)",
    color: "#2563EB",
  },
  Root: {
    gradient: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
    bg: "rgba(139, 92, 246, 0.08)",
    border: "rgba(139, 92, 246, 0.15)",
    color: "#8b5cf6",
  },
};

const getTypeStyle = (type) => userTypeStyles[type] || userTypeStyles.User;

const ReportsTree = ({ username, onSelect }) => {
  const navigate = useNavigate();
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URL2_URL}/api/users/auth/reports/tree/${username}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          params: {
            limit,
            offset,
            search: searchTerm || undefined,
          },
        },
      );

      if (response.data.status === 1) {
        const data = {
          ...response.data.data,
          clients: response.data.data.clients || [],
        };
        const formattedData = formatTreeData(data);
        setTreeData([formattedData]);
        setExpandedKeys([username]);
        collectAllNodes([formattedData]);
        setTotalRecords(response.data.data.pagination?.total || 0);
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page, pageSize) => {
    setOffset((page - 1) * pageSize);
    setLimit(pageSize);
  };

  const collectAllNodes = (nodes) => {
    let nodesList = [];
    const traverse = (node) => {
      nodesList.push(node);
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    nodes.forEach(traverse);
  };

  const getUserTypeIcon = (userType) => {
    switch (userType) {
      case "Admin":
        return <CrownOutlined style={{ color: "white", fontSize: "13px" }} />;
      case "Reseller":
        return <ShopOutlined style={{ color: "white", fontSize: "13px" }} />;
      default:
        return <UserOutlined style={{ color: "white", fontSize: "13px" }} />;
    }
  };

  const getUserTypeBadgeColor = (userType) => {
    const style = getTypeStyle(userType);
    return style.color;
  };

  const formatTreeData = (node) => {
    const typeStyle = getTypeStyle(node.user_type || "Root");

    return {
      key: node.username,
      title: (
        <div className="flex items-center justify-between w-full py-2 px-2.5 rounded-xl group/node transition-all duration-200 hover:bg-gray-50/80">
          <Space size={10} align="center" style={{ flex: 1 }}>
            {/* Themed icon container */}
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0"
              style={{ background: typeStyle.gradient }}
            >
              {getUserTypeIcon(node.user_type)}
            </div>

            <Text strong style={{ fontSize: "13px", color: "#111827" }}>
              {node.username}
            </Text>

            {/* Themed badge */}
            <span
              className="text-[10px] font-bold px-2 py-[3px] rounded-full uppercase tracking-wide"
              style={{
                backgroundColor: typeStyle.bg,
                color: typeStyle.color,
                border: `1px solid ${typeStyle.border}`,
              }}
            >
              {node.user_type || "Root"}
            </span>
          </Space>

          <Tooltip title="View reports">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(node.username, node.user_type || "Root");
              }}
              className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover/node:opacity-100 transition-all duration-200 hover:scale-110 flex-shrink-0 ml-2"
              style={{
                backgroundColor: typeStyle.bg,
                border: `1px solid ${typeStyle.border}`,
              }}
            >
              <EyeOutlined
                style={{ fontSize: "12px", color: typeStyle.color }}
              />
            </button>
          </Tooltip>
        </div>
      ),
      icon: null,
      children:
        node.clients && node.clients.length > 0
          ? node.clients.map((client) => {
              const clientStyle = getTypeStyle(client.user_type);

              return {
                key: client.client_username,
                title: (
                  <div className="flex items-center justify-between w-full py-2 px-2.5 rounded-xl group/node transition-all duration-200 hover:bg-gray-50/80">
                    <Space size={10} align="center" style={{ flex: 1 }}>
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0"
                        style={{ background: clientStyle.gradient }}
                      >
                        {getUserTypeIcon(client.user_type)}
                      </div>

                      <Text
                        strong
                        style={{ fontSize: "13px", color: "#111827" }}
                      >
                        {client.client_username}
                      </Text>

                      <span
                        className="text-[10px] font-bold px-2 py-[3px] rounded-full uppercase tracking-wide"
                        style={{
                          backgroundColor: clientStyle.bg,
                          color: clientStyle.color,
                          border: `1px solid ${clientStyle.border}`,
                        }}
                      >
                        {client.user_type}
                      </span>
                    </Space>

                    <Tooltip title="View reports">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(client.client_username, client.user_type);
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover/node:opacity-100 transition-all duration-200 hover:scale-110 flex-shrink-0 ml-2"
                        style={{
                          backgroundColor: clientStyle.bg,
                          border: `1px solid ${clientStyle.border}`,
                        }}
                      >
                        <EyeOutlined
                          style={{
                            fontSize: "12px",
                            color: clientStyle.color,
                          }}
                        />
                      </button>
                    </Tooltip>
                  </div>
                ),
                icon: null,
                isLeaf: client.user_type === "User",
                user_type: client.user_type,
              };
            })
          : [],
    };
  };

  const getAvatarForUserType = (userType) => {
    const style = getTypeStyle(userType);

    switch (userType) {
      case "Admin":
        return (
          <Avatar
            icon={<CrownOutlined />}
            size="small"
            style={{ background: style.gradient }}
          />
        );
      case "Reseller":
        return (
          <Avatar
            icon={<ShopOutlined />}
            size="small"
            style={{ background: style.gradient }}
          />
        );
      default:
        return (
          <Avatar
            icon={<UserOutlined />}
            size="small"
            style={{ background: style.gradient }}
          />
        );
    }
  };

  const onLoadData = async ({ key, children, user_type }) => {
    if (children || user_type === "User") return;

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URL2_URL}/api/users/auth/reports/tree/${key}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          params: {
            limit,
            offset,
            search: searchTerm || undefined,
          },
        },
      );

      if (response.data.status === 1) {
        const newData = {
          ...response.data.data,
          clients: response.data.data.clients || [],
        };
        const formattedData = formatTreeData(newData);

        setTreeData((prevData) => {
          const updateTreeData = (nodes) => {
            return nodes.map((node) => {
              if (node.key === key) {
                return {
                  ...node,
                  children: formattedData.children,
                };
              }
              if (node.children) {
                return {
                  ...node,
                  children: updateTreeData(node.children),
                };
              }
              return node;
            });
          };

          const updatedData = updateTreeData(prevData);
          collectAllNodes(updatedData);
          return updatedData;
        });
      }
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setOffset(0);
  };

  useEffect(() => {
    if (username) {
      fetchData();
    }
  }, [username, limit, offset, searchTerm]);

  return (
    <div className="min-h-screen relative">
      {/* ─── Background (matches dashboard) ─── */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 25%, #e2e8f0 50%, #f8fafc 75%, #f1f5f9 100%)",
        }}
      />
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ─── Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm"
      >
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl flex items-center justify-center border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow flex-shrink-0"
            >
              <ArrowLeftOutlined style={{ fontSize: 14, color: "#374151" }} />
            </button>

            {/* Title */}
            <div className="flex items-center gap-3 flex-1 justify-center">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md hidden sm:flex"
                style={{
                  background:
                    "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                }}
              >
                <UserOutlined style={{ fontSize: 16, color: "white" }} />
              </div>
              <Title
                level={4}
                className="!mb-0 !text-gray-900"
                style={{ margin: 0 }}
              >
                Client Hierarchy
              </Title>
            </div>

            {/* Search */}
            <Search
              placeholder="Search clients..."
              allowClear
              enterButton={<SearchOutlined style={{ color: "white" }} />}
              size="middle"
              style={{ width: 280, flexShrink: 0 }}
              onSearch={handleSearch}
              onChange={(e) => handleSearch(e.target.value)}
              className="themed-search"
            />
          </div>
        </div>
      </motion.div>

      {/* ─── Content ─── */}
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg shadow-gray-200/30 p-6"
        >
          <Spin spinning={loading}>
            {isSearching ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Space>
                    <Text strong style={{ fontSize: 14 }}>
                      Search Results ({searchResults.length})
                    </Text>
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setIsSearching(false);
                        setSearchResults([]);
                      }}
                      className="text-sm font-medium px-3 py-1 rounded-lg transition-colors"
                      style={{
                        color: "#2563EB",
                        background: "rgba(37,99,235,0.08)",
                      }}
                    >
                      Show Full Tree
                    </button>
                  </Space>
                </div>
                <List
                  itemLayout="horizontal"
                  dataSource={searchResults}
                  renderItem={(item) => {
                    const itemStyle = getTypeStyle(item.user_type);

                    return (
                      <List.Item
                        onClick={() => onSelect(item.key, item.user_type)}
                        style={{
                          cursor: "pointer",
                          padding: "12px 16px",
                          borderRadius: "12px",
                          marginBottom: "6px",
                          border: `1px solid ${itemStyle.border}`,
                          transition: "all 0.2s",
                        }}
                        className="hover:shadow-sm"
                      >
                        <List.Item.Meta
                          avatar={getAvatarForUserType(item.user_type)}
                          title={
                            <Space>
                              <Text strong>{item.key}</Text>
                              <span
                                className="text-[10px] font-bold px-2 py-[3px] rounded-full uppercase tracking-wide"
                                style={{
                                  backgroundColor: itemStyle.bg,
                                  color: itemStyle.color,
                                  border: `1px solid ${itemStyle.border}`,
                                }}
                              >
                                {item.user_type}
                              </span>
                            </Space>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              </>
            ) : (
              <>
                <Tree.DirectoryTree
                  showIcon={false}
                  loadData={onLoadData}
                  treeData={treeData}
                  expandedKeys={expandedKeys}
                  onExpand={(keys) => setExpandedKeys(keys)}
                  onSelect={(keys, { node }) => {
                    if (node.isLeaf) {
                      onSelect(node.key, node.user_type);
                    }
                  }}
                  style={{ backgroundColor: "transparent" }}
                  className="themed-tree"
                />

                {totalRecords > 0 && (
                  <div className="flex justify-center mt-6 pt-4 border-t border-gray-100">
                    <Pagination
                      current={Math.floor(offset / limit) + 1}
                      pageSize={limit}
                      total={totalRecords}
                      onChange={handlePageChange}
                      showSizeChanger
                      pageSizeOptions={["10", "20", "50", "100"]}
                    />
                  </div>
                )}
              </>
            )}
          </Spin>
        </motion.div>
      </div>

      {/* ─── Theme Styles ─── */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Tree node styling */
        .themed-tree .ant-tree-treenode {
          padding: 2px 0 !important;
          width: 100%;
        }

        .themed-tree .ant-tree-node-content-wrapper {
          padding: 0 !important;
          border-radius: 12px;
          transition: all 0.2s ease;
          width: 100%;
          overflow: hidden;
        }

        .themed-tree .ant-tree-node-content-wrapper:hover {
          background-color: transparent !important;
        }

        .themed-tree .ant-tree-node-content-wrapper.ant-tree-node-selected {
          background-color: rgba(3, 207, 101, 0.05) !important;
          border-radius: 12px;
        }

        .themed-tree .ant-tree-title {
          width: 100%;
          display: block;
        }

        .themed-tree .ant-tree-switcher {
          background: transparent !important;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .themed-tree .ant-tree-switcher:hover {
          background-color: rgba(3, 207, 101, 0.08) !important;
        }

        .themed-tree .ant-tree-switcher .ant-tree-switcher-icon,
        .themed-tree .ant-tree-switcher .anticon {
          color: #2563EB !important;
          font-size: 10px;
        }

        .themed-tree .ant-tree-indent-unit {
          width: 24px;
        }

        .themed-tree .ant-tree-iconEle {
          display: none !important;
        }

        .themed-tree .ant-tree-treenode-selected .ant-tree-node-content-wrapper {
          background-color: rgba(3, 207, 101, 0.04) !important;
        }

        /* Search input theme */
        .themed-search .ant-input-search-button {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%) !important;
          border-color: #2563EB !important;
          box-shadow: 0 2px 4px rgba(3, 207, 101, 0.2);
        }

        .themed-search .ant-input-search-button:hover {
          background: linear-gradient(135deg, #4338CA 0%, #028a42 100%) !important;
          border-color: #4338CA !important;
        }

        .themed-search .ant-input:focus,
        .themed-search .ant-input-focused {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(3, 207, 101, 0.15) !important;
        }

        .themed-search .ant-input:hover {
          border-color: #2563EB !important;
        }

        .themed-search .ant-input-group-addon {
          background: transparent;
        }

        /* Pagination theme */
        .ant-pagination .ant-pagination-item-active {
          border-color: #2563EB !important;
          background: rgba(3, 207, 101, 0.05);
        }

        .ant-pagination .ant-pagination-item-active a {
          color: #2563EB !important;
        }

        .ant-pagination .ant-pagination-item:hover {
          border-color: #2563EB !important;
        }

        .ant-pagination .ant-pagination-item:hover a {
          color: #2563EB !important;
        }

        .ant-pagination .ant-pagination-prev:hover .ant-pagination-item-link,
        .ant-pagination .ant-pagination-next:hover .ant-pagination-item-link {
          color: #2563EB !important;
          border-color: #2563EB !important;
        }

        /* Spin theme */
        .ant-spin-dot-item {
          background-color: #2563EB !important;
        }
      `}} />
    </div>
  );
};

export default ReportsTree;
