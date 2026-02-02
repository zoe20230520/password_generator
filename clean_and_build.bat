@echo off
chcp 65001 >nul
echo ========================================
echo   清理并重新打包
echo ========================================
echo.

echo [1/3] 关闭所有 PasswordManager 进程...
taskkill /F /IM PasswordManager.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo 完成 ✓
echo.

echo [2/3] 清理旧文件...
if exist "build" rmdir /s /q "build"
if exist "dist" rmdir /s /q "dist"
echo 完成 ✓
echo.

echo [3/3] 开始打包...
python -m PyInstaller --clean build.spec

if %errorlevel% neq 0 (
    echo.
    echo [错误] 打包失败!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   打包成功!
echo   可执行文件: dist\PasswordManager.exe
echo ========================================
echo.

pause
