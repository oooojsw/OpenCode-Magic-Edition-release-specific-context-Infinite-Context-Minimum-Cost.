# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

OpenCode 是一个开源的 AI 编码助手,采用客户端/服务器架构。支持多个 AI 提供商(Claude、OpenAI、Google、Amazon 等),内置 LSP 支持,专注于终端用户体验(TUI)。

## 开发环境设置

**必需**: Bun 1.3+

### 基础命令

```bash
# 安装依赖
bun install

# 开发模式运行(默认在 packages/opencode 目录)
bun dev

# 在其他目录运行
bun dev <directory>

# 在当前仓库根目录运行
bun dev .

# 类型检查
bun turbo typecheck

# 构建整个项目
turbo build
```

### 核心包开发

```bash
# 运行 opencode 核心包测试
cd packages/opencode && bun test

# 运行 Web 应用(用于 UI 开发)
bun run --cwd packages/app dev
# 访问 http://localhost:5173

# 运行桌面应用
bun run --cwd packages/desktop tauri dev

# 构建独立可执行文件
./packages/opencode/script/build.ts --single
# 运行构建产物: ./packages/opencode/dist/opencode-<platform>/bin/opencode
```

### SDK 生成

修改 API 或服务器代码后,需要重新生成 SDK:

```bash
./script/generate.ts
```

## 项目架构

### 核心包结构 (packages/)

- **opencode** - 核心业务逻辑和服务器
  - `src/cli/cmd/tui/` - TUI 代码(SolidJS + opentui)
  - `src/server/` - HTTP 服务器(Hono)
  - `src/agent/` - AI 代理系统
  - `src/tool/` - 工具实现
  - `src/lsp/` - LSP 集成
  - `test/` - 测试文件

- **app** - 共享 Web UI 组件(SolidJS)
- **desktop** - 原生桌面应用(Tauri,包装 app)
- **plugin** - 插件系统源码
- **console** - 控制台相关
- **sdk/js** - JavaScript SDK
- **util** - 工具函数

### 代理系统

OpenCode 包含三个内置代理:

1. **build** - 默认代理,完整访问权限,用于开发工作
2. **plan** - 只读代理,用于分析和代码探索
   - 默认拒绝文件编辑
   - 运行 bash 命令前请求权限
   - 适合探索不熟悉的代码库
3. **general** - 内部代理,用于复杂搜索和多步骤任务

使用 `Tab` 键在代理之间切换。

### 客户端/服务器架构

- 服务器处理 AI 交互和核心逻辑
- 多种客户端: TUI(终端)、Web、桌面应用
- 支持远程访问(例如通过移动应用驱动)

## 代码风格指南

遵循 STYLE_GUIDE.md 中的规范:

- **优先使用 const,避免 let**
  ```typescript
  // 好
  const foo = condition ? 1 : 2

  // 坏
  let foo
  if (condition) foo = 1
  else foo = 2
  ```

- **避免 else 语句,使用早期返回**
  ```typescript
  // 好
  function foo() {
    if (condition) return 1
    return 2
  }

  // 坏
  function foo() {
    if (condition) return 1
    else return 2
  }
  ```

- **优先使用单词变量名**
  ```typescript
  // 好
  const foo = 1
  const bar = 2

  // 坏
  const fooBar = 1
  const barBaz = 2
  ```

- **避免不必要的解构**
  ```typescript
  // 好
  const result = obj.a + obj.b

  // 坏
  const { a, b } = obj
  const result = a + b
  ```

- **其他规范**
  - 避免使用 `any` 类型
  - 避免不必要的 `try/catch`,优先使用 `.catch()`
  - 尽可能使用 Bun APIs(如 `Bun.file()`)
  - 将逻辑保持在一个函数中,除非拆分后可复用或可组合
  - 优先使用不可变模式

## 开发注意事项

1. **并行工具使用**: 总是在适用的情况下使用并行工具调用

2. **调试**: 使用 `bun run --inspect=<url> dev ...` 并通过该 URL 附加调试器
   - 要在服务器代码中触发断点,使用 `bun dev spawn`
   - 或者分别调试服务器和 TUI

3. **UI 更改**: 大多数 UI 更改可以在 Web 应用中测试(`packages/app`)

4. **桌面应用**: 需要额外的 Tauri 依赖(Rust 工具链、平台特定库)

5. **默认分支**: 项目的默认分支是 `dev`

## 测试

- 使用 Bun 测试框架
- 在 `packages/opencode` 中运行 `bun test`
- 测试文件位于 `packages/opencode/test/`

## 文档编写

如果需要编写文档,使用 `.opencode/agent/docs.md` 中定义的风格:

- 简洁友好的语调
- 页面标题应为一个词或 2-3 个短语
- 描述应为一行短句,不以 "The" 开头,5-10 个词
- 文本块不应超过 2 句话
- 章节标题简短,仅首字母大写,使用祈使语气
- 章节标题不应重复页面标题中的术语
- JS/TS 代码片段去掉尾部分号和不必要的逗号
- 提交时使用 `docs:` 前缀

## PR 规范

- **Issue First**: 所有 PR 必须引用现有 issue
- **小而专注**: 保持 PR 小而专注
- **PR 标题**: 使用传统提交标准(feat:, fix:, docs:, chore:, refactor:, test:)
- **UI 更改**: 包含前后截图或视频
- **逻辑更改**: 说明如何验证其工作
- **避免 AI 生成长文**: 使用简短、专注的描述

## 常见任务

类型检查:
```bash
bun turbo typecheck
```

构建本地版本:
```bash
./packages/opencode/script/build.ts --single
```

重新生成 SDK(API 修改后):
```bash
./script/generate.ts
```

格式化代码:
```bash
./script/format.ts
```
