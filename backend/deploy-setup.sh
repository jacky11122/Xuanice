#!/bin/bash

# erp-inventory-system-070225/backend/deploy-setup.sh

# 遇到错误立即退出
set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 获取脚本所在绝对目录 (backend目录)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${GREEN}==============================================${NC}"
echo -e "${GREEN}      ERP Pro System - 生产环境一键部署       ${NC}"
echo -e "${GREEN}==============================================${NC}"

# 1. 权限检查
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}错误: 请使用 sudo 运行此脚本${NC}"
  echo "示例: sudo ./deploy-setup.sh"
  exit 1
fi

# 2. 系统环境准备
echo -e "${YELLOW}[1/5] 更新系统并安装基础依赖...${NC}"
apt-get update -qq
apt-get install -y curl git build-essential sqlite3 python3 make g++ -qq

# 3. 安装 Node.js (LTS) 和 PM2
echo -e "${YELLOW}[2/5] 检查并安装 Node.js 环境...${NC}"
if ! command -v node &> /dev/null; then
    echo "未检测到 Node.js，正在安装 Node.js 18.x LTS..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
else
    NODE_VER=$(node -v)
    echo -e "Node.js 已安装: ${GREEN}$NODE_VER${NC}"
fi

# 安装 PM2 进程管理器
if ! command -v pm2 &> /dev/null; then
    echo "正在安装 PM2..."
    npm install -g pm2
else
    echo -e "PM2 已安装"
fi

# 4. 后端部署
echo -e "${YELLOW}[3/5] 部署后端服务...${NC}"
cd "$SCRIPT_DIR"

if [ -f "package.json" ]; then
    echo "正在安装后端依赖..."
    npm install --production --silent
else
    echo -e "${RED}错误: 找不到 backend/package.json${NC}"
    exit 1
fi

# 5. 前端构建
echo -e "${YELLOW}[4/5] 构建前端资源...${NC}"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

if [ -d "$FRONTEND_DIR" ]; then
    cd "$FRONTEND_DIR"
    if [ -f "package.json" ]; then
        echo "正在安装前端依赖..."
        npm install --silent
        
        echo "正在编译前端项目 (Production Build)..."
        npm run build
        
        # [关键路径修正]
        # server.js 逻辑优先查找 ../frontend/public (源码目录)。
        # 在生产环境中，这会导致无法加载构建后的资源。
        # 此处如果 dist 存在，则将源码 public 目录重命名备份，强制 server.js 使用 dist 目录。
        if [ -d "dist" ] && [ -d "public" ]; then
            echo "优化静态资源路径..."
            if [ -d "public_backup_src" ]; then
                rm -rf public_backup_src
            fi
            mv public public_backup_src
        fi
        
        echo -e "${GREEN}前端构建完成${NC}"
    else
        echo -e "${RED}警告: frontend/package.json 不存在，跳过构建${NC}"
    fi
else
    echo -e "${RED}警告: frontend 目录不存在${NC}"
fi

# 6. 启动服务
echo -e "${YELLOW}[5/5] 启动服务进程...${NC}"
cd "$SCRIPT_DIR"

# 配置环境变量
if [ ! -f ".env" ]; then
    echo "生成默认 .env 配置文件..."
    echo "PORT=3000" > .env
    echo "NODE_ENV=production" >> .env
    echo "DB_PATH=../erp.db" >> .env
fi

# 使用 PM2 启动/重启服务
APP_NAME="erp-pro-server"
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start server.js --name "$APP_NAME"

# 保存当前进程列表，以便开机自启
pm2 save
# 注意：pm2 startup 需要用户手动运行一次显示的命令，此处尝试自动执行但不保证成功
# pm2 startup systemd | grep "sudo" | bash 2>/dev/null || true

echo -e "${GREEN}==============================================${NC}"
echo -e "${GREEN}   部署成功! ERP Pro System 已在后台运行${NC}"
echo -e "${GREEN}   服务端口: 3000${NC}"
echo -e "${GREEN}   管理命令: pm2 list / pm2 logs${NC}"
echo -e "${GREEN}==============================================${NC}"

exit 0