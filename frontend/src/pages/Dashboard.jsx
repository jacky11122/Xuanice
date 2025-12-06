// erp-inventory-system-070225/frontend/src/pages/Dashboard.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Row, Col, Card, Statistic, List, Avatar, Tag, Typography, Spin, Space } from 'antd';
import { 
  ShoppingOutlined, 
  UserOutlined, 
  AccountBookOutlined, 
  WarningOutlined, 
  ArrowUpOutlined, 
  ArrowDownOutlined,
  RightOutlined
} from '@ant-design/icons';
import Chart from 'chart.js/auto';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalCustomers: 0,
    lowStockCount: 0,
    netProfit: 0
  });
  const [recentSales, setRecentSales] = useState([]);
  
  // 图表引用
  const salesChartRef = useRef(null);
  const salesChartInstance = useRef(null);
  const financeChartRef = useRef(null);
  const financeChartInstance = useRef(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [salesRes, customersRes, productsRes, financeRes] = await Promise.all([
          axios.get('/api/sales'),
          axios.get('/api/customers/all'), // 获取所有客户用于计数
          axios.get('/api/products?stock_min=true'), // 获取低库存产品
          axios.get('/api/finances')
        ]);

        // 1. 处理销售数据
        const salesData = salesRes.data || [];
        const totalSales = salesData
          .filter(s => s.status === 'completed')
          .reduce((sum, item) => sum + (item.amount || 0), 0);
        
        // 最近5条销售记录
        const recent = salesData
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5);
        setRecentSales(recent);

        // 2. 处理客户数据
        const totalCustomers = customersRes.data ? customersRes.data.length : 0;

        // 3. 处理库存预警
        const lowStockCount = productsRes.data ? productsRes.data.length : 0;

        // 4. 处理财务数据
        const financeData = financeRes.data || [];
        let income = 0;
        let expense = 0;
        financeData.forEach(f => {
          if (f.type === 'income') income += f.amount || 0;
          if (f.type === 'expense') expense += f.amount || 0;
        });
        const netProfit = income - expense;

        setSummary({
          totalSales,
          totalCustomers,
          lowStockCount,
          netProfit
        });

        // 渲染图表
        renderSalesChart(salesData);
        renderFinanceChart(income, expense);

      } catch (error) {
        console.error('Dashboard data fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // 清理图表实例
    return () => {
      if (salesChartInstance.current) salesChartInstance.current.destroy();
      if (financeChartInstance.current) financeChartInstance.current.destroy();
    };
  }, []);

  // 渲染销售趋势图
  const renderSalesChart = (salesData) => {
    if (!salesChartRef.current) return;
    if (salesChartInstance.current) salesChartInstance.current.destroy();

    // 按日期聚合销售额 (最近7天)
    const last7Days = {};
    for (let i = 6; i >= 0; i--) {
      const dateStr = dayjs().subtract(i, 'day').format('MM-DD');
      last7Days[dateStr] = 0;
    }

    salesData.forEach(item => {
      if (item.status === 'completed') {
        const dateStr = dayjs(item.created_at).format('MM-DD');
        if (last7Days[dateStr] !== undefined) {
          last7Days[dateStr] += item.amount || 0;
        }
      }
    });

    const ctx = salesChartRef.current.getContext('2d');
    salesChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Object.keys(last7Days),
        datasets: [{
          label: '近7日销售额 (元)',
          data: Object.values(last7Days),
          borderColor: '#3E2723',
          backgroundColor: 'rgba(62, 39, 35, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#C5A065',
          pointBorderColor: '#fff',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(62, 39, 35, 0.9)',
            titleColor: '#C5A065'
          }
        },
        scales: {
          y: { 
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.05)' }
          },
          x: { 
            grid: { display: false }
          }
        }
      }
    });
  };

  // 渲染收支对比饼图
  const renderFinanceChart = (income, expense) => {
    if (!financeChartRef.current) return;
    if (financeChartInstance.current) financeChartInstance.current.destroy();

    const ctx = financeChartRef.current.getContext('2d');
    financeChartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['总收入', '总支出'],
        datasets: [{
          data: [income, expense],
          backgroundColor: ['#52c41a', '#ff4d4f'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
        }
      }
    });
  };

  const StatCard = ({ title, value, prefix, suffix, color, loading }) => (
    <Card bordered={false} className="content-card" bodyStyle={{ padding: '20px 24px' }}>
      <Statistic
        title={<span style={{ color: 'var(--color-text-secondary)' }}>{title}</span>}
        value={value}
        precision={2}
        valueStyle={{ color: color || 'var(--color-text-primary)', fontWeight: 600 }}
        prefix={prefix}
        suffix={<span style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginLeft: 4 }}>{suffix}</span>}
        loading={loading}
      />
    </Card>
  );

  return (
    <div className="page-dashboard animate-fade-in">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* 顶部动态插槽 */}
        <div id="dashboard-top-slot"></div>

        {/* 核心指标区域 */}
        <Row gutter={24}>
          <Col xs={24} sm={12} lg={6}>
            <StatCard 
              title="累计销售总额" 
              value={summary.totalSales} 
              prefix={<ShoppingOutlined style={{ color: '#C5A065' }} />}
              suffix="元"
              loading={loading}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard 
              title="合作客户总数" 
              value={summary.totalCustomers} 
              precision={0}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
              suffix="位"
              loading={loading}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard 
              title="当前净利润" 
              value={summary.netProfit} 
              prefix={<AccountBookOutlined style={{ color: summary.netProfit >= 0 ? '#52c41a' : '#ff4d4f' }} />}
              color={summary.netProfit >= 0 ? '#52c41a' : '#ff4d4f'}
              suffix="元"
              loading={loading}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard 
              title="库存预警商品" 
              value={summary.lowStockCount} 
              precision={0}
              prefix={<WarningOutlined style={{ color: '#faad14' }} />}
              color="#faad14"
              suffix="种"
              loading={loading}
            />
          </Col>
        </Row>

        {/* 图表区域 */}
        <Row gutter={24}>
          <Col xs={24} lg={16}>
            <Card 
              title="近7日销售趋势" 
              bordered={false} 
              className="content-card"
              bodyStyle={{ height: 320, padding: 24 }}
            >
              {loading ? <Spin /> : <canvas ref={salesChartRef} />}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card 
              title="收支构成概览" 
              bordered={false} 
              className="content-card"
              bodyStyle={{ height: 320, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {loading ? <Spin /> : <canvas ref={financeChartRef} />}
            </Card>
          </Col>
        </Row>

        {/* 底部详情区域 */}
        <Row gutter={24}>
          <Col xs={24} lg={12}>
            <Card 
              title="最新销售动态" 
              bordered={false} 
              className="content-card"
              extra={<a href="#/sales" style={{ color: 'var(--color-primary)' }}>查看全部 <RightOutlined /></a>}
            >
              <List
                loading={loading}
                itemLayout="horizontal"
                dataSource={recentSales}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          style={{ backgroundColor: item.status === 'completed' ? '#f6ffed' : '#fffbe6' }} 
                          icon={item.status === 'completed' ? <ArrowUpOutlined style={{ color: '#52c41a' }} /> : <ShoppingOutlined style={{ color: '#faad14' }} />} 
                        />
                      }
                      title={<Text strong>{item.customer_name || '未知客户'}</Text>}
                      description={dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}
                    />
                    <div style={{ textAlign: 'right' }}>
                      <Text strong style={{ display: 'block', color: 'var(--color-primary)' }}>¥{item.amount}</Text>
                      <Tag color={item.status === 'completed' ? 'success' : 'processing'}>
                        {item.status === 'completed' ? '成交' : '跟进中'}
                      </Tag>
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
             {/* 动态插槽：可用于放置公告或系统日志 */}
             <div id="dashboard-bottom-right-slot">
                <Card title="系统信息" bordered={false} className="content-card">
                   <Space direction="vertical" style={{ width: '100%' }}>
                      <Row justify="space-between">
                        <Text type="secondary">系统版本</Text>
                        <Text strong>ERP Pro v1.0.0</Text>
                      </Row>
                      <Row justify="space-between">
                        <Text type="secondary">当前用户</Text>
                        <Text>管理员 (Admin)</Text>
                      </Row>
                      <Row justify="space-between">
                        <Text type="secondary">数据库状态</Text>
                        <Tag color="success">运行中</Tag>
                      </Row>
                      <Row justify="space-between">
                        <Text type="secondary">技术支持</Text>
                        <Text>HAISNAP Dev Team</Text>
                      </Row>
                   </Space>
                </Card>
             </div>
          </Col>
        </Row>

      </Space>
    </div>
  );
};

export default Dashboard;