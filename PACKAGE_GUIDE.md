# 密码管理系统 V2 - 打包指南

## 打包步骤

### 方法 1: 使用 clean_and_build.bat (推荐)

1. **确保关闭所有正在运行的密码管理器程序**
2. 双击运行 `clean_and_build.bat`
3. 等待打包完成
4. 在 `dist` 目录下找到 `PasswordManager.exe`

### 方法 2: 手动命令打包

如果遇到权限问题,请按以下步骤操作:

1. **关闭所有密码管理器相关进程**:
   - 打开任务管理器 (Ctrl+Shift+Esc)
   - 查找并结束所有 `PasswordManager.exe` 进程
   - 或者使用命令: `taskkill /F /IM PasswordManager.exe`

2. **清理旧文件**:
   ```powershell
   Remove-Item .\dist -Recurse -Force
   Remove-Item .\build -Recurse -Force
   ```

3. **执行打包**:
   ```powershell
   python -m PyInstaller --clean build.spec
   ```

## 常见问题

### 问题 1: PermissionError - 拒绝访问

**原因**: PasswordManager.exe 正在运行

**解决方法**:
- 关闭所有运行的密码管理器程序
- 检查任务管理器,结束相关进程
- 重新执行打包命令

### 问题 2: ModuleNotFoundError: No module named 'xxx'

**原因**: 依赖模块未安装

**解决方法**:
```bash
cd backend
pip install -r requirements.txt
cd ..
```

### 问题 3: 打包后运行报错

**解决方案**:
- 确保所有依赖都已安装
- 重新运行 `clean_and_build.bat`
- 查看具体错误信息并调试

## 使用打包后的程序

1. 双击 `dist/PasswordManager.exe`
2. 等待 1-2 秒,浏览器会自动打开
3. 访问 `http://localhost:5000` 开始使用

## 注意事项

- 首次启动可能较慢(解压文件到临时目录)
- 数据库文件 `database.db` 会在 EXE 所在目录自动创建
- 上传的图片保存在 `uploads` 文件夹中
- 关闭程序时,直接关闭浏览器和控制台即可
