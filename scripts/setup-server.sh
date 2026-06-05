#!/bin/bash
# 自托管服务器一键部署脚本
# 使用方法：bash setup-server.sh

set -e

echo "=== 1. 安装 Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "=== 2. 安装 pnpm ==="
npm install -g pnpm

echo "=== 3. 安装 PM2 ==="
npm install -g pm2

echo "=== 4. 安装项目依赖 ==="
pnpm install

echo "=== 5. 检查环境变量 ==="
if [ ! -f .env ]; then
  cp .env.example .env
  echo ">>> 已创建 .env 文件，请编辑后继续："
  echo "    nano .env"
  echo "    （填写 DATABASE_URL 和 SESSION_SECRET）"
  exit 1
fi

echo "=== 6. 推送数据库结构 ==="
pnpm --filter @workspace/db run push

echo "=== 7. 构建前端 ==="
pnpm --filter @workspace/data-chat run build

echo "=== 8. 构建后端 ==="
pnpm --filter @workspace/api-server run build

echo "=== 9. 启动后端服务 ==="
pm2 delete data-chat-api 2>/dev/null || true
pm2 start artifacts/api-server/dist/index.mjs \
  --name "data-chat-api" \
  --env production

pm2 save
pm2 startup | tail -1 | bash 2>/dev/null || true

echo ""
echo "✅ 部署完成！"
echo "   后端运行在 http://localhost:8080"
echo "   前端静态文件位于 $(pwd)/artifacts/data-chat/dist/public"
echo ""
echo "下一步：配置 Nginx，见 nginx.conf.example"
