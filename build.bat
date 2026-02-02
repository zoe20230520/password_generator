@echo off
chcp 65001 >nul
echo ========================================
echo   密码管理系统 V2 - 打包工具
echo ========================================
echo.

echo [1/3] 检查 PyInstaller...
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

echo [2/3] 开始打包程序...
echo 这可能需要几分钟时间,请耐心等待...
echo.

python -m PyInstaller --clean build.spec

if %errorlevel% neq 0 (
    echo.
    echo [错误] 打包失败!
    pause
    exit /b 1
)

echo.
echo [3/3] 打包完成!
echo.
echo ========================================
echo   可执行文件位置:
echo   dist/PasswordManager.exe
echo ========================================
echo.
echo 双击 PasswordManager.exe 即可运行程序
echo 程序会自动打开浏览器访问 http://localhost:5000
echo.

pause
