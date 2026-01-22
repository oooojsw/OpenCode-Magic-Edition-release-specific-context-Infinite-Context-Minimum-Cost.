# 快速测试 release_context 功能

## 方法一：验证工具是否已注册（推荐，最简单）

### 1. 启动你原有的 opencode

直接在你命令行运行：
```bash
opencode
```

### 2. 在 OpenCode 中测试

进入后，尝试以下对话：

```
你: 有哪些工具可以使用？
```

AI 应该会列出所有可用的工具，检查是否包含 `release_context`

---

## 方法二：验证代码是否正确集成

### 1. 检查工具是否已注册

在项目目录运行：
```bash
cd "C:\Users\ZhuanZ\Desktop\opencode re\opencode"
grep -r "ReleaseContextTool" packages/opencode/src/tool/
```

**期望输出**：
```
packages/opencode/src/tool/release-context.ts:export const ReleaseContextTool = ...
packages/opencode/src/tool/registry.ts:import { ReleaseContextTool } ...
```

### 2. 检查前端组件

```bash
grep -r "ReleaseContext" packages/opencode/src/cli/cmd/tui/
```

**期望输出**：
```
packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:import type { ReleaseContextTool } ...
packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:  <ReleaseContext {...toolprops} />
```

---

## 方法三：运行单元测试验证功能

### 在项目目录运行测试：

```bash
cd "C:\Users\ZhuanZ\Desktop\opencode re\opencode\packages\opencode"
bun test test/tool/release-context*.test.ts
```

**期望输出**：
```
✅ 44 pass
0 fail
```

---

## 如果你想使用魔改版本

### 方案 A：等待构建完成

构建命令正在后台运行：
```bash
cd "C:\Users\ZhuanZ\Desktop\opencode re\opencode\packages\opencode"
bun run build --single
```

构建完成后，可执行文件会在：
```
packages/opencode/dist/opencode-windows-x64/bin/opencode.exe
```

### 方案 B：解决 bun dev 启动问题

如果 `bun dev` 卡住，可能是以下原因：

1. **端口被占用**
   ```bash
   # 检查 8080 端口
   netstat -ano | findstr :8080
   # 如果被占用，关闭占用进程
   ```

2. **环境变量缺失**
   ```bash
   # 设置必需的环境变量
   set OPENCODE_PROJECT_DIR=%CD%
   ```

3. **依赖问题**
   ```bash
   # 重新安装依赖
   bun install
   ```

---

## 推荐的测试流程

### 最简单的方式：

1. **运行测试验证功能** ✅
   ```bash
   cd "C:\Users\ZhuanZ\Desktop\opencode re\opencode\packages\opencode"
   bun test test/tool/release-context*.test.ts
   ```

2. **检查代码集成** ✅
   ```bash
   grep -r "ReleaseContextTool" packages/opencode/src/tool/
   ```

3. **使用原有 opencode 测试**
   - 启动你的 opencode
   - 尝试调用 release_context 工具（如果工具已注册）
   - 或者在项目中使用 `bun run build --single` 构建魔改版本

---

## 临时解决方案

### 如果你现在就想测试功能

我可以帮你创建一个简单的测试脚本，直接调用 release_context 的核心逻辑，不需要启动整个 OpenCode。

需要吗？
