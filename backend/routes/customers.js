const express = require('express');
const router = express.Router();
const { db } = require('../models/database');

// 统一错误处理
const handleError = (res, err, msg = 'Database operation failed') => {
    console.error(`[Customers Error] ${msg}:`, err.message);
    res.status(500).json({ error: msg, details: err.message });
};

// 获取客户列表 (支持分页、搜索)
router.get('/', (req, res) => {
    const { page = 1, pageSize = 10, search } = req.query;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;
    const params = [];
    
    let whereClause = 'WHERE 1=1';
    if (search) {
        whereClause += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // 获取总数和数据
    const countSql = `SELECT COUNT(*) as total FROM customers ${whereClause}`;
    const dataSql = `SELECT * FROM customers ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    db.get(countSql, params, (err, row) => {
        if (err) return handleError(res, err, 'Fetch customers count failed');
        
        const total = row.total;
        db.all(dataSql, [...params, limit, offset], (err, rows) => {
            if (err) return handleError(res, err, 'Fetch customers list failed');
            res.json({
                data: rows,
                pagination: {
                    current: parseInt(page),
                    pageSize: limit,
                    total
                }
            });
        });
    });
});

// 获取所有客户（用于下拉选择，不分页）
router.get('/all', (req, res) => {
    db.all('SELECT id, name FROM customers ORDER BY name ASC', [], (err, rows) => {
        if (err) return handleError(res, err, 'Fetch all customers failed');
        res.json(rows);
    });
});

// 获取单个客户详情
router.get('/:id', (req, res) => {
    db.get('SELECT * FROM customers WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return handleError(res, err);
        if (!row) return res.status(404).json({ error: 'Customer not found' });
        res.json(row);
    });
});

// 创建新客户
router.post('/', (req, res) => {
    const { name, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Customer name is required' });

    const sql = `INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)`;
    db.run(sql, [name, phone || '', email || '', address || ''], function(err) {
        if (err) return handleError(res, err, 'Create customer failed');
        res.status(201).json({ 
            id: this.lastID, 
            name, phone, email, address 
        });
    });
});

// 更新客户信息
router.put('/:id', (req, res) => {
    const { name, phone, email, address } = req.body;
    const sql = `UPDATE customers SET name = ?, phone = ?, email = ?, address = ? WHERE id = ?`;
    
    db.run(sql, [name, phone, email, address, req.params.id], function(err) {
        if (err) return handleError(res, err, 'Update customer failed');
        if (this.changes === 0) return res.status(404).json({ error: 'Customer not found' });
        res.json({ message: 'Customer updated successfully' });
    });
});

// 删除客户
router.delete('/:id', (req, res) => {
    db.run('DELETE FROM customers WHERE id = ?', [req.params.id], function(err) {
        if (err) return handleError(res, err, 'Delete customer failed');
        if (this.changes === 0) return res.status(404).json({ error: 'Customer not found' });
        res.json({ message: 'Customer deleted successfully' });
    });
});

// 批量导入客户 (接收JSON数组)
router.post('/batch', (req, res) => {
    const customers = req.body; // Expect array of {name, phone, ...}
    if (!Array.isArray(customers) || customers.length === 0) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare('INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)');
        let errors = 0;

        customers.forEach(c => {
            if (c.name) {
                stmt.run([c.name, c.phone || '', c.email || '', c.address || ''], (err) => {
                    if (err) errors++;
                });
            }
        });

        stmt.finalize(() => {
            db.run('COMMIT', (err) => {
                if (err) return handleError(res, err, 'Batch import failed');
                res.json({ message: `Processed ${customers.length} records`, errors });
            });
        });
    });
});

module.exports = router;