// erp-inventory-system-070225/frontend/src/pages/InventoryManagement.jsx
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Tag, Modal, Form, Select, InputNumber, Input, message, Space } from 'antd';
import { ShopOutlined, WarningOutlined, HomeOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import DataTable from '../components/DataTable';

const InventoryManagement = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [stats, setStats] = useState({ totalItems: 0, lowStockItems: 0 });

  // 获取库存和产品数据
  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, prodRes] = await Promise.all([
        axios.get('/api/inventory'),
        axios.get('/api/products')
      ]);
      
      setData(invRes.data);
      setProducts(prodRes.data);

      // 计算统计数据
      const total = invRes.data.reduce((sum, item) => sum + (item.quantity || 0), 0);
      // 检查低库存：对比分仓库存数量
      const lowStock = invRes.data.filter(item => item.quantity < 10).length; 
      
      setStats({ totalItems: total, lowStockItems: lowStock });

    } catch (error) {
      console.error('Fetch inventory data failed:', error);
      message.error('获取库存数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 提交库存调整
  const handleSave = async (values) => {
    try {
      await axios.post('/api/inventory', values);
      message.success('库存信息已更新');
      setIsModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error('更新失败');
    }
  };

  // 打开模态框
  const handleOpenModal = (record = null) => {
    if (record) {
      form.setFieldsValue({
        product_id: record.product_id,
        location: record.location,
        quantity: record.quantity
      });
    } else {
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const columns = [
    {
      title: '产品名称',
      dataIndex: 'product_name',
      key: 'product_name',
      render: (text, record) => <span style={{ fontWeight: 500 }}>{text || `ID:${record.product_id}`}</span>
    },
    {
      title: '仓库位置',
      dataIndex: 'location',
      key: 'location',
      render: (text) => <Tag color="blue"><HomeOutlined /> {text || '未指定'}</Tag>
    },
    {
      title: '当前数量',
      dataIndex: 'quantity',
      key: 'quantity',
      sorter: (a, b) => a.quantity - b.quantity,
      render: (val) => (
        <span style={{ 
          color: val < 10 ? '#ff4d4f' : 'inherit', 
          fontWeight: val < 10 ? 'bold' : 'normal' 
        }}>
          {val} {val < 10 && <WarningOutlined style={{ marginLeft: 4 }} />}
        </span>
      )
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (val) => dayjs(val).format('YYYY-MM-DD HH:mm'),
      sorter: (a, b) => new Date(a.updated_at) - new Date(b.updated_at),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <a onClick={() => handleOpenModal(record)} style={{ color: 'var(--color-primary)' }}>
          调整
        </a>
      )
    }
  ];

  return (
    <div className="page-inventory">
      {/* 统计概览 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card bordered={false} className="content-card" bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title="分仓库存总量"
              value={stats.totalItems}
              prefix={<ShopOutlined />}
              valueStyle={{ color: 'var(--color-primary)' }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card bordered={false} className="content-card" bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title="低库存预警项"
              value={stats.lowStockItems}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 动态槽位：统计区下方 */}
      <div id="inventory-stats-slot" style={{ marginBottom: 16 }}></div>

      {/* 库存表格 */}
      <DataTable
        title="分仓库存列表"
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        onAdd={() => handleOpenModal()}
        onRefresh={fetchData}
        exportFileName="分仓库存报表"
        pagination={{ pageSize: 10 }}
      />

      {/* 调整库存模态框 */}
      <Modal
        title="库存调整 / 入库"
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item 
            name="product_id" 
            label="选择产品" 
            rules={[{ required: true, message: '请选择产品' }]}
          >
            <Select 
              placeholder="选择要调整的产品"
              showSearch
              optionFilterProp="children"
            >
              {products.map(p => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name} (总库: {p.stock})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item 
            name="location" 
            label="仓库位置/货架" 
            rules={[{ required: true, message: '请输入位置' }]}
          >
            <Input placeholder="例如：A区-01架" />
          </Form.Item>

          <Form.Item 
            name="quantity" 
            label="现有数量" 
            rules={[{ required: true, message: '请输入数量' }]}
            help="直接设置该位置的当前库存数量"
          >
            <InputNumber style={{ width: '100%' }} min={0} precision={0} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 动态槽位：页面底部 */}
      <div id="inventory-page-footer-slot"></div>
    </div>
  );
};

export default InventoryManagement;