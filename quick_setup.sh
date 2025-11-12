#!/bin/bash
# 快速配置脚本

echo "========================================="
echo "  Figma MCP Server 配置"
echo "========================================="
echo ""
read -p "请输入你的 Figma API Token: " TOKEN

if [ -z "$TOKEN" ]; then
    echo "❌ Token 不能为空"
    exit 1
fi

cat > ~/.cursor/mcp.json << EOF
{
  "mcpServers": {
    "Framelink MCP for Figma": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp", "--stdio"],
      "env": {
        "FIGMA_API_KEY": "$TOKEN"
      }
    }
  }
}
EOF

chmod 600 ~/.cursor/mcp.json

echo ""
echo "✅ 配置完成！"
echo "📝 配置文件位置: ~/.cursor/mcp.json"
echo ""
echo "📋 接下来的步骤："
echo "  1. 完全退出 Cursor IDE（⌘Q）"
echo "  2. 重新打开 Cursor"
echo "  3. 在 Agent 模式中测试 Figma 链接"
echo ""

