// erp-inventory-system-070225/frontend/src/components/Layout.jsx
import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Space, Typography, theme, Badge } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  AppstoreOutlined,
  UserOutlined,
  ShopOutlined,
  TagOutlined,
  DatabaseOutlined,
  AccountBookOutlined,
  LogoutOutlined,
  BellOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  
  const navigate = useNavigate();
  const location = useLocation();

  // 定义菜单项
  const menuItems = [
    {
      key: '/dashboard',
      icon: <AppstoreOutlined />,
      label: '仪表盘',
    },
    {
      key: '/customer',
      icon: <UserOutlined />,
      label: '客户管理',
    },
    {
      key: '/sales',
      icon: <ShopOutlined />,
      label: '销售跟进',
    },
    {
      key: '/product',
      icon: <TagOutlined />,
      label: '产品管理',
    },
    {
      key: '/inventory',
      icon: <DatabaseOutlined />,
      label: '库存管理',
    },
    {
      key: '/finance',
      icon: <AccountBookOutlined />,
      label: '费用收支',
    },
  ];

  // 处理菜单点击
  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  // 处理退出登录
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // 用户下拉菜单
  const userMenuJson = [
    {
      key: 'profile',
      label: '个人中心',
      icon: <UserOutlined />,
    },
    {
      key: 'settings',
      label: '系统设置',
      icon: <SettingOutlined />,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLogout
    },
  ];

  // 获取当前选中的菜单Key
  const getSelectedKey = () => {
    const path = location.pathname;
    // 简单的匹配逻辑，如果路径以菜单key开头则选中
    const activeItem = menuItems.find(item => path.startsWith(item.key));
    return activeItem ? [activeItem.key] : ['/dashboard'];
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        width={240}
        breakpoint="lg"
        onBreakpoint={(broken) => {
          if (broken) setCollapsed(true);
        }}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        <div className="logo-container" style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '0 16px',
          background: 'rgba(255,255,255,0.1)',
          margin: '16px',
          borderRadius: 6
        }}>
          {collapsed ? (
             <div style={{ 
               width: 32, height: 32, background: 'var(--color-accent)', 
               borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
               color: '#fff', fontWeight: 'bold'
             }}>
               E
             </div>
          ) : (
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 700, whiteSpace: 'nowrap' }}>
              ERP <span style={{ color: 'var(--color-accent)' }}>Pro</span>
            </Text>
          )}
        </div>
        
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKey()}
          onClick={handleMenuClick}
          items={menuItems}
          style={{ borderRight: 0 }}
        />

        {/* 动态槽位：侧边栏底部 */}
        <div id="layout-sider-bottom-slot" style={{ position: 'absolute', bottom: 16, width: '100%', padding: '0 16px' }}>
        </div>
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'all 0.2s' }}>
        <Header style={{ 
          padding: 0, 
          background: colorBgContainer,
          position: 'sticky',
          top: 0,
          zIndex: 99,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
             <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
                width: 64,
                height: 64,
              }}
            />
            <div id="layout-header-left-slot"></div>
          </div>

          <div style={{ paddingRight: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* 动态槽位：头部右侧 */}
            <div id="layout-header-right-slot"></div>
            
            <Badge count={5} size="small" offset={[0, 5]}>
               <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
            </Badge>

            <Dropdown menu={{ items: userMenuJson }} placement="bottomRight" arrow>
              <Space style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }} className="hover:bg-gray-100">
                <Avatar style={{ backgroundColor: 'var(--color-primary)' }} icon={<UserOutlined />} />
                <span style={{ fontWeight: 500 }}>Admin</span>
              </Space>
            </Dropdown>
          </div>
        </Header>

        <Content
          style={{
            margin: '24px 16px',
            padding: 0,
            minHeight: 280,
            overflow: 'initial'
          }}
        >
           {/* 动态槽位：内容顶部 */}
           <div id="layout-content-top-slot" style={{ marginBottom: 0 }}></div>
           
           {/* 路由出口 */}
           <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;