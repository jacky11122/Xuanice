// erp-inventory-system-070225/frontend/src/pages/FinanceManagement.jsx
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Tag, Modal, Form, Input, Select, InputNumber, DatePicker, message, Radio } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';
import DataTable from '../components/DataTable';

const FinanceManagement = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ income: 0, expense: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [filterType, setFilterType] = useState('all');

  // 获取财务数据和统计
  const fetchData = async (type = '') => {
    setLoading(true);
    try {
      const url = type && type !== 'all' ? `/api/finances?type=${type}` : '/api/finances';
      const [listRes, statsRes] = await Promise.all([
        axios.get(url),
        axios.get('/api/finances/stats')
      ]);
      
      setData(listRes.data);
      
      // 处理统计数据
      const statsData = { income: 0, expense: 0 };
      if (Array.isArray(statsRes.data)) {
        statsRes.data.forEach(item => {
          if (item.type === 'income') statsData.income = item.total || 0;
          if (item.type === 'expense') statsData.expense = item.total || 0;
        });
      }
      setStats(statsData);
    } catch (error) {
      console.error('Fetch finance data failed:', error);
      message.error('获取财务数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(filterType);
  }, [filterType]);

  // 表格列定义
  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => (
        <Tag color={type === 'income' ? 'success' : 'error'}>
          {type === 'income' ? '收入' : '支出'}
        </Tag>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      sorter: (a, b) => a.amount - b.amount,
      render: (val, record) => (
        <span style={{ color: record.type === 'income' ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>
          {record.type === 'expense' ? '-' : '+'}{Number(val).toFixed(2)}
        </span>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (val) => dayjs(val).format('YYYY-MM-DD HH:mm'),
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
    },
  ];

  // 提交新记录
  const handleCreate = async (values) => {
    try {
      await axios.post('/api/finances', {
        ...values,
        date: values.date ? values.date.format('YYYY-MM-DD HH:mm:ss') : dayjs().format('YYYY-MM-DD HH:mm:ss')
      });
      message.success('记录已添加');
      setIsModalOpen(false);
      form.resetFields();
      fetchData(filterType);
    } catch (error) {
      message.error('添加失败');
    }
  };

  // 自定义插槽内容
  const ActionSlot = (
    <Radio.Group 
      value={filterType} 
      onChange={e => setFilterType(e.target.value)} 
      buttonStyle="solid"
    >
      <Radio.Button value="all">全部</Radio.Button>
      <Radio.Button value="income">收入</Radio.Button>
      <Radio.Button value="expense">支出</Radio.Button>
    </Radio.Group>
  );

  const netProfit = stats.income - stats.expense;

  return (
    <div className="page-finance">
      {/* 统计卡片区域 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card bordered={false} className="content-card" bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title="总收入"
              value={stats.income}
              precision={2}
              valueStyle={{ color: '#3f8600' }}
              prefix={<ArrowUpOutlined />}
              suffix="¥"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} className="content-card" bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title="总支出"
              value={stats.expense}
              precision={2}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ArrowDownOutlined />}
              suffix="¥"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} className="content-card" bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title="净利润"
              value={netProfit}
              precision={2}
              valueStyle={{ color: netProfit >= 0 ? 'var(--color-accent)' : '#cf1322' }}
              prefix={<DollarOutlined />}
              suffix="¥"
            />
          </Card>
        </Col>
      </Row>

      {/* 数据表格 */}
      <DataTable
        title="财务明细表"
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        onAdd={() => setIsModalOpen(true)}
        onRefresh={() => fetchData(filterType)}
        actionSlot={ActionSlot}
        exportFileName="财务收支报表"
        pagination={{ pageSize: 10 }}
      />

      {/* 新增记录模态框 */}
      <Modal
        title="新增收支记录"
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{ type: 'expense', date: dayjs() }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="收支类型" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="income">收入</Select.Option>
                  <Select.Option value="expense">支出</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="amount" label="金额" rules={[{ required: true, message: '请输入金额' }]}>
                <InputNumber 
                  style={{ width: '100%' }} 
                  prefix="¥" 
                  min={0} 
                  step={0.01} 
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
             <Col span={12}>
               <Form.Item name="category" label="分类" rules={[{ required: true }]}>
                <Select allowClear mode="tags" placeholder="选择或输入分类">
                  <Select.Option value="销售回款">销售回款</Select.Option>
                  <Select.Option value="采购支出">采购支出</Select.Option>
                  <Select.Option value="日常运营">日常运营</Select.Option>
                  <Select.Option value="员工工资">员工工资</Select.Option>
                  <Select.Option value="其他">其他</Select.Option>
                </Select>
              </Form.Item>
             </Col>
             <Col span={12}>
               <Form.Item name="date" label="日期" rules={[{ required: true }]}>
                 <DatePicker showTime style={{ width: '100%' }} />
               </Form.Item>
             </Col>
          </Row>

          <Form.Item name="description" label="描述说明">
            <Input.TextArea rows={3} placeholder="请输入具体款项说明..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* 动态内容槽位 */}
      <div id="finance-page-slot"></div>
    </div>
  );
};

export default FinanceManagement;