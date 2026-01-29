# 密码管理系统 - 安装和配置指南

## 新增功能：登录鉴权

### 功能特性

- ✅ 用户注册和登录
- ✅ JWT Token 认证
- ✅ 密码加密存储（使用 Werkzeug）
- ✅ 所有 API 接口需要认证
- ✅ 自动登录状态检查
- ✅ 退出登录功能
- ✅ 用户数据隔离（每个用户只能看到自己的密码）

### 安装步骤

1. **安装 Python 依赖**

```bash
cd password-manager
pip install -r backend/requirements.txt
```

新增依赖：
- `PyJWT==2.8.0` - JWT Token 生成和验证
- `werkzeug==3.0.1` - 密码加密

2. **启动后端服务**

```bash
python backend/app.py
```

3. **访问应用**

打开浏览器访问：http://localhost:5000

### 使用流程

#### 1. 注册账号

- 首次访问会自动跳转到登录页面
- 点击"立即注册"按钮
- 填写用户名、邮箱和密码
- 点击"注册"按钮完成注册

#### 2. 登录

- 在登录页面输入用户名和密码
- 点击"登录"按钮
- 登录成功后会跳转到密码管理主页面

#### 3. 管理密码

- 登录后可以添加、编辑、删除密码
- 每个用户只能看到和管理自己的密码
- 所有操作都需要有效的 Token

#### 4. 退出登录

- 点击右上角的"退出"按钮
- 确认退出后返回登录页面

### 数据安全

1. **密码加密**
   - 用户密码使用 `werkzeug.security.generate_password_hash` 加密
   - 数据库中存储的是加密后的哈希值
   - 无法反向解密

2. **Token 认证**
   - 登录成功后生成 JWT Token
   - Token 有效期：7天
   - Token 存储在浏览器的 localStorage 中
   - 每个 API 请求都需要携带 Token

3. **数据隔离**
   - 每个密码记录都关联到 `user_id`
   - 用户只能访问自己的密码记录
   - 后端 API 会自动验证用户权限

### API 接口变更

#### 认证接口（新增）

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息（需要认证）

#### 受保护的接口

以下所有接口都需要在请求头中携带 Token：

```http
Authorization: Bearer <your-token-here>
```

需要认证的接口：
- `GET /api/passwords` - 获取密码列表
- `GET /api/passwords/<id>` - 获取单个密码
- `POST /api/passwords` - 创建密码
- `PUT /api/passwords/<id>` - 更新密码
- `DELETE /api/passwords/<id>` - 删除密码
- `GET /api/categories` - 获取分类
- `POST /api/generate-password` - 生成密码
- `POST /api/upload` - 上传图片
- `DELETE /api/upload/<filename>` - 删除图片
- `GET /api/uploads/<filename>` - 获取图片

### 数据库变更

#### 新增表：users

| 字段名 | 类型 | 说明 |
|---------|------|------|
| id | Integer | 主键，自增 |
| username | String(50) | 用户名（唯一） |
| email | String(100) | 邮箱（唯一） |
| password_hash | String(255) | 密码哈希 |
| created_at | DateTime | 创建时间 |

#### 修改表：password_entries

新增字段：
- `user_id` - Integer（外键，关联到 users.id）

### 配置说明

#### 修改 JWT 密钥（生产环境必须）

编辑 `backend/auth.py`：

```python
SECRET_KEY = 'your-secret-key-change-this-in-production'  # 修改为强随机密钥
```

生成强密钥的方法：

```python
import secrets
print(secrets.token_hex(32))
```

#### 修改 Token 有效期

编辑 `backend/auth.py`：

```python
'exp': datetime.utcnow() + timedelta(days=7),  # 修改天数为需要的值
```

### 故障排除

#### 问题：登录后提示"未授权"

- 清除浏览器 localStorage
- 重新登录
- 检查 Token 是否过期

#### 问题：无法注册

- 检查用户名是否已存在
- 检查邮箱是否已被注册
- 检查密码长度（至少6位）

#### 问题：Token 过期

- Token 有效期默认为 7 天
- 过期后会自动跳转到登录页面
- 重新登录即可

### 安全建议

1. **生产环境部署时**：
   - 修改 JWT 密钥为强随机值
   - 使用 HTTPS
   - 配置 CORS 白名单
   - 设置合理的 Token 有效期

2. **用户密码安全**：
   - 密码至少 6 位
   - 建议使用密码生成器生成强密码
   - 定期更换重要账户密码

3. **数据备份**：
   - 定期备份 `database.db` 文件
   - 备份 `backend/uploads/` 目录（用户上传的图片）

### 技术栈

- **后端**: Flask + SQLAlchemy + PyJWT + Werkzeug
- **前端**: HTML5 + CSS3 + JavaScript + Bootstrap 5
- **认证**: JWT (JSON Web Token)
- **加密**: Werkzeug Security (PBKDF2)
- **数据库**: SQLite

### 更新日志

#### v2.0.0 (2025-01-30)

**新增**：
- 用户注册和登录功能
- JWT Token 认证
- 用户数据隔离
- 退出登录功能
- 登录状态自动检查

**改进**：
- 所有 API 接口增加认证保护
- 密码加密存储
- 用户体验优化

**兼容性**：
- 需要重新创建数据库表
- 旧数据需要迁移（添加 user_id 字段）
