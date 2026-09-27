import { Button } from "antd";
import {
  DoubleLeftOutlined,
  LeftOutlined,
  RightOutlined,
  DoubleRightOutlined,
} from "@ant-design/icons";

const CustomPaginationActions = (props) => {
  const { count, page, rowsPerPage, onPageChange } = props;

  const handleFirstPage = (event) => onPageChange(event, 0);
  const handleLastPage = (event) =>
    onPageChange(event, Math.ceil(count / rowsPerPage) - 1);
  const handleNextPage = (event) => onPageChange(event, page + 1);
  const handlePrevPage = (event) => onPageChange(event, page - 1);

  return (
    <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
      <Button
        type="text"
        shape="circle"
        icon={<DoubleLeftOutlined />}
        onClick={handleFirstPage}
        disabled={page === 0}
      />
      <Button
        type="text"
        shape="circle"
        icon={<LeftOutlined />}
        onClick={handlePrevPage}
        disabled={page === 0}
      />
      <Button
        type="text"
        shape="circle"
        icon={<RightOutlined />}
        onClick={handleNextPage}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
      />
      <Button
        type="text"
        shape="circle"
        icon={<DoubleRightOutlined />}
        onClick={handleLastPage}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
      />
    </div>
  );
};

export default CustomPaginationActions;
