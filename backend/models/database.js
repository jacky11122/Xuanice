const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');

// 确保数据文件目录存在
const dbPath = path.resolve(__dirname, '../erp.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath, err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // 启用外键约束
        db.run('PRAGMA foreign_keys = ON');
    }
});

/**
 * 初始化数据库表结构及默认数据
 */
const initDatabase = () => {
    db.serialize(() => {
        // 1. 用户表 (Users)
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'staff',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error("Error creating users table:", err.message);
            else {
                // 检查是否需要插入默认管理员
                db.get("SELECT count(*) as count FROM users", (err, row) => {
                    if (!err && row.count === 0) {
                        const hash = bcrypt.hashSync('123456', 10);
                        const insert = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
                        db.run(insert, ['admin', hash, 'admin'], (err) => {
                            if (err) console.error("Error inserting default admin:", err.message);
                            else console.log("Default admin account created: admin / 123456");
                        });
                    }
                });
            }
        });

        // 2. 客户表 (Customers)
        db.run(`CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error("Error creating customers table:", err.message);
        });

        // 3. 产品表 (Products) - 包含总库存字段 stock
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT,
            price REAL DEFAULT 0,
            stock INTEGER DEFAULT 0,
            min_stock INTEGER DEFAULT 10,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error("Error creating products table:", err.message);
        });

        // 4. 供应商表 (Suppliers)
        db.run(`CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            contact TEXT,
            phone TEXT,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error("Error creating suppliers table:", err.message);
        });

        // 5. 销售记录表 (Sales)
        db.run(`CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            content TEXT,
            status TEXT DEFAULT 'pending', -- pending, completed, cancelled
            amount REAL DEFAULT 0,
            follow_up_date DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL
        )`, (err) => {
            if (err) console.error("Error creating sales table:", err.message);
        });

        // 6. 采购记录表 (Purchases)
        db.run(`CREATE TABLE IF NOT EXISTS purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id INTEGER,
            product_id INTEGER,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            date DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
            FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE SET NULL
        )`, (err) => {
            if (err) console.error("Error creating purchases table:", err.message);
        });

        // 7. 财务收支表 (Finance)
        db.run(`CREATE TABLE IF NOT EXISTS finance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL, -- income, expense
            amount REAL NOT NULL,
            category TEXT,
            description TEXT,
            date DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error("Error creating finance table:", err.message);
        });

        // 8. 库存分仓表 (Inventory Locations) - 对应产品在不同位置的库存
        db.run(`CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            quantity INTEGER DEFAULT 0,
            location TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
        )`, (err) => {
            if (err) console.error("Error creating inventory table:", err.message);
        });
    });
};

module.exports = {
    db,
    initDatabase
};