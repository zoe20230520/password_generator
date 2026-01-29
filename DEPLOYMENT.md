# 部署指南

本文档介绍如何将密码管理系统部署到生产环境。

## GitHub 部署

### 1. 准备工作

#### 1.1 创建 GitHub 仓库

1. 登录 GitHub
2. 点击 "New repository"
3. 填写仓库信息：
   - **Repository name**: `password-manager`
   - **Description**: 一个安全、便捷的密码管理解决方案
   - **Visibility**: Public 或 Private
4. 不要勾选 "Initialize this repository with a README"
5. 点击 "Create repository"

#### 1.2 配置 Git（首次使用）

```bash
git config --global user.name "zoecc"
git config --global user.email "your-email@example.com"
```

### 2. 上传代码

#### 2.1 初始化 Git 仓库

```bash
cd password-manager
git init
```

#### 2.2 添加文件到暂存区

```bash
git add .
```

#### 2.3 提交更改

```bash
git commit -m "Initial commit: Password Manager v1.0 by zoecc"
```

#### 2.4 连接到 GitHub 仓库

```bash
git remote add origin https://github.com/zoecc/password-manager.git
```

#### 2.5 推送到 GitHub

```bash
git branch -M main
git push -u origin main
```

### 3. 验证部署

访问您的 GitHub 仓库：
```
https://github.com/zoecc/password-manager
```

确认所有文件都已上传。

---

## 生产环境部署

### 方案 1：本地部署（推荐个人使用）

#### 1. 系统要求

- Windows 10/11 或 Linux Server
- Python 3.7+
- 4GB RAM（推荐）
- 10GB 可用磁盘空间

#### 2. 部署步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/zoecc/password-manager.git
   cd password-manager
   ```

2. **创建虚拟环境**
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Linux
   source venv/bin/activate
   ```

3. **安装依赖**
   ```bash
   pip install -r backend/requirements.txt
   ```

4. **配置生产环境变量**

   创建 `.env` 文件：
   ```env
   SECRET_KEY=your-very-secure-secret-key-change-this
   FLASK_ENV=production
   FLASK_DEBUG=0
   ```

5. **使用 Gunicorn 运行（Linux 推荐）**

   安装 Gunicorn：
   ```bash
   pip install gunicorn
   ```

   启动服务：
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5000 backend.app:create_app()
   ```

6. **使用 Nginx 反向代理（可选）**

   Nginx 配置示例：
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location /uploads {
           alias /path/to/password-manager/backend/uploads;
       }
   }
   ```

7. **配置 HTTPS（推荐）**

   使用 Let's Encrypt 免费证书：
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

---

### 方案 2：Docker 部署

#### 1. 创建 Dockerfile

```dockerfile
FROM python:3.9-slim

WORKDIR /app

# 安装依赖
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY . .

# 创建上传目录
RUN mkdir -p backend/uploads

# 暴露端口
EXPOSE 5000

# 启动服务
CMD ["python", "backend/app.py"]
```

#### 2. 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "5000:5000"
    volumes:
      - ./database.db:/app/database.db
      - ./backend/uploads:/app/backend/uploads
    environment:
      - SECRET_KEY=${SECRET_KEY}
    restart: unless-stopped
```

#### 3. 运行 Docker

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

---

### 方案 3：云平台部署

#### 使用 PythonAnywhere

1. 注册并登录 PythonAnywhere
2. 创建 Web 应用
3. 上传代码或克隆仓库
4. 配置虚拟环境并安装依赖
5. 设置 WSGI 配置文件
6. 启动应用

#### 使用 Heroku

1. 安装 Heroku CLI
2. 登录 Heroku
   ```bash
   heroku login
   ```
3. 创建应用
   ```bash
   heroku create password-manager
   ```
4. 添加 PostgreSQL 数据库（可选）
   ```bash
   heroku addons:create heroku-postgresql
   ```
5. 部署
   ```bash
   git push heroku main
   ```

---

## 安全配置

### 1. 修改密钥

**重要**：修改 `backend/config.py` 中的 `SECRET_KEY`

生成随机密钥：
```python
import secrets
print(secrets.token_hex(32))
```

### 2. 数据库安全

- 定期备份数据库
- 设置适当的文件权限
- 不要将 `database.db` 上传到 GitHub

### 3. 网络安全

- 使用 HTTPS
- 配置防火墙
- 限制访问 IP（如需要）
- 定期更新依赖包

### 4. 日志管理

配置日志记录：
```python
import logging
logging.basicConfig(
    filename='app.log',
    level=logging.INFO,
    format='%(asctime)s %(levelname)s: %(message)s'
)
```

---

## 监控和维护

### 1. 日志监控

定期检查日志文件：
- 应用日志：`app.log`
- 访问日志：Nginx 或 Apache 日志
- 错误日志：`error.log`

### 2. 性能监控

使用工具监控：
- CPU 使用率
- 内存使用
- 磁盘空间
- 响应时间

### 3. 备份策略

自动备份脚本示例：

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/password-manager"
mkdir -p $BACKUP_DIR

# 备份数据库
cp database.db $BACKUP_DIR/database_$DATE.db

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz backend/uploads

# 删除 30 天前的备份
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

### 4. 更新策略

- 定期更新依赖包
- 关注安全公告
- 及时修复漏洞
- 测试后更新生产环境

---

## 故障恢复

### 数据库损坏

1. 停止服务
2. 从备份恢复数据库
3. 重启服务

### 服务无法启动

1. 检查日志
2. 验证配置
3. 检查端口占用
4. 重启服务

---

## 联系支持

如遇到部署问题：

1. 查看 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. 提交 GitHub Issue
3. 联系技术支持

---

**部署者**: zoecc
**最后更新**: 2026-01-30
