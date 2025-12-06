// erp-inventory-system-070225/frontend/src/pages/CustomerManagement.jsx
import React, { useState, useEffect } from 'react';
import { Space, Button, Modal, Form, Input, message, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, UserOutlined, PhoneOutlined, MailOutlined, HomeOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import DataTable from '../components/DataTable';

const CustomerManagement = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  // 获取客户列表
  const fetchData = async (page = 1, size = 10, search = '') => {
    setLoading(true);
    try {
      const params = { page, pageSize: size };
      if (search) params.search = search;
      
      const res = await axios.get('/api/customers', { params });
      
      if (res.data && res.data.data) {
        setData(res.data.data);
        setPagination({
            ...pagination,
            current: res.data.pagination.current,
            total: res.data.pagination.total
        });
      } else {
        setData(Array.isArray(res.data) ? res.data : []);
      }
    } catch (error) {
      console.error('Fetch customers failed:', error);
      message.error('获取客户数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(pagination.current, pagination.pageSize, searchText);
  }, []);

  // 表格变更（分页）
  const handleTableChange = (newPagination) => {
    setPagination({ ...pagination, current: newPagination.current });
    fetchData(newPagination.current, pagination.pageSize, searchText);
  };

  // 搜索处理
  const handleSearch = (value) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 }); // 重置到第一页
    fetchData(1, pagination.pageSize, value);
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
    }
    setIsModalOpen(true);
  };

  // 提交表单
  const handleSave = async (values) => {
    try {
      if (isEdit) {
        await axios.put(`/api/customers/${currentId}`, values);
        message.success('客户信息已更新');
      } else {
        await axios.post('/api/customers', values);
        message.success('新客户已添加');
      }
      setIsModalOpen(false);
      form.resetFields();
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch (error) {
      console.error('Save customer failed:', error);
      message.error(isEdit ? '更新失败' : '添加失败');
    }
  };

  // 删除客户
  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/customers/${id}`);
      message.success('客户已删除');
      if (data.length === 1 && pagination.current > 1) {
          const newPage = pagination.current - 1;
          setPagination({ ...pagination, current: newPage });
          fetchData(newPage, pagination.pageSize, searchText);
      } else {
          fetchData(pagination.current, pagination.pageSize, searchText);
      }
    } catch (error) {
      console.error('Delete customer failed:', error);
      message.error('删除失败，可能存在关联数据');
    }
  };

  // 批量导入处理
  const handleImport = async (importedData) => {
    if (!importedData || importedData.length === 0) return;
    
    // 简单的数据清洗映射
    const cleanData = importedData.map(item => ({
        name: item['客户名称'] || item['姓名'] || item['name'],
        phone: item['电话'] || item['手机'] || item['phone'],
        email: item['邮箱'] || item['Email'] || item['email'],
        address: item['地址'] || item['address']
    })).filter(item => item.name); 

    if (cleanData.length === 0) {
        message.warning('未识别到有效的客户数据，请检查Excel列名');
        return;
    }

    try {
        const hide = message.loading(`正在导入 ${cleanData.length} 条数据...`, 0);
        const res = await axios.post('/api/customers/batch', cleanData);
        hide();
        message.success(res.data.message || '导入完成');
        fetchData(1, pagination.pageSize, '');
    } catch (error) {
        console.error('Import failed:', error);
        message.error('批量导入失败');
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '客户名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <Space>
           <UserOutlined style={{ color: 'var(--color-primary)' }} />
           <span style={{ fontWeight: 500 }}>{text}</span>
        </Space>
      )
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone',
      render: (text) => text ? <Space><PhoneOutlined style={{ color: '#999' }} />{text}</Space> : '-'
    },
    {
      title: '电子邮箱',
      dataIndex: 'email',
      key: 'email',
      responsive: ['md'], 
      render: (text) => text ? <Space><MailOutlined style={{ color: '#999' }} />{text}</Space> : '-'
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      responsive: ['lg'], 
      render: (text) => text ? <Space><HomeOutlined style={{ color: '#999' }} />{text}</Space> : '-'
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (val) => dayjs(val).format('YYYY-MM-DD'),
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
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
            title="确定要删除此客户吗?"
            description="删除后无法恢复，且会清除相关的历史记录。"
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
    <div className="page-customer-management">
      {/* 动态插槽：页面顶部 */ }
      <div id="customer-page-top-slot" style={{ marginBottom: 16 }}></div>

      <DataTable
        title="客户信息列表"
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        onAdd={() => handleOpenModal()}
        onRefresh={() => fetchData(pagination.current, pagination.pageSize, searchText)}
        onSearch={handleSearch}
        onImport={handleImport}
        onChange={handleTableChange}
        pagination={pagination}
        exportFileName="客户信息表"
        searchPlaceholder="搜索姓名、电话或邮箱..."
      />

      {/* 新增/编辑模态框 */ }
      <Modal
        title={isEdit ? "编辑客户信息" : "新增客户"}
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsModalOpen(false)}
        destroyOnClose
        forceRender
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="name"
            label="客户名称"
            rules={[{ required: true, message: '请输入客户名称' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="请输入客户姓名或企业名称" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="联系电话"
            rules={[
                { required: true, message: '请输入联系电话' },
                { pattern: /^[0-9-\s]+$/, message: '请输入有效的电话号码' }
            ]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="手机或座机号码" />
          </Form.Item>

          <Form.Item
            name="email"
            label="电子邮箱"
            rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="example@domain.com" />
          </Form.Item>

          <Form.Item
            name="address"
            label="详细地址"
          >
            <Input.TextArea 
                rows={2} 
                placeholder="请输入办公或收货地址" 
                showCount 
                maxLength={200}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 动态插槽：页面底部 */ }
      <div id="customer-page-footer-slot"></div>
    </div>
  );
};

export default CustomerManagement;