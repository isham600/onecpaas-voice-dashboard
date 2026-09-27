import { Table, Typography } from "antd";

const { Title } = Typography;

const DTMFModal = ({ data }) => {
  const columns = [
    {
      title: "DTMF",
      dataIndex: "dtmf",
      key: "dtmf",
      align: "center",
    },
    {
      title: "Selected Audio/Number",
      key: "selected",
      align: "center",
      render: (_, record) => {
        if (record.selected_audio) {
          return <p>{record.selected_audio}</p>;
        } else if (record.selected_number) {
          return record.selected_number;
        } else {
          return "N/A";
        }
      },
    },
  ];

  return (
    <>
      <Title level={5} className="mb-4">
        Callback Audio Details
      </Title>

      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        rowKey={(record, index) => index}
        className="custom-dtmf-table"
        scroll={{ x: "max-content" }}
      />

      <style dangerouslySetInnerHTML={{__html: `
        .custom-dtmf-table .ant-table-thead > tr > th {
          background: #1890ff;
          color: white;
          font-weight: 600;
          font-size: 1.1rem;
          text-align: center;
        }
        .custom-dtmf-table .ant-table-tbody > tr:nth-child(odd) {
          background-color: #f0f7ff;
        }
        .custom-dtmf-table .ant-table-tbody > tr:nth-child(even) {
          background-color: #ffffff;
        }
        .custom-dtmf-table .ant-table-row:hover {
          background: #e6f7ff !important;
        }
        .custom-dtmf-table .ant-table-cell {
          padding: 12px 16px;
          text-align: center;
        }
      `}} />
    </>
  );
};

export default DTMFModal;
