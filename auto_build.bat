@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo   密码管理系统 V2 - 自动打包工具
echo ========================================
echo.

:: 检查是否以管理员权限运行
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [警告] 建议以管理员身份运行此脚本
    echo.
)

echo [1/5] 检查 PyInstaller...
python -m pip show pyinstaller >nul 2>&1
if %errorlevel% neq 0 (
    echo PyInstaller 未安装,正在安装...
    python -m pip install pyinstaller
    if %errorlevel% neq 0 (
        echo [错误] PyInstaller 安装失败!
        pause
        exit /b 1
    )
)
echo PyInstaller 已就绪 ✓
echo.

echo [2/5] 关闭所有 PasswordManager 进程...
taskkill /F /IM PasswordManager.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo 已关闭运行中的程序 ✓
) else (
    echo 没有运行的程序
)
timeout /t 2 /nobreak >nul
echo.

echo [3/5] 清理旧文件...
if exist "build" (
    rmdir /s /q "build"
    echo 已删除 build 目录 ✓
)
if exist "dist" (
    rmdir /s /q "dist"
    echo 已删除 dist 目录 ✓
)
echo.

echo [4/5] 开始打包程序...
echo 这可能需要几分钟时间,请耐心等待...
echo.

python -m PyInstaller --clean build.spec

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo   [错误] 打包失败!
    echo ========================================
    echo.
    echo 可能的原因:
    echo 1. 仍有 PasswordManager.exe 在运行
    echo 2. Python 依赖缺失
    echo 3. build.spec 配置错误
    echo.
    echo 请查看上方的错误信息并解决后重试
    pause
    exit /b 1
)

echo.
echo [5/5] 打包完成!
echo.
echo ========================================
echo   打包成功!
echo ========================================
echo.
echo   可执行文件位置:
echo   dist\PasswordManager.exe
echo.
echo   文件大小:
for %%F in (dist\PasswordManager.exe) do echo   %%~zF 字节
echo.
echo ========================================
echo.
echo 使用方法:
echo 1. 双击 PasswordManager.exe
echo 2. 程序会自动打开浏览器访问 http://localhost:5000
echo 3. 开始使用密码管理系统
echo.

pause
