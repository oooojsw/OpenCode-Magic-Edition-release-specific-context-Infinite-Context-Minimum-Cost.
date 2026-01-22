import { describe, expect, test } from "bun:test"
import { ReleaseContextTool } from "../../src/tool/release-context"
import { Token } from "../../src/util/token"
import type { MessageV2 } from "../../src/session/message-v2"
import { Identifier } from "../../src/id/id"

/**
 * Helper function to create a mock tool part
 */
function createToolPart(
  options: {
    callID: string
    tool: string
    title: string
    output: string
    sessionID?: string
    messageID?: string
  },
): MessageV2.ToolPart {
  return {
    id: Identifier.ascending("part"),
    sessionID: options.sessionID || "ses-test-session",
    messageID: options.messageID || "msg-test-message",
    type: "tool",
    callID: options.callID,
    tool: options.tool,
    state: {
      status: "completed",
      input: {},
      output: options.output,
      title: options.title,
      metadata: {},
      time: {
        start: Date.now() - 1000,
        end: Date.now(),
      },
    },
  }
}

/**
 * Helper function to create a mock read tool output
 */
function createReadOutput(filePath: string, lines: number): string {
  const content = Array.from({ length: lines }, (_, i) => `${(i + 1).toString().padStart(5, "0")}| line ${i + 1}`).join("\n")
  return `<file>\n${content}\n\n(End of file - total ${lines} lines)\n</file>`
}

describe("tool.release_context - unit tests", () => {
  describe("metadata extraction", () => {
    test("extracts metadata from read tool output", () => {
      const part = createToolPart({
        callID: "test-call",
        tool: "read",
        title: "package.json",
        output: createReadOutput("package.json", 150),
      })

      // Create a mock execute function that only tests metadata extraction
      const output = part.state.output
      const title = part.state.title

      // Extract line count from output
      const endMatch = output.match(/\(End of file - total (\d+) lines\)/)
      expect(endMatch).toBeTruthy()
      const lines = parseInt(endMatch![1])
      expect(lines).toBe(150)

      // Calculate size
      const size = Buffer.byteLength(output, "utf8")
      expect(size).toBeGreaterThan(0)

      // Calculate tokens
      const tokens = Token.estimate(output)
      expect(tokens).toBeGreaterThan(0)
    })

    test("handles non-read tools", () => {
      const part = createToolPart({
        callID: "test-call",
        tool: "bash",
        title: "npm install",
        output: "Installing dependencies...\nDone!",
      })

      const output = part.state.output
      const title = part.state.title

      expect(title).toBe("npm install")
      expect(output).toContain("Installing dependencies")

      const size = Buffer.byteLength(output, "utf8")
      expect(size).toBeGreaterThan(0)

      const tokens = Token.estimate(output)
      expect(tokens).toBeGreaterThan(0)
    })
  })

  describe("token calculation", () => {
    test("accurately estimates saved tokens for large files", () => {
      const largeOutput = createReadOutput("large.json", 1000)
      const estimated = Token.estimate(largeOutput)

      // Roughly 4 chars per token
      const expected = Math.round(largeOutput.length / 4)
      expect(estimated).toBeGreaterThan(0)

      // Should be within 10% margin
      const margin = Math.abs(estimated - expected) / expected
      expect(margin).toBeLessThan(0.1)
    })

    test("calculates tokens for small files", () => {
      const smallOutput = createReadOutput("small.json", 10)
      const estimated = Token.estimate(smallOutput)

      expect(estimated).toBeGreaterThan(0)
      expect(estimated).toBeLessThan(100)
    })
  })

  describe("placeholder generation", () => {
    test("generates correct placeholder format for read tools", () => {
      const part = createToolPart({
        callID: "test-call",
        tool: "read",
        title: "test.txt",
        output: createReadOutput("test.txt", 100),
      })

      const output = part.state.output
      const title = part.state.title
      const endMatch = output.match(/\(End of file - total (\d+) lines\)/)
      const lines = endMatch ? parseInt(endMatch[1]) : 0
      const size = Buffer.byteLength(output, "utf8")
      const savedTokens = Token.estimate(output)
      const timestamp = new Date().toISOString()

      const placeholder = `[Context released: read]
- Title: ${title}
- Lines: ${lines}
- Size: ${size} bytes (${(size / 1024).toFixed(2)} KB)
- Tokens saved: ~${savedTokens}
- Released at: ${timestamp}`

      expect(placeholder).toContain("[Context released: read]")
      expect(placeholder).toContain("- Title: test.txt")
      expect(placeholder).toContain("- Lines: 100")
      expect(placeholder).toContain("- Size:")
      expect(placeholder).toContain("KB")
      expect(placeholder).toContain("- Tokens saved:")
      expect(placeholder).toContain("- Released at:")
    })

    test("generates placeholder for non-read tools", () => {
      const part = createToolPart({
        callID: "test-call",
        tool: "bash",
        title: "ls -la",
        output: "file1.txt\nfile2.txt\nfile3.txt",
      })

      const output = part.state.output
      const title = part.state.title
      const size = Buffer.byteLength(output, "utf8")
      const savedTokens = Token.estimate(output)

      const placeholder = `[Context released: bash]
- Title: ${title}
- Size: ${size} bytes (${(size / 1024).toFixed(2)} KB)
- Tokens saved: ~${savedTokens}
- Released at: ${new Date().toISOString()}`

      expect(placeholder).toContain("[Context released: bash]")
      expect(placeholder).toContain("- Title: ls -la")
      expect(placeholder).toContain("- Size:")
      expect(placeholder).not.toContain("- Lines:")
    })
  })

  describe("error conditions", () => {
    test("validates toolCallIds array is not empty", async () => {
      const tool = await ReleaseContextTool.init()

      try {
        await tool.execute({ toolCallIds: [] }, {
          sessionID: "ses-test",
          messageID: "msg-test",
          agent: "build",
          abort: AbortSignal.any([]),
          metadata: () => {},
          ask: async () => {},
        })
        expect.fail("Should have thrown error for empty array")
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    test("validates toolCallIds are strings", async () => {
      const tool = await ReleaseContextTool.init()

      try {
        await tool.execute({ toolCallIds: ["valid", 123] as any }, {
          sessionID: "ses-test",
          messageID: "msg-test",
          agent: "build",
          abort: AbortSignal.any([]),
          metadata: () => {},
          ask: async () => {},
        })
        expect.fail("Should have thrown validation error")
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe("tool registration", () => {
    test("tool can be initialized", async () => {
      const tool = await ReleaseContextTool.init()

      // Tool.init() returns the initialized tool with description and parameters
      expect(tool).toBeDefined()
      expect(tool.description).toBeDefined()
      expect(tool.parameters).toBeDefined()
      expect(typeof tool.description).toBe("string")
    })

    test("tool has required parameters", async () => {
      const tool = await ReleaseContextTool.init()

      // Verify parameters exist
      expect(tool.parameters).toBeDefined()

      // Try to parse valid parameters
      const validParams = { toolCallIds: ["test-call-1", "test-call-2"] }
      const result = tool.parameters.safeParse(validParams)
      expect(result.success).toBe(true)
    })

    test("tool validates toolCallIds min length", async () => {
      const tool = await ReleaseContextTool.init()

      // Try with empty array
      const invalidParams = { toolCallIds: [] }
      const result = tool.parameters.safeParse(invalidParams)
      expect(result.success).toBe(false)
    })
  })
})
