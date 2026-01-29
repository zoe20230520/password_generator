# 常见问题解决指南

## 问题 1: start.bat 没有反应

### 症状
双击 start.bat 后窗口一闪而过，没有任何提示

### 原因分析
- Python 未安装或未正确添加到系统路径
- start.bat 文件编码问题
- 权限不足

### 解决方案

#### 方案 1：使用命令行查看详细错误（推荐）

1. 按 `Win + R` 键
2. 输入 `cmd` 并回车
3. 输入以下命令：
```cmd
cd C:\path\to\password-manager
start.bat
```
这样可以看到详细的错误信息

#### 方案 2：检查 Python 是否安装

1. 打开命令行（CMD）
2. 输入 `python --version`
3. 如果显示版本号，说明 Python 已安装
4. 如果提示"不是内部或外部命令"，需要安装 Python

#### 方案 3：以管理员身份运行

1. 右键点击 start.bat
2. 选择"以管理员身份运行"

---

## 问题 2: Python 环境问题

### 症状
- 提示"未找到 Python"
- 提示"不是内部或外部命令"

### 解决方案

#### 安装 Python

1. 访问 https://www.python.org/downloads/
2. 下载 Python 3.7 或更高版本（推荐 3.9+）
3. 运行安装程序
4. **重要：勾选 "Add Python to PATH"**
5. 点击 "Install Now"
6. 等待安装完成
7. 重启命令行窗口
8. 输入 `python --version` 验证安装

#### 手动添加 Python 到 PATH

如果忘记勾选 "Add Python to PATH"：

1. 找到 Python 安装路径（通常在 `C:\Users\用户名\AppData\Local\Programs\Python\Python3x\`）
2. 右键"此电脑" → 属性 → 高级系统设置 → 环境变量
3. 在"系统变量"中找到"Path"，点击"编辑"
4. 点击"新建"，添加以下路径：
   - `C:\Users\用户名\AppData\Local\Programs\Python\Python3x\`
   - `C:\Users\用户名\AppData\Local\Programs\Python\Python3x\Scripts\`
5. 点击"确定"保存
6. 重启命令行窗口

---

## 问题 3: 依赖安装失败

### 症状
- 提示"依赖安装失败"
- 网络错误或超时
- 权限错误

### 解决方案

#### 方案 1：更新 pip

```cmd
python -m pip install --upgrade pip
```

#### 方案 2：使用国内镜像源（加速下载）

```cmd
pip install -r backend\requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

其他可用的镜像源：
- 清华：`https://pypi.tuna.tsinghua.edu.cn/simple`
- 阿里云：`https://mirrors.aliyun.com/pypi/simple/`
- 中科大：`https://pypi.mirrors.ustc.edu.cn/simple/`

#### 方案 3：手动逐个安装

```cmd
pip install Flask==3.0.0
pip install Flask-SQLAlchemy==3.1.1
pip install Flask-CORS==4.0.0
pip install Pillow==10.1.0
pip install PyJWT==2.8.0
pip install werkzeug==3.0.1
```

#### 方案 4：检查网络连接

确保可以访问外网，如果无法访问，使用方案 2 的镜像源

---

## 问题 4: 端口被占用

### 症状
- 提示 "Address already in use"
- 提示 "端口已被占用"
- 服务无法启动

### 解决方案

#### 方案 1：查找占用端口的进程

```cmd
netstat -ano | findstr :5000
```

记下最后一列的 PID

#### 方案 2：结束占用端口的进程

```cmd
taskkill /F /PID [进程ID]
```

将 `[进程ID]` 替换为实际的 PID

#### 方案 3：更改端口号

编辑 `backend\app.py` 文件最后一行：

```python
app.run(debug=True, host='0.0.0.0', port=5001)
```

将端口改为其他值（如 5001、5002 等）

---

## 问题 5: 数据库错误

### 症状
- 提示 "no such column"
- 提示 "OperationalError"
- 数据无法加载

### 解决方案

#### 方案 1：删除数据库重建

```cmd
del database.db
python backend\app.py
```

**注意：**这会删除所有数据，仅用于开发测试

#### 方案 2：使用数据库迁移脚本

```cmd
python migrate_db.py
```

这会保留现有数据，只添加缺失的字段

---

## 问题 6: 浏览器无法打开

### 症状
- 服务已启动，但浏览器没有自动打开
- 访问 http://localhost:5000 无法连接

### 解决方案

#### 方案 1：手动打开浏览器

在浏览器地址栏输入：`http://localhost:5000`

#### 方案 2：检查防火墙

1. 按 `Win + R`，输入 `firewall.cpl`
2. 点击"允许应用通过防火墙"
3. 找到 Python，勾选"专用网络"和"公用网络"
4. 点击"确定"

#### 方案 3：检查服务是否正常运行

查看命令行窗口，应该显示：
```
 * Running on http://0.0.0.0:5000
```

如果没有显示，说明服务未启动

---

## 问题 7: 编码错误（乱码）

### 症状
- 命令行显示乱码
- 中文显示为方块或问号

### 解决方案

已在 start.bat 中添加 `chcp 65001` 命令解决编码问题

如果仍有问题，可以：

1. 右键点击命令行窗口标题栏
2. 选择"属性"
3. 在"选项"选项卡中，将"当前代码页"改为"UTF-8"

---

## 问题 8: 权限不足

### 症状
- 提示"拒绝访问"
- 无法创建文件或文件夹

### 解决方案

1. 右键点击 start.bat
2. 选择"以管理员身份运行"

---

## 完整的启动流程

### 首次启动（推荐流程）

1. **检查环境**
   ```cmd
   python --version
   pip --version
   ```

2. **安装依赖**
   ```cmd
   pip install -r backend\requirements.txt
   ```

3. **启动服务**
   ```cmd
   python backend\app.py
   ```

4. **打开浏览器**
   访问 http://localhost:5000

### 使用 start.bat 启动

1. 双击 `start.bat`
2. 等待自动安装依赖
3. 浏览器自动打开

---

## 获取帮助

### 收集以下信息后寻求帮助

1. **系统信息**
   ```cmd
   systeminfo | findstr /B /C:"OS Name" /C:"OS Version"
   ```

2. **Python 信息**
   ```cmd
   python --version
   pip --version
   ```

3. **依赖列表**
   ```cmd
   pip list
   ```

4. **错误信息**
   - 截图或复制完整的错误提示
   - 说明具体的操作步骤

---

## 快速诊断命令

### 检查 Python
```cmd
python --version
```

### 检查 pip
```cmd
pip --version
```

### 检查端口占用
```cmd
netstat -ano | findstr :5000
```

### 检查数据库文件
```cmd
dir database.db
```

### 测试服务
```cmd
python backend\app.py
```

---

## 常用命令速查

```cmd
# 更新 pip
python -m pip install --upgrade pip

# 安装依赖
pip install -r backend\requirements.txt

# 清理 pip 缓存
pip cache purge

# 查看已安装的包
pip list

# 查看包详情
pip show 包名

# 卸载包
pip uninstall 包名
```

---

**如果以上方法都无法解决问题，请提供详细的错误信息，以便进一步帮助您。**
