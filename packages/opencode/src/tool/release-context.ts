import z from "zod"
import { Tool } from "./tool"
// 删除静态引用的 Session，改为在 execute 内部动态引用，打破循环依赖
// import { Session } from "../session"
import { Token } from "../util/token"
import type { MessageV2 } from "../session/message-v2"
// 确保这个文件存在
import DESCRIPTION from "./release-context.txt"

interface FileMetadata {
  path: string
  lines?: number
  size: number
  savedTokens?: number
}

export const ReleaseContextTool = Tool.define(
  "release_context",
  {
    description: DESCRIPTION,
    parameters: z.object({
      toolCallIds: z
        .array(z.string())
        .optional()
        .describe("Array of tool call IDs to release context for. If not provided, will auto-detect recent tool calls."),
      count: z
        .number()
        .optional()
        .describe("Number of recent tool calls to release. Only used if toolCallIds is not provided. Default: 3"),
      tools: z
        .array(z.string())
        .optional()
        .describe("Filter by tool names (e.g. ['read', 'grep']). Only release calls from these tools. Default: all tools"),
    }),
    async execute(params, ctx) {
      let { toolCallIds, count = 3, tools } = params

      // 🔥 关键修改：动态导入 Session，解决循环依赖导致的卡死问题
      const { Session } = await import("../session")

      // Get all messages in the session
      const messages = await Session.messages({ sessionID: ctx.sessionID })

      // If toolCallIds not provided, auto-detect recent tool calls
      let skippedRunning = 0
      let skippedAlreadyReleased = 0
      if (!toolCallIds || toolCallIds.length === 0) {
        const allToolParts: Array<{ callID: string; part: MessageV2.ToolPart; messageIdx: number }> = []

        // Collect all tool parts with their message index
        for (let msgIdx = 0; msgIdx < messages.length; msgIdx++) {
          const msg = messages[msgIdx]
          for (const part of msg.parts) {
            if (part.type === "tool") {
              // Only collect completed tool calls
              if (part.state.status !== "completed") {
                skippedRunning++
                continue
              }
              // Skip already released tools
              if (part.state.output.startsWith("[Context released:")) {
                skippedAlreadyReleased++
                continue
              }
              // Filter by tool names if specified
              if (tools && tools.length > 0 && !tools.includes(part.tool)) {
                continue
              }
              allToolParts.push({ callID: part.callID, part, messageIdx: msgIdx })
            }
          }
        }

        // Sort by message index (most recent last) and take the last N
        allToolParts.sort((a, b) => a.messageIdx - b.messageIdx)
        const recentParts = allToolParts.slice(-count)

        if (recentParts.length === 0) {
          let message = "No completed tool calls found to release."
          if (skippedRunning > 0) {
            message += ` Skipped ${skippedRunning} running tool(s) - they must finish first.`
          }
          if (skippedAlreadyReleased > 0) {
            message += ` Skipped ${skippedAlreadyReleased} already released tool(s).`
          }
          return {
            title: "No Tool Calls Found",
            metadata: { releasedCount: 0, savedTokens: 0, files: [] },
            output: message,
          }
        }

        toolCallIds = recentParts.map((p) => p.callID)
      }

      // Check for duplicate toolCallIds in the request
      const uniqueIds = new Set(toolCallIds)
      if (uniqueIds.size !== toolCallIds.length) {
        throw new Error(
          "Duplicate toolCallIds detected. Each tool call can only be released once.",
        )
      }

      // Find the tool parts by callID
      const partsMap = new Map<string, MessageV2.ToolPart>()
      const files: FileMetadata[] = []
      let totalSavedTokens = 0

      for (const msg of messages) {
        for (const part of msg.parts) {
          if (part.type === "tool" && toolCallIds.includes(part.callID)) {
            partsMap.set(part.callID, part)
          }
        }
      }

      // Check if all toolCallIds were found
      const notFound = toolCallIds.filter((id) => !partsMap.has(id))
      if (notFound.length > 0) {
        throw new Error(
          `Tool call(s) not found: ${notFound.join(", ")}. ` +
            "Make sure you're using the correct toolCallId from previous tool outputs.",
        )
      }

      // Process each part
      for (const [callID, part] of partsMap) {
        if (part.state.status !== "completed") {
          throw new Error(
            `Cannot release tool call ${callID}: ` +
              `only completed tools can be released. Current status: ${part.state.status}`,
          )
        }

        // Check if already released by checking output format
        if (part.state.output.startsWith("[Context released:")) {
          throw new Error(
            `Tool call ${callID} has already been released. ` +
              "You cannot release the same tool call twice.",
          )
        }

        // Extract metadata from the tool output
        const metadata = extractMetadata(part)

        // Calculate saved tokens
        const currentTokens = Token.estimate(part.state.output)
        metadata.savedTokens = currentTokens
        totalSavedTokens += currentTokens
        files.push(metadata)

        // Generate placeholder
        const placeholder = generatePlaceholder(part, metadata)

        // Update the part with new output
        // Note: We don't set compacted timestamp because this is manual release,
        // not automatic pruning. Setting compacted would cause toModelMessages
        // to replace our carefully crafted placeholder with "[Old tool result content cleared]"
        await Session.updatePart({
          ...part,
          state: {
            ...part.state,
            output: placeholder,
          },
        })
      }

      // Format output
      const output = formatOutput(files, totalSavedTokens, skippedRunning, skippedAlreadyReleased)

      return {
        title: "Released Context",
        metadata: {
          releasedCount: partsMap.size,
          savedTokens: totalSavedTokens,
          files,
        },
        output,
      }
    },
  },
)

