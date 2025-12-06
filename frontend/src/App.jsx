// erp-inventory-system-070225/frontend/src/App.jsx
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp, Card, Form, Input, Button, Tabs, Typography, message, theme } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined, UserAddOutlined } from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import axios from 'axios';

// 导入页面组件
import MainLayout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CustomerManagement from './pages/CustomerManagement';
import SalesManagement from './pages/SalesManagement';
import ProductManagement from './pages/ProductManagement';
import InventoryManagement from './pages/InventoryManagement';
import FinanceManagement from './pages/FinanceManagement';

// 导入全局样式
import './styles/global.css';

const { Title, Text } = Typography;

/**
 * 登录/注册页面组件
 * 包含简单的身份验证逻辑UI
 */
const LoginPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // 处理登录提交
  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', values);
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify({ username: res.data.username, role: res.data.role }));
        message.success('登录成功');
        navigate('/dashboard');
      }
    } catch (error) {
      message.error(error.response?.data?.error || '登录失败，请检查用户名密码');
    } finally {
      setLoading(false);
    }
  };

  // 处理注册提交 (模拟)
  const handleRegister = (values) => {
    setLoading(true);
    // 模拟注册请求延迟
    setTimeout(() => {
        message.info('系统暂不开放自助注册，请联系管理员获取账号 (Demo: admin/123456)');
        setLoading(false);
    }, 1000);
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      background: 'linear-gradient(135deg, #3E2723 0%, #1B0000 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 装饰背景元素 */}
      <div style={{ position: 'absolute', width: 600, height: 600, background: '#C5A065', opacity: 0.1, borderRadius: '50%', top: -200, left: -200, filter: 'blur(80px)' }}></div>
      <div style={{ position: 'absolute', width: 400, height: 400, background: '#6D4C41', opacity: 0.15, borderRadius: '50%', bottom: -100, right: -100, filter: 'blur(60px)' }}></div>

      <Card 
        bordered={false} 
        style={{ width: 420, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(10px)' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ color: '#3E2723', marginBottom: 8, marginTop: 16 }}>ERP <span style={{ color: '#C5A065' }}>Pro</span></Title>
          <Text type="secondary">企业级进销存管理系统</Text>
        </div>

        <Tabs
          defaultActiveKey="login"
          centered
          items={[
            {
              key: 'login',
              label: <span><LoginOutlined /> 登录</span>,
              children: (
                <Form layout="vertical" onFinish={handleLogin} initialValues={{ username: 'admin', password: '' }} size="large">
                  <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                    <Input prefix={<UserOutlined />} placeholder="用户名" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading} style={{ background: '#3E2723', borderColor: '#3E2723', height: 40 }}>
                      立即登录
                    </Button>
                  </Form.Item>
                  {/* 动态槽位：登录表单底部 */}
                  <div id="login-form-bottom-slot"></div>
                </Form>
              )
            },
            {
              key: 'register',
              label: <span><UserAddOutlined /> 注册</span>,
              children: (
                <Form layout="vertical" onFinish={handleRegister} size="large">
                  <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                    <Input prefix={<UserOutlined />} placeholder="设置用户名" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="设置密码" />
                  </Form.Item>
                  <Form.Item name="confirm" dependencies={['password']} rules={[
                    { required: true, message: '请确认密码' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) return Promise.resolve();
                        return Promise.reject(new Error('两次输入的密码不一致'));
                      },
                    }),
                  ]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
                  </Form.Item>
                  <Form.Item>
                    <Button block loading={loading} htmlType="submit" style={{ height: 40 }}>
                      提交注册申请
                    </Button>
                  </Form.Item>
                </Form>
              )
            }
          ]}
        />
        
        <div style={{ textAlign: 'center', marginTop: 24, paddingBottom: 8 }}>
           <Text type="secondary" style={{ fontSize: 12 }}>© 2025 HAISNAP ERP System | By HAISNAP</Text>
        </div>
      </Card>
      
      {/* 动态槽位：Login页面 */}
      <div id="login-page-slot" style={{ position: 'absolute', bottom: 20 }}></div>
    </div>
  );
};

/**
 * 路由守卫组件
 * 检查是否存在Token，否则重定向到登录页
 */
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

/**
 * 主应用组件
 */
const App = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#3E2723', // 主品牌色：深可可
          colorLink: '#C5A065',    // 链接色：商务金
          borderRadius: 6,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        },
        components: {
          Layout: {
            colorBgHeader: '#ffffff',
            colorBgBody: '#F9F7F2', 
          },
          Table: {
            headerBg: '#F5F2EE',
            headerColor: '#5D4037',
          },
          Button: {
            controlHeight: 36
          }
        }
      }}
    >
      <AntdApp>
        <HashRouter>
          <Routes>
            {/* 公开路由 */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* 受保护路由 */}
            <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="customer" element={<CustomerManagement />} />
              <Route path="sales" element={<SalesManagement />} />
              <Route path="product" element={<ProductManagement />} />
              <Route path="inventory" element={<InventoryManagement />} />
              <Route path="finance" element={<FinanceManagement />} />
              
              {/* 动态路由槽位: 允许后续扩展其他页面 */}
              <Route path="ext/*" element={<div id="router-extension-slot"></div>} />
            </Route>
            
            {/* 404处理 */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </HashRouter>
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;