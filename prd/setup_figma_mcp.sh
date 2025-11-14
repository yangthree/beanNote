#!/bin/bash

# Figma MCP Server 配置脚本

echo "🚀 开始配置 Figma MCP Server for Cursor"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js"
    echo ""
    echo "请先安装 Node.js："
    echo "  方法 1: brew install node"
    echo "  方法 2: 访问 https://nodejs.org/ 下载安装"
    echo ""
    exit 1
fi

echo "✅ Node.js 已安装: $(node --version)"
echo "✅ npx 已安装: $(npx --version)"
echo ""

# 检查配置文件
MCP_CONFIG="$HOME/.cursor/mcp.json"

if [ ! -f "$MCP_CONFIG" ]; then
    echo "创建配置文件: $MCP_CONFIG"
    mkdir -p "$HOME/.cursor"
    echo '{"mcpServers": {}}' > "$MCP_CONFIG"
fi

echo "📝 配置文件位置: $MCP_CONFIG"
echo ""

# 询问 Token
echo "请输入你的 Figma API Token:"
echo "（Token 格式类似: figd_xxxxxxxxxxxxx...）"
read -p "Token: " FIGMA_TOKEN

if [ -z "$FIGMA_TOKEN" ]; then
    echo "❌ Token 不能为空"
    exit 1
fi

# 创建配置
cat > "$MCP_CONFIG" << EOF
{
  "mcpServers": {
    "Framelink MCP for Figma": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp", "--stdio"],
      "env": {
        "FIGMA_API_KEY": "$FIGMA_TOKEN"
      }
    }
  }
}
EOF

echo ""
echo "✅ 配置完成！"
echo ""
echo "📋 接下来的步骤："
echo "  1. 完全退出 Cursor IDE"
echo "  2. 重新打开 Cursor"
echo "  3. 在 Agent 模式中测试 Figma 链接"
echo ""
echo "🔒 安全提示：配置文件权限已设置为仅当前用户可读"
chmod 600 "$MCP_CONFIG"
echo ""

