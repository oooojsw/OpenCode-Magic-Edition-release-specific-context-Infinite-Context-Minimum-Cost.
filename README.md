# OpenCode 魔改增强版 (OpenCode Magic Edition)

这是一个基于 [anomalyco/opencode](https://github.com/anomalyco/opencode) 的深度魔改版本。

### 🌟 魔改核心：`release_context` 工具
本项目引入了**主动上下文释放机制**。当对话历史过长导致 Tokens 消耗过快时，AI 可以根据你的指令主动“扔掉”之前读取过的长文件内容，仅保留关键元信息（路径、大小、行数等）。
- **Tokens 净减**：对于长文件内容，单次释放可节省 60% - 80% 的上下文占用。
- **智能模糊匹配**：不仅可以通过 ID 释放，也可以直接说 “释放 package.json”，工具会自动匹配历史记录。
- **一键清理**：输入“清理上下文”，AI 会自动释放最近 3 次工具调用结果。

---

## 🛠️ 首次运行配置

为确保环境绝对可用，请在项目根目录下打开终端（PowerShell 或 CMD）手动运行以下命令：

### 1. 安装 Bun 环境 (如已安装请跳过)
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```
*注意：安装完成后请关闭并重新打开终端窗口。*

### 2. 安装项目依赖
依次运行以下两条命令来下载所需的依赖包：
```powershell
bun install
bun add entities
```

### 3. 配置 API Key
你有两种方式进行配置：
- **方式 A (自动)**：直接运行项目目录下的 `一键启动.bat`，它会自动检测并为你生成一个 `.env` 配置文件。
- **方式 B (手动)**：复制 `.env.example` 并重命名为 **`.env`**。

> **提示**：`.env` 文件中的 Key 保持为空也可以启动，但在正式对话前请在 `ANTHROPIC_API_KEY=` 后面填入你的密钥。

---

## 🚀 启动程序

在项目根目录下运行以下命令启动网页版：

```powershell
bun dev -- serve
```

启动成功后，在浏览器访问：`http://localhost:4096`

> **📢 注意**：如果程序启动后无法连接 AI 或卡在初始化界面，请开启**全局代理**模式。

---

## 🎮 如何使用 release_context

你可以在对话框中直接下达指令：

- “释放刚刚读取的文件内容。”
- “把之前读过的 `src/main.ts` 的上下文清掉。”
- “清理一下之前的历史记录，内容扔掉，保留文件名就好。”

AI 会自动调用工具并反馈节省了多少 Tokens。

---

## 📺 功能演示

<div align="center">
  <video src="https://github.com/user-attachments/assets/928bc481-0f71-4781-a986-b189cd3ebcdb" width="100%" controls muted autoplay loop>
    您的浏览器不支持视频播放，请点击链接查看：<a href="https://github.com/user-attachments/assets/928bc481-0f71-4781-a986-b189cd3ebcdb">查看视频</a>
  </video>
  <p><em>演示：使用 release_context 快速释放大文件上下文</em></p>
</div>
---

## ⚠️ 常见问题
- **依赖报错**：如果运行遇到 `entities/decode` 报错，请重新执行 `bun add entities`。

---
*Powered by OpenCode Mod Team*
