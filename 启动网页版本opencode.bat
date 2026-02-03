@echo off
:: 设置UTF-8编码
chcp 65001 >nul
title OpenCode 网页版启动器 (完整版)

echo ========================================================
echo        OpenCode - 网页版一键启动
echo ========================================================
echo.

:: 关键：临时将 Bun 的安装路径加到 PATH
set PATH=%PATH%;%USERPROFILE%\.bun\bin

:: ----------------------------------------------------------
:: 首次运行时，自动修复并安装依赖
:: ----------------------------------------------------------
if not exist "node_modules" (
    echo [!] 首次运行，正在为你准备环境...
    echo.
    del bun.lockb /q >nul 2>nul
    echo [+] 正在下载核心依赖包...
    call bun install
    echo [+] 正在安装兼容性补丁...
    call bun add entities
    echo.
    echo [V] 环境已准备就绪！
)

:: ----------------------------------------------------------
:: 检查并生成配置文件
:: ----------------------------------------------------------
if not exist ".env" (
    echo [!] 正在生成配置文件 .env...
    (echo # 请在这里填入你的 API Key & echo ANTHROPIC_API_KEY=) > .env
    echo.
    echo [!!!] 重要：请用记事本打开 .env 文件，填入你的 API Key！
    echo.
    echo    填好并保存后，回来按任意键继续...
    pause
)

:: ----------------------------------------------------------
:: 启动服务器（前端 + 后端）
:: ----------------------------------------------------------
echo.
echo [+] 正在启动 OpenCode 服务...
echo.
echo [1/3] 正在启动后端服务器 (http://localhost:4096)...

:: 先启动后端服务器（当前窗口，可以看到错误）
start /min "OpenCode Backend" bun dev -- serve

:: 等待 5 秒让后端服务器完全启动
echo [!] 等待后端服务器启动...
timeout /t 5 /nobreak >nul

echo [2/3] 正在启动前端 Web UI 服务器...
echo      （会自动选择可用端口：3000、3001、3002...）
echo.

:: 在当前窗口启动前端 Web UI
bun run --cwd packages/app dev
