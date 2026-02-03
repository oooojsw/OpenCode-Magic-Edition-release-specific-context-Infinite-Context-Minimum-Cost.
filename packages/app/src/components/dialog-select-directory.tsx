import { useDialog } from "@opencode-ai/ui/context/dialog"
import { Button } from "@opencode-ai/ui/button"
import { Dialog } from "@opencode-ai/ui/dialog"
import { FileIcon } from "@opencode-ai/ui/file-icon"
import { List } from "@opencode-ai/ui/list"
import { getDirectory, getFilename } from "@opencode-ai/util/path"
import { createMemo, createSignal } from "solid-js"
import { useGlobalSDK } from "@/context/global-sdk"
import { useGlobalSync } from "@/context/global-sync"
import { useLanguage } from "@/context/language"

interface DialogSelectDirectoryProps {
  title?: string
  multiple?: boolean
  onSelect: (result: string | string[] | null) => void
}

export function DialogSelectDirectory(props: DialogSelectDirectoryProps) {
  const sync = useGlobalSync()
  const sdk = useGlobalSDK()
  const dialog = useDialog()
  const language = useLanguage()

  const home = createMemo(() => sync.data.path.home)
  const root = createMemo(() => sync.data.path.home || sync.data.path.directory)
  const [selectedPath, setSelectedPath] = createSignal<string | undefined>(undefined)
  const [currentBrowsePath, setCurrentBrowsePath] = createSignal<string>("")
  const [listRefreshTrigger, setListRefreshTrigger] = createSignal(0)

  const currentRoot = createMemo(() => {
    const r = root()
    if (r && currentBrowsePath() === "") {
      setCurrentBrowsePath(normalizePath(r))
    }
    return r ? normalizePath(r) : r
  })

  function join(base: string | undefined, rel: string) {
    const b = (base ?? "").replace(/[\\/]+$/, "")
    const r = rel.replace(/^[\\/]+/, "").replace(/[\\/]+$/, "")
    if (!b) return r
    if (!r) return b
    return b + "/" + r
  }

  function display(rel: string) {
    const full = join(root(), rel)
    const h = home()
    if (!h) return full
    if (full === h) return "~"
    if (full.startsWith(h + "/") || full.startsWith(h + "\\")) {
      return "~" + full.slice(h.length)
    }
    return full
  }

  function normalizeQuery(query: string) {
    const h = home()

    if (!query) return query
    if (query.startsWith("~/")) return query.slice(2)

    if (h) {
      const lc = query.toLowerCase()
      const hc = h.toLowerCase()
      if (lc === hc || lc.startsWith(hc + "/") || lc.startsWith(hc + "\\")) {
        return query.slice(h.length).replace(/^[\\/]+/, "")
      }
    }

    return query
  }

  function getParentPath(path: string): string {
    const parts = path.split(/[\\/]/).filter((p) => p)
    parts.pop()
    if (parts.length === 0) return root() || "/"
    // 使用 Windows 路径分隔符
    return parts.join("\\")
  }

  function getPathSegments(path: string): string[] {
    const parts = path.split(/[\\/]/).filter((p) => p)
    return parts.length > 0 ? parts : ["/"]
  }

  function normalizePath(path: string): string {
    // 统一使用 \ 作为路径分隔符（Windows）
    return path.replace(/\//g, "\\")
  }

  async function fetchDirs(query: string) {
    const directory = root()
    if (!directory) return [] as string[]

    const results = await sdk.client.find
      .files({ directory, query, type: "directory", limit: 50 })
      .then((x) => x.data ?? [])
      .catch(() => [])

    return results.map((x) => x.replace(/[\\/]+$/, ""))
  }

  const directories = async (filter: string) => {
    // 访问 refreshTrigger 以建立响应式依赖
    listRefreshTrigger()

    const directory = currentBrowsePath() || currentRoot()
    if (!directory) return [] as string[]

    // 确保路径格式正确
    const normalizedDir = normalizePath(directory)
    const query = filter.trim() ? normalizeQuery(filter.trim()) : ""

    const results = await sdk.client.find
      .files({ directory: normalizedDir, query, type: "directory", limit: 100 })
      .then((x) => x.data ?? [])
      .catch(() => [])

    return results.map((x) => x.replace(/[\\/]+$/, ""))
  }

  function resolve(rel: string) {
    const absolute = join(root(), rel)
    props.onSelect(props.multiple ? [absolute] : absolute)
    dialog.close()
  }

  // 进入目录（双击或按 Enter）
  function enterDirectory(path: string) {
    const fullPath = join(currentBrowsePath() || currentRoot(), path)
    setCurrentBrowsePath(normalizePath(fullPath))
    setSelectedPath(undefined)
    setListRefreshTrigger(x => x + 1)  // 触发列表刷新
  }

  return (
    <Dialog
      title={props.title ?? language.t("command.project.open")}
      action={
        <Button
          variant="primary"
          size="small"
          disabled={!selectedPath()}
          onClick={() => {
            const path = selectedPath()
            if (path) {
              resolve(path)
            }
          }}
        >
          {language.t("dialog.directory.confirm")}
        </Button>
      }
    >
      <div class="flex flex-col max-h-[70vh]">
        <div class="flex items-center gap-x-2 px-4 py-2 border-b border-border-default shrink-0">
          <Button
            variant="ghost"
            size="small"
            icon="arrow-left"
            disabled={currentBrowsePath() === currentRoot() || !currentBrowsePath()}
            onClick={() => {
              const parent = getParentPath(currentBrowsePath())
              if (parent) {
                setCurrentBrowsePath(normalizePath(parent))
              }
              setSelectedPath(undefined)
              setListRefreshTrigger(x => x + 1)  // 触发列表刷新
            }}
          >
            {language.t("dialog.directory.back")}
          </Button>

          <div class="flex items-center gap-x-1 text-14-regular text-text-weak">
            {getPathSegments(currentBrowsePath() || currentRoot() || "").map((segment, index, segments) => (
              <>
                <button
                  class="hover:text-text-strong cursor-pointer"
                  onClick={() => {
                    const path = segments.slice(0, index + 1).join("\\")
                    setCurrentBrowsePath(normalizePath(path))
                    setSelectedPath(undefined)
                    setListRefreshTrigger(x => x + 1)  // 触发列表刷新
                  }}
                >
                  {segment || "/"}
                </button>
                {index < segments.length - 1 && <span>/</span>}
              </>
            ))}
          </div>
        </div>

        <List
          search={{ placeholder: language.t("dialog.directory.search.placeholder"), autofocus: true }}
          emptyMessage={language.t("dialog.directory.empty")}
          loadingMessage={language.t("common.loading")}
          items={directories}
          key={(x) => x}
          current={selectedPath()}
          onSelect={(path) => {
            // 单击：只选中，不进入
            if (path) setSelectedPath(path)
          }}
          onKeyEvent={(event, path) => {
            // 按 Enter 键：进入目录
            if (event.key === "Enter" && path) {
              enterDirectory(path)
            }
          }}
        >
          {(rel) => {
            const path = display(rel)
            return (
              <div class="w-full flex items-center justify-between rounded-md" onDblClick={() => enterDirectory(rel)}>
                <div class="flex items-center gap-x-3 grow min-w-0">
                  <FileIcon node={{ path: rel, type: "directory" }} class="shrink-0 size-4" />
                  <div class="flex items-center text-14-regular min-w-0">
                    <span class="text-text-weak whitespace-nowrap overflow-hidden overflow-ellipsis truncate min-w-0">
                      {getDirectory(path)}
                    </span>
                    <span class="text-text-strong whitespace-nowrap">{getFilename(path)}</span>
                  </div>
                </div>
              </div>
            )
          }}
        </List>
      </div>
    </Dialog>
  )
}
