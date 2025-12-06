// erp-inventory-system-070225/frontend/src/pages/SalesManagement.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Space, Button, Modal, Form, Input, Select, DatePicker, InputNumber, Tag, message, Typography, Divider, Descriptions } from 'antd';
import { PrinterOutlined, FileTextOutlined, UserOutlined, CheckCircleOutlined, SyncOutlined, CloseCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import DataTable from '../components/DataTable';

const { Option } = Select;
const { Text } = Typography;

const SalesManagement = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]); // 销售记录
  const [customers, setCustomers] = useState([]); // 客户列表（用于下拉选择）
  const [isModalOpen, setIsModalOpen] = useState(false); // 新增/编辑弹窗
  const [isDetailOpen, setIsDetailOpen] = useState(false); // 详情/打印弹窗
  const [currentRecord, setCurrentRecord] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  // 打印区域引用
  const printRef = useRef();

  // 获取销售数据和客户列表
  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, customersRes] = await Promise.all([
        axios.get('/api/sales'),
        axios.get('/api/customers/all')
      ]);
      setData(salesRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      console.error('Fetch data failed:', error);
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 前端过滤搜索（因后端暂未实现搜索参数）
  const filteredData = data.filter(item => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      (item.customer_name && item.customer_name.toLowerCase().includes(searchLower)) ||
      (item.content && item.content.toLowerCase().includes(searchLower)) ||
      (item.status && item.status.toLowerCase().includes(searchLower))
    );
  });

  // 打开新增弹窗
  const handleOpenModal = () => {
    form.resetFields();
    form.setFieldsValue({
      status: 'pending',
      follow_up_date: dayjs().add(3, 'day'), // 默认3天后跟进
      date: dayjs()
    });
    setIsModalOpen(true);
  };

  // 提交销售记录
  const handleSave = async (values) => {
    try {
      const payload = {
        ...values,
        follow_up_date: values.follow_up_date ? values.follow_up_date.format('YYYY-MM-DD HH:mm:ss') : null
      };
      
      await axios.post('/api/sales', payload);
      message.success('销售跟进记录已添加');
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Save sale failed:', error);
      message.error('保存失败');
    }
  };

  // 查看详情并准备打印
  const handleViewDetail = (record) => {
    setCurrentRecord(record);
    setIsDetailOpen(true);
  };

  // 打印单据详情
  const handlePrintDetail = () => {
    const printContent = document.getElementById('printable-invoice-area');
    const originalContents = document.body.innerHTML;
    
    // 简单的打印实现：替换body内容进行打印，然后恢复
    // 注意：在React单页应用中这样做可能会破坏事件绑定，更推荐使用 iframe 打印或 CSS 媒体查询控制
    // 这里使用 CSS @media print 控制显示隐藏是更安全的方式，但为了只打印模态框内容，我们用新窗口方式
    
    if (printContent) {
        const win = window.open('', '', 'height=700,width=900');
        win.document.write('<html><head><title>打印单据</title>');
        // 引入简单的样式
        win.document.write('<style>');
        win.document.write(`
            body { font-family: 'Inter', sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .title { font-size: 24px; font-weight: bold; color: #3E2723; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .label { color: #666; font-size: 14px; }
            .value { font-weight: 500; font-size: 16px; margin-top: 4px; }
            .section { margin-top: 30px; }
            .content-box { background: #f9f9f9; padding: 15px; border-radius: 4px; border: 1px solid #eee; min-height: 100px; }
            .footer { margin-top: 50px; text-align: right; font-size: 12px; color: #999; }
            .status-stamp { 
                position: absolute; top: 20px; right: 20px; 
                border: 3px solid #ccc; color: #ccc; 
                padding: 5px 10px; font-weight: bold; text-transform: uppercase; transform: rotate(-15deg); 
            }
        `);
        win.document.write('</style>');
        win.document.write('</head><body>');
        win.document.write(printContent.innerHTML);
        win.document.write('</body></html>');
        win.document.close();
        win.print();
    }
  };

  const statusMap = {
    pending: { color: 'processing', text: '跟进中', icon: <SyncOutlined spin /> },
    completed: { color: 'success', text: '已成交', icon: <CheckCircleOutlined /> },
    cancelled: { color: 'error', text: '已取消', icon: <CloseCircleOutlined /> },
  };

  const columns = [
    {
      title: '客户名称',
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (text) => <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}><UserOutlined /> {text || '未知客户'}</span>
    },
    {
      title: '跟进内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      width: 300
    },
    {
      title: '意向金额',
      dataIndex: 'amount',
      key: 'amount',
      sorter: (a, b) => a.amount - b.amount,
      render: (val) => val ? `¥ ${Number(val).toFixed(2)}` : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = statusMap[status] || statusMap.pending;
        return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
      }
    },
    {
      title: '下次跟进',
      dataIndex: 'follow_up_date',
      key: 'follow_up_date',
      render: (val) => val ? dayjs(val).format('YYYY-MM-DD') : '-'
    },
    {
      title: '记录时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (val) => dayjs(val).format('MM-DD HH:mm'),
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            type="text" 
            size="small"
            icon={<FileTextOutlined />} 
            onClick={() => handleViewDetail(record)}
            style={{ color: 'var(--color-primary)' }}
          >
            详情
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div className="page-sales-management">
      {/* 动态插槽：页面顶部 */}
      <div id="sales-page-top-slot" style={{ marginBottom: 16 }}></div>

      <DataTable
        title="销售跟进记录"
        columns={columns}
        dataSource={filteredData}
        loading={loading}
        rowKey="id"
        onAdd={handleOpenModal}
        onRefresh={fetchData}
        onSearch={setSearchText}
        searchPlaceholder="搜索客户、内容或状态..."
        exportFileName="销售跟进表"
        pagination={{ pageSize: 10 }}
      />

      {/* 新增销售记录模态框 */}
      <Modal
        title="新增销售跟进"
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsModalOpen(false)}
        destroyOnClose
        forceRender
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="customer_id"
            label="关联客户"
            rules={[{ required: true, message: '请选择客户' }]}
          >
            <Select 
              placeholder="选择客户" 
              showSearch
              optionFilterProp="children"
            >
              {customers.map(c => (
                <Option key={c.id} value={c.id}>{c.name} ({c.phone || '无电话'})</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="跟进状态"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="pending">跟进中</Option>
              <Option value="completed">已成交</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="涉及金额(元)"
          >
            <InputNumber 
              style={{ width: '100%' }} 
              min={0} 
              step={0.01} 
              placeholder="预估或实际成交金额"
            />
          </Form.Item>

          <Form.Item
            name="follow_up_date"
            label="下次跟进日期"
          >
            <DatePicker style={{ width: '100%' }} showTime format="YYYY-MM-DD HH:mm" />
          </Form.Item>

          <Form.Item
            name="content"
            label="沟通内容记录"
            rules={[{ required: true, message: '请记录沟通内容' }]}
          >
            <Input.TextArea 
              rows={4} 
              placeholder="例如：客户对产品价格表示满意，但希望交货期能提前..." 
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情与打印模态框 */}
      <Modal
        title={
          <Space>
            <FileTextOutlined /> 
            <span>跟进记录单据</span>
          </Space>
        }
        open={isDetailOpen}
        onCancel={() => setIsDetailOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailOpen(false)}>关闭</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrintDetail}>
            打印单据
          </Button>
        ]}
        width={700}
      >
        {currentRecord && (
          <div id="printable-invoice-area" style={{ padding: 24, background: '#fff' }}>
            {/* 仅在打印视图中显示的印章效果 */}
            <div className="status-stamp" style={{ 
                display: 'none', // 屏幕隐藏，打印样式会显示（通过 JS write 写入）
                position: 'absolute', top: 20, right: 20, border: '3px solid #ccc', color: '#ccc', padding: '5px 10px', fontWeight: 'bold', transform: 'rotate(-15deg)'
            }}>
                {currentRecord.status}
            </div>

            <div className="header" style={{ textAlign: 'center', marginBottom: 20, borderBottom: '1px solid #eee', paddingBottom: 10 }}>
              <div className="title" style={{ fontSize: 20, fontWeight: 'bold', color: 'var(--color-primary)' }}>销售跟进记录单</div>
              <div style={{ color: '#999', fontSize: 12 }}>单据编号: SALES-{String(currentRecord.id).padStart(6, '0')}</div>
            </div>

            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="客户名称" span={2} labelStyle={{ width: 120 }}>
                {currentRecord.customer_name}
              </Descriptions.Item>
              <Descriptions.Item label="跟进日期">
                {dayjs(currentRecord.created_at).format('YYYY-MM-DD')}
              </Descriptions.Item>
              <Descriptions.Item label="当前状态">
                {(statusMap[currentRecord.status] || statusMap.pending).text}
              </Descriptions.Item>
              <Descriptions.Item label="涉及金额">
                ¥ {Number(currentRecord.amount || 0).toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="下次计划">
                {currentRecord.follow_up_date ? dayjs(currentRecord.follow_up_date).format('YYYY-MM-DD') : '无'}
              </Descriptions.Item>
              <Descriptions.Item label="沟通内容" span={2}>
                <div style={{ whiteSpace: 'pre-wrap', padding: '8px 0', minHeight: 60 }}>
                  {currentRecord.content}
                </div>
              </Descriptions.Item>
            </Descriptions>
            
            <div className="footer" style={{ marginTop: 40, textAlign: 'right', fontSize: 12, color: '#999' }}>
              <p>打印时间: {dayjs().format('YYYY-MM-DD HH:mm:ss')}</p>
              <p>ERP Pro System</p>
            </div>
          </div>
        )}
      </Modal>

      {/* 动态插槽：页面底部 */}
      <div id="sales-page-footer-slot"></div>
    </div>
  );
};

export default SalesManagement;