/**
 * Extract metadata from a tool part
 */
function extractMetadata(part: MessageV2.ToolPart): FileMetadata {
  if (part.state.status !== "completed") {
    throw new Error("Cannot extract metadata from non-completed tool")
  }

  const output = part.state.output
  const title = part.state.title || "Unknown"

  // For read tools, try to extract file info from output
  if (part.tool === "read") {
    return extractReadMetadata(output, title)
  }

  // For other tools, use generic metadata
  return {
    path: title,
    size: Buffer.byteLength(output, "utf8"),
  }
}

/**
 * Extract metadata from read tool output
 */
function extractReadMetadata(output: string, title: string): FileMetadata {
  let lines = 0
  let size = Buffer.byteLength(output, "utf8")

  // Try to extract line count from output
  // Format: "(End of file - total XXX lines)"
  const endMatch = output.match(/\(End of file - total (\d+) lines\)/)
  if (endMatch) {
    lines = parseInt(endMatch[1])
  } else {
    // Count lines in the file content
    const fileContentMatch = output.match(/<file>\n([\s\S]+?)\n<\/file>/)
    if (fileContentMatch) {
      lines = fileContentMatch[1].split("\n").length
    }
  }

  return {
    path: title,
    lines,
    size,
  }
}

/**
 * Generate a placeholder for released context
 */
function generatePlaceholder(part: MessageV2.ToolPart, metadata: FileMetadata): string {
  const lines = []
  lines.push(`[Context released: ${part.tool}]`)
  lines.push(`- Title: ${metadata.path}`)

  if (metadata.lines !== undefined) {
    lines.push(`- Lines: ${metadata.lines}`)
  }

  // Format size
  const sizeKB = (metadata.size / 1024).toFixed(2)
  lines.push(`- Size: ${metadata.size} bytes (${sizeKB} KB)`)

  if (metadata.savedTokens !== undefined) {
    lines.push(`- Tokens saved: ~${metadata.savedTokens}`)
  }
  lines.push(`- Released at: ${new Date().toISOString()}`)

  return lines.join("\n")
}

/**
 * Format the output message
 */
function formatOutput(
  files: FileMetadata[],
  totalSavedTokens: number,
  skippedRunning = 0,
  skippedAlreadyReleased = 0
): string {
  const lines = []
  lines.push(`✅ Successfully released ${files.length} tool call(s)`)

  if (skippedRunning > 0) {
    lines.push(`⏭️  Skipped ${skippedRunning} running tool(s) - must finish first`)
  }

  if (skippedAlreadyReleased > 0) {
    lines.push(`⏭️  Skipped ${skippedAlreadyReleased} already released tool(s)`)
  }

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

  return lines.join("\n")
}
