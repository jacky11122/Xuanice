// erp-inventory-system-070225/frontend/src/index.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 获取根节点
const container = document.getElementById('root');

// 创建 React 18 根实例
const root = ReactDOM.createRoot(container);

// 渲染应用
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 动态槽位：全局初始化脚本注入点
if (window.HAISNAP_INIT_CALLBACK) {
  window.HAISNAP_INIT_CALLBACK();
}