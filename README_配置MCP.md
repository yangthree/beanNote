# 🚀 Cursor Figma MCP Server 配置指南

## ✅ 前置条件已完成

- ✅ Node.js 已安装 (v25.1.0)
- ✅ npx 已安装 (v11.6.2)
- ✅ 配置文件位置: `~/.cursor/mcp.json`

## 📝 配置步骤

### 方式一：使用脚本（最简单）✨

在终端运行：

```bash
bash /Users/yangsan/Desktop/cursor/quick_setup.sh
```

然后按提示输入你的 Figma Token。

---

### 方式二：手动编辑配置文件

1. **打开配置文件**
   ```bash
   open ~/.cursor/mcp.json
   ```
   或者使用你喜欢的编辑器打开：`/Users/yangsan/.cursor/mcp.json`

2. **复制以下内容**，将 `YOUR_FIGMA_TOKEN_HERE` 替换为你的实际 Token：

```json
{
  "mcpServers": {
    "Framelink MCP for Figma": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp", "--stdio"],
      "env": {
        "FIGMA_API_KEY": "YOUR_FIGMA_TOKEN_HERE"
      }
    }
  }
}
```

3. **保存文件**

---

### 方式三：使用命令行（一键配置）

在终端运行以下命令（替换 `YOUR_TOKEN` 为你的实际 Token）：

```bash
cat > ~/.cursor/mcp.json << 'EOF'
{
  "mcpServers": {
    "Framelink MCP for Figma": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp", "--stdio"],
      "env": {
        "FIGMA_API_KEY": "YOUR_TOKEN"
      }
    }
  }
}
EOF
chmod 600 ~/.cursor/mcp.json
```

---

## 🔄 配置后的步骤

1. **完全退出 Cursor**
   - 按 `⌘Q` 完全退出 Cursor（不要只是关闭窗口）

2. **重新打开 Cursor**

3. **验证配置**
   - 打开 Cursor 的 Agent 模式
   - 粘贴一个 Figma 链接（例如：`https://www.figma.com/file/...`）
   - 尝试请求："请根据这个 Figma 设计实现 UI"
   - 如果 MCP Server 正常工作，Cursor 会自动获取 Figma 设计数据

---

## 🔍 验证配置

### 检查配置文件

```bash
cat ~/.cursor/mcp.json
```

### 测试 Token（可选）

```bash
curl -H "X-Figma-Token: YOUR_TOKEN" https://api.figma.com/v1/me
```

如果返回你的账户信息，说明 Token 有效。

---

## ⚠️ 常见问题

### 问题 1：MCP Server 无法启动
- ✅ 检查 Token 是否正确
- ✅ 确认配置文件格式正确（JSON 格式）
- ✅ 查看 Cursor 控制台的错误信息
- ✅ 确认 Node.js 已安装：`node --version`

### 问题 2：无法访问 Figma 文件
- ✅ 确认 Token 有访问权限（需要 `file_read` 权限）
- ✅ 检查网络连接（可能需要 VPN）
- ✅ 验证文件链接是否正确

### 问题 3：配置文件找不到
- ✅ 配置文件位置：`~/.cursor/mcp.json`
- ✅ 如果不存在，创建目录：`mkdir -p ~/.cursor`
- ✅ 然后创建配置文件

---

## 🔒 安全提示

1. **不要将 Token 提交到 Git**
   - 确保 `~/.cursor/mcp.json` 不在 Git 仓库中
   - 或添加到 `.gitignore`

2. **保护配置文件权限**
   ```bash
   chmod 600 ~/.cursor/mcp.json
   ```

3. **定期轮换 Token**
   - 在 Figma 设置中定期撤销旧 Token
   - 生成新 Token 并更新配置

---

## 📚 参考文档

- [Figma API 文档](https://www.figma.com/developers/api)
- [Framelink MCP 项目](https://github.com/GLips/Figma-Context-MCP)
- [MCP 协议文档](https://modelcontextprotocol.io/)

---

## 🎉 完成！

配置完成后，你就可以在 Cursor 中使用 Figma 设计了！

有任何问题，请查看故障排查部分或参考文档。

