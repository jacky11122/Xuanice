// erp-inventory-system-070225/frontend/src/pages/ProductManagement.jsx
import React, { useState, useEffect } from 'react';
import { Space, Button, Modal, Form, Input, InputNumber, Select, Tag, message, Popconfirm, Tooltip, Badge } from 'antd';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import DataTable from '../components/DataTable';

const { Option } = Select;

const ProductManagement = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  // 获取产品列表
  const fetchData = async (search = '') => {
    setLoading(true);
    try {
      // 构建查询参数
      const params = {};
      if (search) params.search = search;
      
      const res = await axios.get('/api/products', { params });
      setData(res.data);
    } catch (error) {
      console.error('Fetch products failed:', error);
      message.error('获取产品数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 搜索处理
  const handleSearch = (value) => {
    setSearchText(value);
    fetchData(value);
  };

  // 打开新增/编辑模态框
  const handleOpenModal = (record = null) => {
    if (record) {
      setIsEdit(true);
      setCurrentId(record.id);
      form.setFieldsValue(record);
    } else {
      setIsEdit(false);
      setCurrentId(null);
      form.resetFields();
      // 设置默认值
      form.setFieldsValue({ min_stock: 10, stock: 0 });
    }
    setIsModalOpen(true);
  };

  // 提交表单
  const handleSave = async (values) => {
    try {
      if (isEdit) {
        await axios.put(`/api/products/${currentId}`, values);
        message.success('产品信息已更新');
      } else {
        await axios.post('/api/products', values);
        message.success('产品已添加');
      }
      setIsModalOpen(false);
      form.resetFields();
      fetchData(searchText);
    } catch (error) {
      console.error('Save product failed:', error);
      message.error(isEdit ? '更新失败' : '添加失败');
    }
  };

  // 删除产品
  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/products/${id}`);
      message.success('产品已删除');
      fetchData(searchText);
    } catch (error) {
      console.error('Delete product failed:', error);
      message.error('删除失败，可能存在关联数据');
    }
  };

  // 处理导入 (客户端模拟批量，因为后端未提供batch接口)
  const handleImport = async (importedData) => {
    if (!importedData || importedData.length === 0) return;
    
    const hide = message.loading('正在导入数据...', 0);
    let successCount = 0;
    let failCount = 0;

    // 串行执行以减轻服务器压力
    for (const item of importedData) {
      try {
        // 简单映射字段
        const payload = {
            name: item['产品名称'] || item['name'],
            category: item['分类'] || item['category'] || '未分类',
            price: item['价格'] || item['price'] || 0,
            stock: item['库存'] || item['stock'] || 0,
            min_stock: item['预警库存'] || item['min_stock'] || 10,
            description: item['描述'] || item['description'] || ''
        };
        if (!payload.name) continue; // 跳过无名称数据
        
        await axios.post('/api/products', payload);
        successCount++;
      } catch (err) {
        failCount++;
      }
    }
    
    hide();
    message.info(`导入完成：成功 ${successCount} 条，失败 ${failCount} 条`);
    fetchData();
  };

  // 表格列定义
  const columns = [
    {
      title: '产品名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <span style={{ fontWeight: 500 }}>{text}</span>
          {record.stock <= record.min_stock && (
            <Tooltip title="库存不足预警">
              <Badge status="error" />
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (text) => <Tag>{text || '通用'}</Tag>
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      sorter: (a, b) => a.price - b.price,
      render: (val) => `¥ ${Number(val).toFixed(2)}`
    },
    {
      title: '总库存',
      dataIndex: 'stock',
      key: 'stock',
      sorter: (a, b) => a.stock - b.stock,
      render: (val, record) => (
        <span style={{ 
          color: val <= record.min_stock ? '#ff4d4f' : 'inherit',
          fontWeight: val <= record.min_stock ? 'bold' : 'normal'
        }}>
          {val} {val <= record.min_stock && <ExclamationCircleOutlined />}
        </span>
      )
    },
    {
      title: '预警阈值',
      dataIndex: 'min_stock',
      key: 'min_stock',
      render: (val) => <span style={{ color: '#999' }}>&le; {val}</span>
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            style={{ color: 'var(--color-primary)' }}
            onClick={() => handleOpenModal(record)}
          />
          <Popconfirm
            title="确定要删除此产品吗?"
            description="删除后无法恢复，且可能影响历史订单数据。"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
          >
             <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="page-product-management">
      {/* 动态槽位：页面顶部 */}
      <div id="product-page-top-slot" style={{ marginBottom: 16 }}></div>

      <DataTable
        title="产品信息列表"
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        onAdd={() => handleOpenModal()}
        onRefresh={() => fetchData(searchText)}
        onSearch={handleSearch}
        onImport={handleImport}
        exportFileName="产品库存表"
        searchPlaceholder="搜索产品名称、描述..."
        pagination={{ pageSize: 10 }}
      />

      {/* 新增/编辑模态框 */}
      <Modal
        title={isEdit ? "编辑产品信息" : "新增产品"}
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsModalOpen(false)}
        destroyOnClose
        forceRender
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="name"
            label="产品名称"
            rules={[{ required: true, message: '请输入产品名称' }]}
          >
            <Input placeholder="例如：高端商务笔记本" />
          </Form.Item>

          <Form.Item
            name="category"
            label="产品分类"
          >
             <Select mode="tags" placeholder="选择或输入新分类">
               <Option value="电子产品">电子产品</Option>
               <Option value="办公用品">办公用品</Option>
               <Option value="家具">家具</Option>
               <Option value="原材料">原材料</Option>
             </Select>
          </Form.Item>

          <Space style={{ display: 'flex', marginBottom: 8 }} align="start">
            <Form.Item
              name="price"
              label="销售单价"
              rules={[{ required: true, message: '请输入价格' }]}
            >
              <InputNumber 
                prefix="¥" 
                min={0} 
                step={0.01} 
                style={{ width: 160 }} 
              />
            </Form.Item>

            <Form.Item
              name="min_stock"
              label={
                <span>
                  预警库存 <Tooltip title="当总库存低于此数量时，系统会提示补货"><InfoCircleOutlined /></Tooltip>
                </span>
              }
              rules={[{ required: true }]}
            >
              <InputNumber min={0} style={{ width: 160 }} />
            </Form.Item>
          </Space>

          {!isEdit && (
             <Form.Item
               name="stock"
               label="初始库存"
               help="后续请在'库存管理'页面进行入库/出库操作"
             >
               <InputNumber min={0} style={{ width: '100%' }} disabled={isEdit} />
             </Form.Item>
          )}

          <Form.Item
            name="description"
            label="产品描述"
          >
            <Input.TextArea rows={3} placeholder="请输入规格、型号等详细信息..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* 动态槽位：页面底部 */}
      <div id="product-page-footer-slot"></div>
    </div>
  );
};

export default ProductManagement;