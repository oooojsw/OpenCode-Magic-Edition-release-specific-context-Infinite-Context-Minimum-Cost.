param(
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Args
)

$BunCmd = "C:\Users\ZhuanZ\AppData\Roaming\npm\bun.cmd"
$ProjectDir = "C:\Users\ZhuanZ\Desktop\opencode re\opencode - copy"
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
