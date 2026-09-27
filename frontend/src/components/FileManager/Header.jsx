import { Input, Select, Button, Breadcrumb, Space } from "antd";
import {
  SearchOutlined,
  FolderAddOutlined,
  AppstoreOutlined,
  BarsOutlined,
  UploadOutlined,
  HomeOutlined,
} from "@ant-design/icons";

const { Option } = Select;

const Header = ({
  onSearch,
  onNewFolder,
  onToggleView,
  onUploadFile,
  currentPath,
  onBreadcrumbClick,
  onFilter,
  filter,
}) => {
  // Generate breadcrumb items
  const breadcrumbItems = [
    {
      title: (
        <span
          className="cursor-pointer hover:text-blue-500"
          onClick={() => onBreadcrumbClick(-1)} // Assuming -1 or 0 resets to root depending on your logic
        >
          <HomeOutlined /> Home
        </span>
      ),
    },
    ...currentPath.map((folder, index) => ({
      title: (
        <span
          className="cursor-pointer hover:text-blue-500"
          onClick={() => onBreadcrumbClick(index)}
        >
          {folder}
        </span>
      ),
    })),
  ];

  return (
    <div className="p-4 bg-white border-b border-gray-200">
      {/* Top Bar: Search and Actions */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        {/* Left Side: Search & Filter */}
        <div className="flex items-center gap-4 flex-1">
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined className="text-gray-400" />}
            onChange={onSearch}
            className="w-full max-w-xs"
            allowClear
          />

          <div className="w-32">
            <Select
              value={filter}
              onChange={(e) => onFilter({ target: { value: e } })} // Adapting to match original onChange signature if needed, or pass value directly
              placeholder="Filter"
              style={{ width: "100%" }}
            >
              <Option value="newest">Newest</Option>
              <Option value="oldest">Oldest</Option>
            </Select>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <Space>
          {currentPath.length === 0 && (
            <Button
              type="primary"
              icon={<FolderAddOutlined />}
              onClick={onNewFolder}
              className="bg-blue-500"
            >
              New Folder
            </Button>
          )}

          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={onUploadFile}
            className="bg-blue-500"
          >
            Upload File
          </Button>

          <Button.Group>
            <Button
              icon={<BarsOutlined />}
              onClick={() => onToggleView("list")}
              title="List View"
            />
            <Button
              icon={<AppstoreOutlined />}
              onClick={() => onToggleView("grid")}
              title="Grid View"
            />
          </Button.Group>
        </Space>
      </div>

      {/* Bottom Bar: Breadcrumbs */}
      <div className="flex items-center mt-4">
        <span className="text-gray-500 mr-2">Current Path:</span>
        <Breadcrumb items={breadcrumbItems} separator=">" />
      </div>
    </div>
  );
};

export default Header;
