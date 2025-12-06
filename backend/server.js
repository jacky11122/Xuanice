const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const bcrypt = require('bcrypt');
const { db, initDatabase } = require('./models/database');

// 配置日志
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

const app = express();

// 全局异常捕获
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 中间件配置
app.use(helmet({
  contentSecurityPolicy: false,
  frameguard: false
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态资源配置
const publicDir = path.resolve(__dirname, '../frontend/public');
const distDir = path.resolve(__dirname, '../frontend/dist');
// 优先使用 public，如果不存在则尝试 dist (构建后)
const publicPath = fs.existsSync(publicDir) ? publicDir : (fs.existsSync(distDir) ? distDir : null);

if (publicPath) {
  app.use(express.static(publicPath));
  logger.info(`Serving static files from: ${publicPath}`);
} else {
  logger.warn('No static files directory found (checked ../frontend/public and ../frontend/dist)');
}

// 初始化数据库
initDatabase();

// -------------------- 业务 API 路由 --------------------

// 统一响应辅助函数
const sendResponse = (res, err, data, msg = 'Operation successful') => {
  if (err) {
    logger.error(`API Error: ${err.message}`);
    return res.status(500).json({ error: msg, details: err.message });
  }
  res.json(data);
};

// 1. 客户管理 & 产品管理 (引用独立路由文件)
// 检查文件是否存在以避免启动报错，实际项目中应确保文件存在
const customersRoutePath = path.join(__dirname, 'routes/customers.js');
const productsRoutePath = path.join(__dirname, 'routes/products.js');

if (fs.existsSync(customersRoutePath)) {
  app.use('/api/customers', require('./routes/customers'));
} else {
  logger.warn('routes/customers.js not found, /api/customers unavailable');
}

if (fs.existsSync(productsRoutePath)) {
  app.use('/api/products', require('./routes/products'));
} else {
  logger.warn('routes/products.js not found, /api/products unavailable');
}

// 2. 销售管理 (内联实现，极简模式)
const salesRouter = express.Router();
salesRouter.get('/', (req, res) => {
  const sql = `
    SELECT s.*, c.name as customer_name 
    FROM sales s 
    LEFT JOIN customers c ON s.customer_id = c.id 
    ORDER BY s.created_at DESC`;
  db.all(sql, [], (err, rows) => sendResponse(res, err, rows));
});
salesRouter.post('/', (req, res) => {
  const { customer_id, content, amount, follow_up_date, status } = req.body;
  const sql = `INSERT INTO sales (customer_id, content, amount, follow_up_date, status) VALUES (?, ?, ?, ?, ?)`;
  db.run(sql, [customer_id, content, amount || 0, follow_up_date, status || 'pending'], function(err) {
    if (err) return sendResponse(res, err, null, 'Create sale failed');
    res.status(201).json({ id: this.lastID, ...req.body });
  });
});
app.use('/api/sales', salesRouter);

// 3. 采购管理 (内联实现)
const purchasesRouter = express.Router();
purchasesRouter.get('/', (req, res) => {
  const sql = `
    SELECT p.*, s.name as supplier_name, prod.name as product_name 
    FROM purchases p 
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    LEFT JOIN products prod ON p.product_id = prod.id
    ORDER BY p.date DESC`;
  db.all(sql, [], (err, rows) => sendResponse(res, err, rows));
});
purchasesRouter.post('/', (req, res) => {
  const { supplier_id, product_id, quantity, price } = req.body;
  const sql = `INSERT INTO purchases (supplier_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`;
  db.run(sql, [supplier_id, product_id, quantity, price], function(err) {
    if (err) return sendResponse(res, err, null, 'Create purchase failed');
    // 自动增加库存
    db.run(`UPDATE products SET stock = stock + ? WHERE id = ?`, [quantity, product_id]);
    res.status(201).json({ id: this.lastID, ...req.body });
  });
});
app.use('/api/purchases', purchasesRouter);

// 4. 财务收支 (内联实现)
const financeRouter = express.Router();
financeRouter.get('/', (req, res) => {
  const { type } = req.query;
  let sql = 'SELECT * FROM finance WHERE 1=1';
  const params = [];
  if (type) { sql += ' AND type = ?'; params.push(type); }
  db.all(`${sql} ORDER BY date DESC`, params, (err, rows) => sendResponse(res, err, rows));
});
financeRouter.post('/', (req, res) => {
  const { type, amount, category, description } = req.body;
  const sql = `INSERT INTO finance (type, amount, category, description) VALUES (?, ?, ?, ?)`;
  db.run(sql, [type, amount, category, description], function(err) {
    if (err) return sendResponse(res, err, null, 'Record finance failed');
    res.status(201).json({ id: this.lastID, ...req.body });
  });
});
// 财务统计接口
financeRouter.get('/stats', (req, res) => {
  const sql = `SELECT type, SUM(amount) as total FROM finance GROUP BY type`;
  db.all(sql, [], (err, rows) => sendResponse(res, err, rows));
});
app.use('/api/finances', financeRouter);

// 5. 库存管理 (内联实现 - 分仓库存)
const inventoryRouter = express.Router();
inventoryRouter.get('/', (req, res) => {
  const sql = `
    SELECT i.*, p.name as product_name 
    FROM inventory i 
    JOIN products p ON i.product_id = p.id 
    ORDER BY i.updated_at DESC`;
  db.all(sql, [], (err, rows) => sendResponse(res, err, rows));
});
inventoryRouter.post('/', (req, res) => {
  const { product_id, quantity, location } = req.body;
  // 简单起见，直接插入或更新
  db.get('SELECT id FROM inventory WHERE product_id = ? AND location = ?', [product_id, location], (err, row) => {
    if (err) return sendResponse(res, err, null, 'Check inventory failed');
    if (row) {
      db.run('UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [quantity, row.id], function(err) {
        sendResponse(res, err, { message: 'Inventory updated' });
      });
    } else {
      db.run('INSERT INTO inventory (product_id, quantity, location) VALUES (?, ?, ?)', [product_id, quantity, location], function(err) {
        sendResponse(res, err, { id: this.lastID, message: 'Inventory created' });
      });
    }
  });
});
app.use('/api/inventory', inventoryRouter);

// 6. 供应商管理 (内联实现)
const suppliersRouter = express.Router();
suppliersRouter.get('/', (req, res) => db.all('SELECT * FROM suppliers', [], (err, rows) => sendResponse(res, err, rows)));
suppliersRouter.post('/', (req, res) => {
  const { name, contact, phone, address } = req.body;
  db.run('INSERT INTO suppliers (name, contact, phone, address) VALUES (?, ?, ?, ?)', [name, contact, phone, address], function(err) {
    if (err) return sendResponse(res, err, null, 'Add supplier failed');
    res.status(201).json({ id: this.lastID, ...req.body });
  });
});
app.use('/api/suppliers', suppliersRouter);

// 7. 权限/用户认证 (内联实现)
const authRouter = express.Router();
authRouter.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).json({ error: 'Internal error' });
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // 简单返回用户信息，实际应用应使用 JWT
    res.json({ 
      id: user.id, 
      username: user.username, 
      role: user.role,
      token: `mock-jwt-token-${user.id}-${Date.now()}` 
    });
  });
});
// 获取当前用户信息 (Mock)
authRouter.get('/me', (req, res) => {
  // 实际应解析 Token，此处简化
  res.json({ username: 'admin', role: 'admin' });
});
app.use('/api/auth', authRouter);

// -------------------- 前端路由托管 --------------------

app.get('*', (req, res) => {
  if (!publicPath) return res.status(404).send('Frontend not build or path incorrect');
  
  const filePath = path.join(publicPath, req.path);
  if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
    res.sendFile(filePath);
  } else {
    // SPA 路由支持：返回 index.html
    const indexPath = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('index.html not found');
    }
  }
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});