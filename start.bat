@echo off
chcp 65001 >nul
echo ========================================
echo   密码管理系统 - 快速启动
echo ========================================
echo.

echo [1/4] 检查 Python 环境...
python --version
if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo 错误: 未找到 Python
    echo ========================================
    echo.
    echo 请按以下步骤安装 Python:
    echo 1. 访问 https://www.python.org/downloads/
    echo 2. 下载并安装 Python 3.7 或更高版本
    echo 3. 安装时勾选 "Add Python to PATH"
    echo 4. 安装完成后重新运行此脚本
    echo.
    echo 按任意键打开下载页面...
    pause >nul
    start https://www.python.org/downloads/
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo 检测到 Python 版本: %PYTHON_VERSION%
echo.

echo [2/4] 检查 pip 包管理器...
pip --version
if %errorlevel% neq 0 (
    echo 错误: pip 未找到，请重新安装 Python
    pause
    exit /b 1
)
echo pip 已就绪
echo.

echo [3/4] 安装/更新依赖包...
echo 正在安装依赖，这可能需要几分钟，请耐心等待...
echo.
pip install -r backend\requirements.txt -q --disable-pip-version-check
if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo 错误: 依赖安装失败
    echo ========================================
    echo.
    echo 可能的原因:
    echo 1. 网络连接问题
    echo 2. pip 版本过旧
    echo 3. 权限不足
    echo.
    echo 尝试手动安装:
    echo pip install --upgrade pip
    echo pip install -r backend\requirements.txt
    echo.
    pause
    exit /b 1
)
echo 依赖安装完成
echo.

echo [4/4] 启动服务...
echo.
echo ========================================
echo   服务启动中...
echo   访问地址: http://localhost:5000
echo   按 Ctrl+C 停止服务
echo ========================================
echo.
echo 提示: 如果浏览器没有自动打开，请手动访问上面的地址
echo.

python backend\app.py

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo 服务启动失败
    echo ========================================
    echo.
    echo 可能的原因:
    echo 1. 端口 5000 已被占用
    echo 2. 数据库文件损坏
    echo 3. 代码文件丢失
    echo.
    echo 解决方案:
    echo 1. 检查是否有其他程序使用 5000 端口
    echo 2. 删除 database.db 文件后重试
    echo 3. 确保所有文件完整
    echo.
    pause
    exit /b 1
)

pause
