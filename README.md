# OpenCode Mod - 本地开发增强版

基于 [anomalyco/opencode](https://github.com/anomalyco/opencode) 的魔改版本。

---

## ⭐ 核心功能

### 1. 释放上下文 (release_context)
AI 读取大文件后可以主动释放其上下文，节省 60%-80% Tokens。

### 2. 任意目录启动
从任意目录启动 魔改本地版OpenCode，TUI 左下角**正确显示你的当前目录**，而不是项目目录。

---

## 📺 功能演示

<video src="https://github.com/user-attachments/assets/928bc481-0f71-4781-a986-b189cd3ebcdb" width="100%" controls muted autoplay loop>
  演示视频：https://github.com/user-attachments/assets/928bc481-0f71-4781-a986-b189cd3ebcdb
</video>

---

## 🚀 快速开始

### 第一步：复制项目

复制整个文件夹到本地任意位置，如：
```
C:\Users\你的用户名\Desktop\opencode - copy
```

### 第二步：安装依赖

```powershell
cd "C:\Users\你的用户名\Desktop\opencode - copy"
bun install
```

---

## ⚙️ 配置（让 opencode-mod 命令在任意目录可用）

> **重要**：这步配置是为了让你在**任意目录**都能运行 `opencode-mod` 命令启动 OpenCode，而不需要每次都切换到项目目录。

### 第三步：创建启动脚本

创建文件夹 `.local\bin`（如果不存在）：
```powershell
mkdir "C:\Users\你的用户名\Desktop\opencode - copy\.local\bin" -Force
```

创建 PowerShell 脚本 `opencode-mod.ps1`：
```powershell
# 保存到 C:\Users\你的用户名\Desktop\opencode - copy\.local\bin\opencode-mod.ps1

param(
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Args
)

$BunCmd = "C:\Users\你的用户名\AppData\Roaming\npm\bun.cmd"
$ProjectDir = "C:\Users\你的用户名\Desktop\opencode - copy"
$UserDir = (Get-Location).ToString().TrimEnd()

# 使用 cmd /c 方式运行，环境变量在 cmd 进程中设置
$ArgString = $Args -join " "

# 创建临时脚本
$TempScript = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.bat'
$Content = @"
@echo off
set OPENCODE_INITIAL_DIR=$UserDir
cd /d "$ProjectDir"
bun run dev $ArgString
"@
[System.IO.File]::WriteAllText($TempScript, $Content, [System.Text.Encoding]::UTF8)

# 运行临时脚本
cmd /c $TempScript

# 删除临时脚本
Remove-Item $TempScript -Force
```

### 第四步：添加 PATH 环境变量

**1.** 按 `Win + R`，输入 `sysdm.cpl`，回车

**2.** 点击「高级」→「环境变量」

**3.** 在「用户变量」的 `PATH` 变量中，在**最前面**添加：
```
C:\Users\你的用户名\Desktop\opencode - copy\.local\bin;
```

> 注意：添加后用分号与后面的内容分隔

### 第五步：重新打开终端（PowerShell）

完成以上步骤后，**重新打开终端**使环境变量生效。

---

## 🎮 启动和使用

### 启动 OpenCode

配置完成后，在终端（PowerShell）中从**任意目录**运行：

```powershell
# 进入你的项目目录
cd C:\project\myapp

# 启动 OpenCode Mod
opencode-mod
```

> **注意**：`opencode-mod` 是命令名，PowerShell 会自动找到并执行 `opencode-mod.ps1`，不需要加扩展名。

TUI 左下角会显示 `~\myapp`（你的当前目录）✅

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

## 🔧 技术原理

### 如何实现任意目录启动？

1. **用户启动**：在任意目录运行 `opencode-mod`

2. **保存当前目录**：包装脚本 `opencode-mod.ps1` 保存用户当前目录到环境变量 `OPENCODE_INITIAL_DIR`

3. **修改源码**：`thread.ts` 读取 `OPENCODE_INITIAL_DIR` 作为工作目录，并传递给 TUI

4. **TUI 显示**：TUI 通过 SDK 发送 `x-opencode-directory` header，服务器返回目录给前端显示

### 核心代码修改

**文件**：`packages/opencode/src/cli/cmd/tui/thread.ts`

```typescript
// 支持 OPENCODE_INITIAL_DIR 环境变量
const initialDir = (process.env.OPENCODE_INITIAL_DIR ?? "").trim()
const pwd = (process.env.PWD ?? "").trim()
const baseCwd = initialDir || pwd || process.cwd()
const cwd = args.project ? path.resolve(baseCwd, args.project) : (initialDir || process.cwd())

// 关键：将 directory 传递给 tui()
const tuiPromise = tui({
  url,
  directory: cwd,  // ← 这行让 TUI 显示正确目录
  fetch: customFetch,
  ...
})
```

---

## 📁 核心文件

```
opencode - copy/
├── packages/opencode/src/cli/cmd/tui/thread.ts   ← 修改了这里（支持 OPENCODE_INITIAL_DIR）
└── .local/bin/opencode-mod.ps1                   ← 包装脚本（保存用户目录）
```

---

## ❓ 常见问题

**Q: TUI 显示的目录不对，显示的是项目目录**
A: 检查 `.local\bin\opencode-mod.ps1` 是否正确创建，以及 PATH 是否包含该目录

**Q: 报错 "cannot find bun"**
A: 确保已安装 Bun，并检查 `$BunCmd` 变量指向正确的 bun 路径

**Q: 命令找不到**
A: 
1. 检查 PATH 是否包含 `.local\bin`
2. 确保终端已重新打开
3. 确保 `.local\bin` 目录下有 `opencode-mod.ps1` 文件

**Q: 路径有空格导致失败**
A: 确保用户名和路径没有空格，或使用正确的引号包裹

---

## 📝 更新日志

### 2026-03-20
- 修复工作目录问题，支持任意目录启动
- TUI 左下角正确显示用户当前目录

### 2026-01-22
- 添加 release_context 工具

---

*Powered by OpenCode Mod Team*
