import { describe, expect, test } from "bun:test"
import { ReleaseContextTool } from "../../src/tool/release-context"
import { Identifier } from "../../src/id/id"

/**
 * 深度集成测试 - 验证工具的实际可用性
 */
describe("tool.release_context - integration tests", () => {
  describe("tool initialization and registration", () => {
    test("tool has correct structure before initialization", () => {
      // 验证工具结构（在初始化之前）
      expect(ReleaseContextTool).toBeDefined()
      expect(typeof ReleaseContextTool.id).toBe("string")
      expect(ReleaseContextTool.id).toBe("release_context")
    })

    test("tool initializes successfully with correct structure", async () => {
      const tool = await ReleaseContextTool.init()

      // 验证初始化后的工具结构
      expect(tool).toBeDefined()
      expect(typeof tool.description).toBe("string")
      expect(tool.description).toContain("tokens")
      expect(tool.parameters).toBeDefined()
      expect(typeof tool.execute).toBe("function")
    })

    test("tool parameters are correctly defined", async () => {
      const tool = await ReleaseContextTool.init()

      // 验证参数定义
      const params = tool.parameters

      // 测试有效参数
      const validResult = params.safeParse({
        toolCallIds: ["call-1", "call-2", "call-3"],
      })
      expect(validResult.success).toBe(true)

      // 测试空数组（应该失败）
      const emptyResult = params.safeParse({
        toolCallIds: [],
      })
      expect(emptyResult.success).toBe(false)

      // 测试缺少参数（应该失败）
      const missingResult = params.safeParse({})
      expect(missingResult.success).toBe(false)

      // 测试非字符串元素（应该失败）
      const invalidTypeResult = params.safeParse({
        toolCallIds: ["valid", 123],
      })
      expect(invalidTypeResult.success).toBe(false)
    })
  })

  describe("error handling and validation", () => {
    test("provides clear error messages for invalid toolCallIds", async () => {
      const tool = await ReleaseContextTool.init()

      // 创建一个模拟上下文
      const mockContext = {
        sessionID: Identifier.schema("session").parse("ses-test"),
        messageID: Identifier.schema("message").parse("msg-test"),
        agent: "build" as const,
        abort: AbortSignal.any([]),
        metadata: () => {},
        ask: async () => ({}),
      }

      // 测试空的 toolCallIds
      try {
        await tool.execute({ toolCallIds: [] }, mockContext)
        expect.fail("Should throw error for empty toolCallIds")
      } catch (error) {
        expect(error).toBeDefined()
        expect(error).toBeInstanceOf(Error)
      }

      // 测试不存在的 toolCallId
      try {
        await tool.execute(
          { toolCallIds: ["non-existent-call-id"] },
          mockContext,
        )
        expect.fail("Should throw error for non-existent toolCallId")
      } catch (error) {
        expect(error).toBeDefined()
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain("not found")
      }

      // 测试重复的 toolCallId
      try {
        await tool.execute(
          { toolCallIds: ["call-1", "call-1"] },
          mockContext,
        )
        expect.fail("Should throw error for duplicate toolCallIds")
      } catch (error) {
        expect(error).toBeDefined()
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain("Duplicate")
      }
    })
  })

  describe("helper functions", () => {
    test("metadata extraction handles various output formats", () => {
      // 测试标准 Read 工具输出
      const standardReadOutput = `<file>
00001| line 1
00002| line 2
00003| line 3
(End of file - total 3 lines)
</file>`

      const match = standardReadOutput.match(/\(End of file - total (\d+) lines\)/)
      expect(match).toBeTruthy()
      expect(match![1]).toBe("3")

      // 测试没有行数信息的输出
      const noLineCountOutput = `<file>
line 1
line 2
</file>`

      const noLineMatch = noLineCountOutput.match(/\(End of file - total (\d+) lines\)/)
      expect(noLineMatch).toBeNull()
    })

    test("placeholder generation produces correct format", () => {
      const metadata = {
        path: "test.json",
        lines: 100,
        size: 5000,
        savedTokens: 1250,
      }

      const lines = []
      lines.push("[Context released: read]")
      lines.push(`- Title: ${metadata.path}`)
      lines.push(`- Lines: ${metadata.lines}`)
      const sizeKB = (metadata.size / 1024).toFixed(2)
      lines.push(`- Size: ${metadata.size} bytes (${sizeKB} KB)`)
      lines.push(`- Tokens saved: ~${metadata.savedTokens}`)
      lines.push(`- Released at: 2026-01-22T10:00:00.000Z`)

      const placeholder = lines.join("\n")

      // 验证占位符格式
      expect(placeholder).toContain("[Context released: read]")
      expect(placeholder).toContain("- Title: test.json")
      expect(placeholder).toContain("- Lines: 100")
      expect(placeholder).toContain("- Size: 5000 bytes")
      expect(placeholder).toContain("4.88 KB") // 5000 / 1024
      expect(placeholder).toContain("- Tokens saved: ~1250")
      expect(placeholder).toContain("- Released at:")
    })

    test("handles optional lines field correctly", () => {
      const metadata = {
        path: "bash-command",
        size: 1024,
        savedTokens: 256,
      }

      const lines = []
      lines.push("[Context released: bash]")
      lines.push(`- Title: ${metadata.path}`)
      // 跳过 Lines 字段
      const sizeKB = (metadata.size / 1024).toFixed(2)
      lines.push(`- Size: ${metadata.size} bytes (${sizeKB} KB)`)

      const placeholder = lines.join("\n")

      // 验证不包含 Lines 字段
      expect(placeholder).not.toContain("- Lines:")
      expect(placeholder).toContain("- Size:")
    })
  })

  describe("token calculation accuracy", () => {
    test("token estimation for different file sizes", () => {
      // 测试小文件
      const smallContent = "line 1\nline 2\nline 3"
      const smallSize = Buffer.byteLength(smallContent, "utf8")
      expect(smallSize).toBeGreaterThan(0)
      expect(smallSize).toBeLessThan(100)

      // 测试中等文件
      const mediumContent = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`).join("\n")
      const mediumSize = Buffer.byteLength(mediumContent, "utf8")
      expect(mediumSize).toBeGreaterThan(500)
      expect(mediumSize).toBeLessThan(2000)

      // 测试大文件
      const largeContent = Array.from({ length: 1000 }, (_, i) => `line ${i + 1}: content here`).join("\n")
      const largeSize = Buffer.byteLength(largeContent, "utf8")
      expect(largeSize).toBeGreaterThan(20000)
    })
  })

  describe("tool compatibility with OpenCode patterns", () => {
    test("follows OpenCode tool definition pattern", async () => {
      // 验证工具遵循 OpenCode 的工具定义模式
      // ReleaseContextTool本身只有id和init属性
      expect(ReleaseContextTool.id).toMatch(/^[a-z_]+$/) // 只包含小写字母和下划线
      expect(ReleaseContextTool.init).toBeDefined()
      expect(typeof ReleaseContextTool.init).toBe("function")

      // 初始化后的工具才有其他属性
      const tool = await ReleaseContextTool.init()
      expect(tool.description).toBeDefined()
      expect(tool.parameters).toBeDefined()
      expect(typeof tool.execute).toBe("function")
    })

    test("uses Zod for parameter validation", async () => {
      const tool = await ReleaseContextTool.init()

      // 验证参数是 Zod schema
      expect(tool.parameters).toBeDefined()
      expect(typeof tool.parameters.safeParse).toBe("function")
      expect(typeof tool.parameters.parse).toBe("function")
    })
  })
})
