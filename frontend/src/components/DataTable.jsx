import React, { useState } from 'react';
import { Table, Button, Input, Space, Tooltip, Upload, message, Row, Col, Typography } from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  DownloadOutlined, 
  PrinterOutlined, 
  UploadOutlined, 
  ReloadOutlined 
} from '@ant-design/icons';
import * as XLSX from 'xlsx';

const { Title } = Typography;

/**
 * 通用数据表格组件
 * 支持：展示、搜索、分页、Excel导入导出、打印
 */
const DataTable = ({
  title,              // 表格标题
  columns,            // 列定义
  dataSource,         // 数据源
  loading,            // 加载状态
  rowKey = "id",      // 唯一键
  onAdd,              // 添加按钮回调
  onRefresh,          // 刷新按钮回调
  onSearch,           // 搜索回调 (value) => void
  pagination,         // 分页配置
  onChange,           // 表格变更回调
  actionSlot,         // 额外操作按钮插槽
  exportFileName = "DataExport", // 导出文件名
  onImport,           // 导入回调 (jsonData) => void
  hideAdd = false,    // 隐藏添加按钮
  hideExport = false, // 隐藏导出按钮
  hideImport = false, // 隐藏导入按钮
  hidePrint = false,  // 隐藏打印按钮
  hideSearch = false, // 隐藏搜索框
  searchPlaceholder = "搜索...",
  scroll = { x: 'max-content' } // 表格滚动配置
}) => {
  const [searchText, setSearchText] = useState('');

  // 处理搜索
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchText(value);
    if (onSearch) onSearch(value);
  };

  // 处理Excel导出
  const handleExport = () => {
    if (!dataSource || dataSource.length === 0) {
      message.warning('暂无数据可导出');
      return;
    }
    // 过滤掉React节点等非文本数据，仅导出简单数据
    const exportData = dataSource.map(item => {
      const row = {};
      columns.forEach(col => {
        if (col.dataIndex && col.title && typeof col.render !== 'function') {
           // 优先使用dataIndex对应的值
           row[col.title] = item[col.dataIndex];
        } else if (col.key && col.title && !col.render) {
           row[col.title] = item[col.key];
        }
      });
      return Object.keys(row).length > 0 ? row : item; // 兜底
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${exportFileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 处理Excel导入
  const handleImportFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bstr = e.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        if (onImport) {
            onImport(data);
        } else {
            message.info(`解析到 ${data.length} 条数据，但未配置导入处理函数`);
        }
      } catch (error) {
        message.error('文件解析失败，请检查格式');
        console.error(error);
      }
    };
    reader.readAsBinaryString(file);
    return false; // 阻止默认上传
  };

  // 处理打印
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="content-card animate-fade-in">
      {/* 顶部操作栏 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }} className="no-print">
        <Col>
          <Space size="middle">
            {title && <Title level={4} style={{ margin: 0, color: 'var(--color-primary)' }}>{title}</Title>}
            {!hideSearch && (
              <Input
                placeholder={searchPlaceholder}
                prefix={<SearchOutlined style={{ color: 'var(--color-text-placeholder)' }} />}
                value={searchText}
                onChange={handleSearch}
                style={{ width: 240, borderRadius: 'var(--radius-base)' }}
                allowClear
              />
            )}
            {/* 动态插槽：左侧额外内容 */}
            <div id="datatable-left-slot"></div> 
          </Space>
        </Col>
        
        <Col>
          <Space>
            {actionSlot}
            
            {!hideImport && (
              <Upload beforeUpload={handleImportFile} showUploadList={false} accept=".xlsx,.xls">
                <Tooltip title="导入Excel">
                  <Button icon={<UploadOutlined />} />
                </Tooltip>
              </Upload>
            )}
            
            {!hideExport && (
              <Tooltip title="导出Excel">
                <Button icon={<DownloadOutlined />} onClick={handleExport} />
              </Tooltip>
            )}
            
            {!hidePrint && (
              <Tooltip title="打印表格">
                <Button icon={<PrinterOutlined />} onClick={handlePrint} />
              </Tooltip>
            )}

            {onRefresh && (
              <Tooltip title="刷新">
                <Button icon={<ReloadOutlined />} onClick={onRefresh} />
              </Tooltip>
            )}

            {!hideAdd && (
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={onAdd}
                style={{ marginLeft: 8 }}
              >
                新增
              </Button>
            )}
          </Space>
        </Col>
      </Row>

      {/* 数据表格 */}
      <Table
        rowKey={rowKey}
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        pagination={pagination}
        onChange={onChange}
        scroll={scroll}
        size="middle"
        bordered={false}
        rowClassName={(record, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
      />
      
      {/* 动态插槽：底部额外内容 */}
      <div id="datatable-footer-slot"></div>
    </div>
  );
};

export default DataTable;