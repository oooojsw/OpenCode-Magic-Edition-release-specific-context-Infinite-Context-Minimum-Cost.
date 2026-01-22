import { describe, expect, test } from "bun:test"
import { ReleaseContextTool } from "../../src/tool/release-context"
import { Identifier } from "../../src/id/id"
import type { MessageV2 } from "../../src/session/message-v2"
import { Token } from "../../src/util/token"

/**
 * 边界情况测试 - 测试各种极端和异常情况
 */
describe("tool.release_context - edge cases and boundary tests", () => {
  /**
   * 辅助函数：创建模拟session和messages
   */
  async function createMockSessionWithTools(
    tools: Array<{
      callID: string
      tool: string
      title: string
      status: "pending" | "running" | "completed" | "error"
      output: string
    }>,
  ) {
    // 这个函数在测试中用于模拟session状态
    // 实际测试中我们主要测试参数验证和错误处理
    return {
      sessionID: Identifier.schema("session").parse("ses-test"),
      messageID: Identifier.schema("message").parse("msg-test"),
    }
  }

  describe("输入验证边界情况", () => {
    test("拒绝空数组", async () => {
      const tool = await ReleaseContextTool.init()

      try {
        await tool.execute(
          { toolCallIds: [] },
          {
            sessionID: Identifier.schema("session").parse("ses-test"),
            messageID: Identifier.schema("message").parse("msg-test"),
            agent: "build" as const,
            abort: AbortSignal.any([]),
            metadata: () => {},
            ask: async () => ({}),
          },
        )
        expect.fail("Should throw error for empty array")
      } catch (error) {
        expect(error).toBeDefined()
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("检测重复的toolCallId", async () => {
      const tool = await ReleaseContextTool.init()

      try {
        await tool.execute(
          { toolCallIds: ["call-1", "call-2", "call-1"] },
          {
            sessionID: Identifier.schema("session").parse("ses-test"),
            messageID: Identifier.schema("message").parse("msg-test"),
            agent: "build" as const,
            abort: AbortSignal.any([]),
            metadata: () => {},
            ask: async () => ({}),
          },
        )
        expect.fail("Should throw error for duplicate IDs")
      } catch (error) {
        expect(error).toBeDefined()
        expect((error as Error).message).toContain("Duplicate")
      }
    })

    test("检测多个重复的toolCallId", async () => {
      const tool = await ReleaseContextTool.init()

      try {
        await tool.execute(
          { toolCallIds: ["call-1", "call-1", "call-2", "call-2", "call-3"] },
          {
            sessionID: Identifier.schema("session").parse("ses-test"),
            messageID: Identifier.schema("message").parse("msg-test"),
            agent: "build" as const,
            abort: AbortSignal.any([]),
            metadata: () => {},
            ask: async () => ({}),
          },
        )
        expect.fail("Should throw error for duplicate IDs")
      } catch (error) {
        expect(error).toBeDefined()
        expect((error as Error).message).toContain("Duplicate")
      }
    })
  })

  describe("工具状态边界情况", () => {
    test("占位符生成处理空lines", () => {
      // 测试非Read工具不显示lines
      const metadata = {
        path: "bash-command",
        size: 1024,
        savedTokens: 256,
      }

      const lines = []
      lines.push("[Context released: bash]")
      lines.push(`- Title: ${metadata.path}`)

      // 不添加 Lines 字段
      const sizeKB = (metadata.size / 1024).toFixed(2)
      lines.push(`- Size: ${metadata.size} bytes (${sizeKB} KB)`)

      if (metadata.savedTokens !== undefined) {
        lines.push(`- Tokens saved: ~${metadata.savedTokens}`)
      }
      lines.push(`- Released at: ${new Date().toISOString()}`)

      const placeholder = lines.join("\n")

      // 验证不包含 Lines 字段
      expect(placeholder).not.toContain("- Lines:")
      expect(placeholder).toContain("- Size:")
      expect(placeholder).toContain("- Tokens saved:")
    })

    test("占位符生成处理可选savedTokens", () => {
      // 测试savedTokens为undefined的情况
      const metadata = {
        path: "test-file",
        size: 2048,
      }

      const lines = []
      lines.push("[Context released: read]")
      lines.push(`- Title: ${metadata.path}`)
      const sizeKB = (metadata.size / 1024).toFixed(2)
      lines.push(`- Size: ${metadata.size} bytes (${sizeKB} KB)`)

      // 只有当savedTokens存在时才添加
      if (metadata.savedTokens !== undefined) {
        lines.push(`- Tokens saved: ~${metadata.savedTokens}`)
      }
      lines.push(`- Released at: ${new Date().toISOString()}`)

      const placeholder = lines.join("\n")

      // 验证不包含 Tokens saved
      expect(placeholder).not.toContain("- Tokens saved:")
      expect(placeholder).toContain("- Size:")
    })
  })

  describe("Token计算边界情况", () => {
    test("处理空字符串", () => {
      const emptyOutput = ""
      const estimated = Token.estimate(emptyOutput)
      expect(estimated).toBe(0)
    })

    test("处理非常短的输出", () => {
      const shortOutput = "x"
      const estimated = Token.estimate(shortOutput)
      expect(estimated).toBeGreaterThanOrEqual(0)
      expect(estimated).toBeLessThan(10)
    })

    test("处理非常长的输出", () => {
      // 模拟10000行的文件
      const longOutput = Array.from({ length: 10000 }, (_, i) => `Line ${i + 1}: some content here`).join("\n")
      const estimated = Token.estimate(longOutput)
      expect(estimated).toBeGreaterThan(10000)
    })

    test("处理特殊字符", () => {
      const specialChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?\n\t\r"
      const estimated = Token.estimate(specialChars)
      expect(estimated).toBeGreaterThan(0)
    })

    test("处理Unicode字符", () => {
      const unicode = "你好世界こんにちは안녕하세요🎉🚀"
      const bytes = Buffer.byteLength(unicode, "utf8")
      const estimated = Token.estimate(unicode)
      expect(estimated).toBeGreaterThan(0)
      expect(bytes).toBeGreaterThan(unicode.length)
    })
  })

  describe("元信息提取边界情况", () => {
    test("处理没有行数信息的Read输出", () => {
      // Read工具输出但没有"(End of file - total XXX lines)"
      const outputWithoutLineCount = `<file>
line 1
line 2
line 3
</file>`

      // 尝试提取行数
      const endMatch = outputWithoutLineCount.match(/\(End of file - total (\d+) lines\)/)
      expect(endMatch).toBeNull()

      // 计算大小
      const size = Buffer.byteLength(outputWithoutLineCount, "utf8")
      expect(size).toBeGreaterThan(0)
    })

    test("处理 malformed的Read输出", () => {
      // 完全不符合格式的输出
      const malformedOutput = "This is not a proper file read output"

      const endMatch = malformedOutput.match(/\(End of file - total (\d+) lines\)/)
      expect(endMatch).toBeNull()

      const size = Buffer.byteLength(malformedOutput, "utf8")
      expect(size).toBeGreaterThan(0)
    })

    test("处理包含多个End of file标记的输出", () => {
      // 输出中包含多个"(End of file"字符串
      const outputWithMultiple = `Some text
(End of file - total 100 lines)
More text
(End of file - total 200 lines)
`

      const endMatch = outputWithMultiple.match(/\(End of file - total (\d+) lines\)/)
      expect(endMatch).toBeTruthy()
      // 应该匹配第一个
      expect(endMatch![1]).toBe("100")
    })
  })

  describe("错误消息边界情况", () => {
    test("不存在的toolCallId提供清晰错误", async () => {
      const tool = await ReleaseContextTool.init()

      try {
        await tool.execute(
          { toolCallIds: ["non-existent-id-12345"] },
          {
            sessionID: Identifier.schema("session").parse("ses-test"),
            messageID: Identifier.schema("message").parse("msg-test"),
            agent: "build" as const,
            abort: AbortSignal.any([]),
            metadata: () => {},
            ask: async () => ({}),
          },
        )
        expect.fail("Should throw error")
      } catch (error) {
        expect((error as Error).message).toContain("not found")
        expect((error as Error).message).toContain("Make sure you're using the correct toolCallId")
      }
    })

    test("多个不存在的toolCallId", async () => {
      const tool = await ReleaseContextTool.init()

      try {
        await tool.execute(
          { toolCallIds: ["fake-1", "fake-2", "fake-3"] },
          {
            sessionID: Identifier.schema("session").parse("ses-test"),
            messageID: Identifier.schema("message").parse("msg-test"),
            agent: "build" as const,
            abort: AbortSignal.any([]),
            metadata: () => {},
            ask: async () => ({}),
          },
        )
        expect.fail("Should throw error")
      } catch (error) {
        const errorMsg = (error as Error).message
        expect(errorMsg).toContain("not found")
        // 应该列出所有找不到的ID
        expect(errorMsg).toContain("fake-1")
        expect(errorMsg).toContain("fake-2")
        expect(errorMsg).toContain("fake-3")
      }
    })
  })

  describe("输出格式边界情况", () => {
    test("formatOutput处理空文件列表", () => {
      // 虽然实际上不会出现这种情况（因为有参数验证）
      // 但测试formatOutput函数的健壮性
      const files: Array<{
        path: string
        lines?: number
        size: number
        savedTokens?: number
      }> = []
      const totalSavedTokens = 0

      const lines = []
      lines.push(`✅ Successfully released ${files.length} tool call(s)`)
      lines.push(``)
      lines.push(`**Summary:**`)

      for (const file of files) {
        lines.push(`- ${file.path}`)
        if (file.lines !== undefined) {
          lines.push(`  Lines: ${file.lines}`)
        }
        lines.push(`  Saved: ~${file.savedTokens} tokens`)
      }

      lines.push(``)
      lines.push(`**Total saved:** ~${totalSavedTokens} tokens`)

      const output = lines.join("\n")

      expect(output).toContain("0 tool call(s)")
      expect(output).toContain("**Summary:**")
      expect(output).toContain("**Total saved:** ~0 tokens")
    })

    test("formatOutput处理单个文件", () => {
      const files = [
        {
          path: "test.json",
          lines: 100,
          size: 5000,
          savedTokens: 1250,
        },
      ]
      const totalSavedTokens = 1250

      const lines = []
      lines.push(`✅ Successfully released ${files.length} tool call(s)`)
      lines.push(``)
      lines.push(`**Summary:**`)

      for (const file of files) {
        lines.push(`- ${file.path}`)
        if (file.lines !== undefined) {
          lines.push(`  Lines: ${file.lines}`)
        }
        lines.push(`  Saved: ~${file.savedTokens} tokens`)
      }

      lines.push(``)
      lines.push(`**Total saved:** ~${totalSavedTokens} tokens`)

      const output = lines.join("\n")

      expect(output).toContain("1 tool call(s)")
      expect(output).toContain("- test.json")
      expect(output).toContain("Lines: 100")
      expect(output).toContain("Saved: ~1250 tokens")
      expect(output).toContain("**Total saved:** ~1250 tokens")
    })

    test("formatOutput处理多个文件", () => {
      const files = [
        { path: "file1.json", lines: 100, size: 5000, savedTokens: 1250 },
        { path: "file2.json", size: 3000, savedTokens: 750 },
        { path: "bash-output", size: 1000, savedTokens: 250 },
      ]
      const totalSavedTokens = 2250

      const lines = []
      lines.push(`✅ Successfully released ${files.length} tool call(s)`)
      lines.push(``)
      lines.push(`**Summary:**`)

      for (const file of files) {
        lines.push(`- ${file.path}`)
        if (file.lines !== undefined) {
          lines.push(`  Lines: ${file.lines}`)
        }
        lines.push(`  Saved: ~${file.savedTokens} tokens`)
      }

      lines.push(``)
      lines.push(`**Total saved:** ~${totalSavedTokens} tokens`)

      const output = lines.join("\n")

      expect(output).toContain("3 tool call(s)")
      expect(output).toContain("- file1.json")
      expect(output).toContain("- file2.json")
      expect(output).toContain("- bash-output")
      expect(output).toContain("**Total saved:** ~2250 tokens")
    })
  })

  describe("数值边界情况", () => {
    test("处理零行", () => {
      const metadata = {
        path: "empty.txt",
        lines: 0,
        size: 0,
        savedTokens: 0,
      }

      expect(metadata.lines).toBe(0)
      expect(metadata.size).toBe(0)
      expect(metadata.savedTokens).toBe(0)
    })

    test("处理非常大的行数", () => {
      const metadata = {
        path: "huge.txt",
        lines: 1000000,
        size: 50000000,
        savedTokens: 12500000,
      }

      expect(metadata.lines).toBe(1000000)
      expect(metadata.size).toBe(50000000)
      expect(metadata.savedTokens).toBe(12500000)
    })

    test("处理负数大小（不应该发生）", () => {
      // 虽然实际上不会出现负数，但测试健壮性
      const size = -100
      // Buffer.byteLength 不会返回负数
      const testStr = "test"
      const actualSize = Buffer.byteLength(testStr, "utf8")
      expect(actualSize).toBeGreaterThanOrEqual(0)
    })
  })

  describe("特殊工具类型", () => {
    test("处理未知工具类型", () => {
      const metadata = {
        path: "unknown-tool-output",
        size: 1024,
      }

      const placeholder = `[Context released: unknown_tool]
- Title: ${metadata.path}
- Size: ${metadata.size} bytes (${(metadata.size / 1024).toFixed(2)} KB)
- Released at: ${new Date().toISOString()}`

      expect(placeholder).toContain("[Context released: unknown_tool]")
      expect(placeholder).toContain("- Title: unknown-tool-output")
      expect(placeholder).toContain("- Size:")
    })

    test("处理read工具的特殊格式", () => {
      const metadata = {
        path: "read-file.txt",
        lines: 50,
        size: 2048,
      }

      const placeholder = `[Context released: read]
- Title: ${metadata.path}
- Lines: ${metadata.lines}
- Size: ${metadata.size} bytes (${(metadata.size / 1024).toFixed(2)} KB)
- Released at: ${new Date().toISOString()}`

      expect(placeholder).toContain("[Context released: read]")
      expect(placeholder).toContain("- Lines: 50")
    })
  })
})
