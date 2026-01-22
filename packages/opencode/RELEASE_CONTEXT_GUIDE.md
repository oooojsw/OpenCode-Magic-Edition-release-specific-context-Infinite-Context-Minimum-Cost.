# release_context 工具使用指南

## 功能说明
`release_context` 工具允许 AI 主动释放已读取的文件上下文，以节省 tokens。

## 使用方法

### 1. 基本用法
在对话中，AI 可以调用：

```
release_context(toolCallIds: ["call_id_1", "call_id_2"])
```

### 2. 获取 toolCallId
每次工具调用都会返回一个 toolCallId，可以从对话历史中找到。

### 3. 释放后的效果
文件内容会被替换为：

```
[Context released: read]
- Title: package.json
- Lines: 150
- Size: 6750 bytes (6.59 KB)
- Tokens saved: ~1687
- Released at: 2026-01-22T10:30:00.000Z
```

## 示例对话

```
用户：读取 package-lock.json 并告诉我 vite 的版本
AI：[调用 read 工具，读取文件]
    vite 的版本是 5.0.0

用户：好的，现在释放这个文件的上下文
AI：[调用 release_context]
    ✅ Successfully released 1 tool call(s)

    **Summary:**
    - package-lock.json
      Lines: 15000
      Saved: ~15000 tokens

    **Total saved:** ~15000 tokens
```

## 限制
- 只能释放已完成的工具调用
- 不能释放已释放的工具调用
- toolCallId 必须存在

## 效果
- 小文件(<1KB): 节省 ~250 tokens
- 中等文件(10KB): 节省 ~2,500 tokens
- 大文件(50KB+): 节省 ~12,500+ tokens
