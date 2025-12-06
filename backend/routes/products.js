const express = require('express');
const router = express.Router();
const { db } = require('../models/database');

// 统一错误处理辅助函数
const handleError = (res, err, msg = 'Database operation failed') => {
    console.error(`[Products Error] ${msg}:`, err.message);
    res.status(500).json({ error: msg, details: err.message });
};

// 获取产品列表 (支持筛选：分类、低库存预警、搜索)
router.get('/', (req, res) => {
    const { category, stock_min, search } = req.query;
    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (stock_min === 'true') { sql += ' AND stock <= min_stock'; }
    if (search) {
        sql += ' AND (name LIKE ? OR description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    db.all(`${sql} ORDER BY created_at DESC`, params, (err, rows) => {
        if (err) return handleError(res, err, 'Fetch products failed');
        res.json(rows);
    });
});

// 添加新产品
router.post('/', (req, res) => {
    const { name, category, price, stock, min_stock, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Product name is required' });

    const sql = `INSERT INTO products (name, category, price, stock, min_stock, description) VALUES (?, ?, ?, ?, ?, ?)`;
    const params = [name, category, price || 0, stock || 0, min_stock || 10, description || ''];

    db.run(sql, params, function(err) {
        if (err) return handleError(res, err, 'Create product failed');
        res.status(201).json({ id: this.lastID, ...req.body });
    });
});

// 获取产品详情
router.get('/:id', (req, res) => {
    db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return handleError(res, err);
        if (!row) return res.status(404).json({ error: 'Product not found' });
        res.json(row);
    });
});

// 更新产品信息
router.put('/:id', (req, res) => {
    const { name, category, price, stock, min_stock, description } = req.body;
    const sql = `UPDATE products SET name = ?, category = ?, price = ?, stock = ?, min_stock = ?, description = ? WHERE id = ?`;
    const params = [name, category, price, stock, min_stock, description, req.params.id];

    db.run(sql, params, function(err) {
        if (err) return handleError(res, err, 'Update product failed');
        if (this.changes === 0) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product updated successfully', changes: this.changes });
    });
});

// 删除产品
router.delete('/:id', (req, res) => {
    db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
        if (err) return handleError(res, err, 'Delete product failed');
        if (this.changes === 0) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product deleted successfully' });
    });
});

// 调整库存 (轻量级库存操作接口)
router.post('/:id/stock', (req, res) => {
    const { quantity, type } = req.body; // type: 'add' or 'subtract'
    const op = type === 'subtract' ? '-' : '+';
    const sql = `UPDATE products SET stock = stock ${op} ? WHERE id = ?`;
    
    db.run(sql, [Math.abs(quantity), req.params.id], function(err) {
        if (err) return handleError(res, err, 'Stock update failed');
        res.json({ message: 'Stock updated', productId: req.params.id });
    });
});

module.exports = router;