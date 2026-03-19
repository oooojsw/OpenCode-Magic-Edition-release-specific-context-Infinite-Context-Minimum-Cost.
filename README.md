# OpenCode Mod - 本地开发增强版

基于 [anomalyco/opencode](https://github.com/anomalyco/opencode) 的魔改版本。

---

## ⭐ 核心功能

### 1. 释放上下文 (release_context)
AI 读取大文件后可以主动释放其上下文，节省 60%-80% Tokens。

### 2. 任意目录启动
从任意目录启动 OpenCode，TUI 左下角正确显示你的当前目录。

---

## 📺 功能演示

<video src="https://github.com/user-attachments/assets/928bc481-0f71-4781-a986-b189cd3ebcdb" width="100%" controls muted autoplay loop>
  演示视频：https://github.com/user-attachments/assets/928bc481-0f71-4781-a986-b189cd3ebcdb
</video>

---

## 🚀 快速开始

### 第一步：复制项目

复制整个文件夹到本地，如：
```
C:\Users\用户名\Desktop\opencode - copy
```

### 第二步：安装依赖

```powershell
cd "C:\Users\用户名\Desktop\opencode - copy"
bun install
```

---

## ⚙️ 配置（重要！让任意目录都能启动）

### 第三步：添加环境变量

**1.** 打开系统环境变量设置：
- 按 `Win + R`，输入 `sysdm.cpl`，回车
- 点击「高级」→「环境变量」

**2.** 在「用户变量」中新建两个变量：

| 变量名 | 值 |
|--------|-----|
| `OPENCODE_INITIAL_DIR` | `%USERPROFILE%` |
| `OPENCODE_MOD_PATH` | `C:\Users\用户名\Desktop\opencode - copy` |

> 把「用户名」改成你实际的用户名

**3.** 修改 `OPENCODE_MOD_PATH` 变量，在其**最前面**添加：
```
C:\Users\用户名\Desktop\opencode - copy;
```
（注意分号分隔）

### 第四步：创建启动脚本

在 `C:\Users\用户名\AppData\Roaming\npm\` 目录下创建一个文件 `opencode-mod.ps1`：

```powershell
# opencode-mod.ps1 内容：
$ProjectDir = $env:OPENCODE_MOD_PATH
$UserDir = $env:OPENCODE_INITIAL_DIR

# 创建临时脚本
$TempScript = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.bat'
$Content = @"
@echo off
set OPENCODE_INITIAL_DIR=$UserDir
cd /d "$ProjectDir"
bun run dev
"@
[System.IO.File]::WriteAllText($TempScript, $Content, [System.Text.Encoding]::UTF8)
cmd /c $TempScript
Remove-Item $TempScript -Force
```

### 第五步：创建快捷命令

打开 PowerShell 配置文件：
```powershell
notepad $PROFILE
```

添加一行：
```powershell
Remove-Item alias:opencode -ErrorAction SilentlyContinue
function global:opencode { 
    & "$env:USERPROFILE\AppData\Roaming\npm\opencode-mod.ps1" $args 
}
```

保存后**重新打开 PowerShell**。

---

## 🎮 启动和使用

### 启动

```powershell
# 进入你的项目目录
cd C:\project\myapp

# 启动 OpenCode
opencode
```

TUI 左下角会显示 `~\myapp`（你的当前目录）

### 释放上下文

```
你: 释放刚才读取的 package.json
```

```
AI: ✅ Successfully released 1 tool call(s)
    - package.json: ~1687 tokens saved
```

### 更多释放指令

```
你: 把之前读过的 src/main.ts 的上下文清掉
你: 清理一下之前的历史记录
你: 把这三个文件的上下文都释放
```

---

## 📁 核心文件

```
opencode - copy/
├── packages/opencode/src/cli/cmd/tui/thread.ts   ← 修改了这里
└── .local/bin/opencode-mod.ps1                   ← 包装脚本
```

---

## ❓ 常见问题

**Q: TUI 显示的目录不对**
A: 检查环境变量 `OPENCODE_INITIAL_DIR` 是否设置正确

**Q: 报错 "Script not found"**
A: 检查 `opencode-mod.ps1` 是否在 `AppData\Roaming\npm\` 目录

---

## 📝 更新日志

### 2026-03-20
- 修复工作目录问题，支持任意目录启动

### 2026-01-22
- 添加 release_context 工具

---

*Powered by OpenCode Mod Team*
