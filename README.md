这是一份为您重新设计的 README.md。

它采用了最稳妥的命令行操作方式，去掉了繁琐的脚本说明，并严格遵循了您对代理说明的要求。

OpenCode 魔改增强版 (OpenCode Magic Edition)

这是一个基于 anomalyco/opencode 的深度魔改版本。

🌟 魔改核心：release_context 工具

本项目最大的改进是引入了主动上下文释放机制。AI 现在可以根据你的指令，主动“扔掉”之前读取过的长文件内容，仅保留关键元信息（路径、大小、行数等）。

极省 Tokens：处理大型代码库时，可节省 60% - 80% 的上下文占用。

智能模糊匹配：你可以通过 toolCallId 释放，也可以直接告诉 AI “释放 package.json”，它会自动匹配之前的读取记录。

一键瘦身：直接输入“清理一下上下文”，AI 会自动释放最近 3 次工具调用结果。

🛠️ 首次运行配置

为了确保环境绝对可用，请按照以下步骤在终端（PowerShell 或终端）手动运行命令：

1. 安装 Bun 环境 (如已安装请跳过)
code
Powershell
download
content_copy
expand_less
powershell -c "irm bun.sh/install.ps1 | iex"

注意：安装完成后需重启终端窗口。

2. 安装项目依赖

进入项目根目录，依次运行以下两条命令：

code
Powershell
download
content_copy
expand_less
bun install
bun add entities
3. 配置 API Key

找到项目根目录下的 .env.example，复制一份并重命名为 .env。

用记事本打开 .env，在 ANTHROPIC_API_KEY= 后面填入你的 Key 并保存。

🚀 启动程序

在项目根目录下运行以下命令启动网页版：

code
Powershell
download
content_copy
expand_less
bun dev -- serve

启动成功后，在浏览器访问：http://localhost:4096

💡 提示：如果程序卡在启动界面或无法连接 AI，请开启全局代理模式。

🎮 如何使用 release_context

你可以直接在对话框中对 AI 下达指令：

场景 A：“释放刚刚读取的文件内容，省点 tokens。”

场景 B：“把之前读过的 src/main.ts 的上下文释放了。”

场景 C：“清理一下之前的历史记录，只保留文件名，内容扔掉。”

AI 会自动调用 release_context 工具，并将处理结果反馈给你。

⚠️ 注意事项

请确保在 .env 文件中正确配置了密钥。

如果在运行过程中遇到 entities/decode 相关报错，请重新运行 bun add entities。

本项目为本地魔改版，不保证与官方后续版本的兼容性。

## 📺 功能演示视频

<div align="center">
  <video src="演示视频/1.mp4" width="100%" controls muted autoplay loop>
    您的浏览器不支持 HTML5 视频标签。您可以直接进入 “演示视频” 文件夹手动播放 1.mp4。
  </video>
  <p><em>演示：使用 release_context 工具快速释放大文件上下文</em></p>
</div>