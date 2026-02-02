# 密码管理系统 V2

![Version](https://img.shields.io/badge/version-v2.0.2-blue)
![Python](https://img.shields.io/badge/python-3.7+-green)
![License](https://img.shields.io/badge/license-MIT-orange)

一个安全、便捷的密码管理解决方案，支持多用户、密码生成、收藏网站、分类管理等功能。

**作者**: zoecc
**版本**: v2.0.2
**许可证**: MIT

## 快速开始

### 最简单的启动方式

1. 双击 `start.bat` 文件
2. 等待安装完成，浏览器会自动打开
3. 访问地址：http://localhost:5000

### 详细使用指南

请查看 **[USER_GUIDE.md](USER_GUIDE.md)** 获取完整的使用说明

## 主要功能

### 用户管理
- 用户注册和登录
- 安全的密码加密存储
- 用户数据隔离
- 会话管理

### 密码管理
- 添加、编辑、删除密码记录
- 密码强度评估（5个等级）
- 密码显示/隐藏切换
- 一键复制密码

### 密码生成器
- 自定义密码长度（6-32位）
- 支持字母、数字、符号组合
- 实时强度评估
- 一键复制到剪贴板

### 分类与搜索
- 分类管理密码记录
- 搜索网站名称、用户名、备注
- 分页浏览（20条/页）

### 收藏网站
- 安全收藏网站链接、图片和文章
- 智能分类管理（链接、图片、文章）
- URL自动识别功能（提取标题和描述）
- 封面图片预览
- 分类和标签管理
- 使用统计和快捷复制
- 时间标注（显示相对时间）
- 加密存储保护隐私

### 图片备忘
- 为密码记录添加图片备忘
- 小图预览，点击放大查看
- 支持多种图片格式

### 现代化界面
- 玻璃态设计风格
- 响应式布局
- 流畅的交互体验

## 系统要求

- Windows 7/8/10/11
- Python 3.7 或更高版本
- 现代浏览器（Chrome、Firefox、Edge、Safari）

## 目录结构

```
password-manager/
├── backend/              # 后端服务
│   ├── app.py           # Flask 主应用
│   ├── auth.py          # 认证模块
│   ├── config.py        # 配置文件
│   ├── models.py        # 数据模型
│   ├── crypto_utils.py  # 加密工具
│   ├── requirements.txt # Python 依赖
│   └── uploads/         # 上传文件目录
├── frontend/            # 前端页面
│   ├── index.html       # 主页面
│   ├── login.html       # 登录页面
│   ├── register.html    # 注册页面
│   ├── favorites.html   # 收藏网站页面
│   ├── favorites.js     # 收藏网站脚本
│   ├── style.css        # 样式文件
│   ├── script.js       # 主页脚本
│   ├── login.js         # 登录脚本
│   └── register.js      # 注册脚本
├── database.db          # SQLite 数据库（自动创建）
├── start.bat            # 快速启动脚本
├── USER_GUIDE.md        # 用户使用指南
├── CHANGELOG.md         # 更新日志
└── README.md            # 项目说明
```

## 数据安全

- 所有密码加密存储
- 用户数据完全隔离
- 本地 SQLite 数据库，无需联网
- JWT Token 身份验证
- 支持数据备份

## 备份数据

定期备份以下文件：

1. **数据库文件**: `database.db`
2. **上传的文件**: `backend/uploads/` 目录

## 技术栈

- **后端**: Python Flask + SQLAlchemy + PyJWT
- **数据库**: SQLite
- **前端**: HTML5 + CSS3 + JavaScript (ES6+)
- **UI 框架**: Bootstrap 5 + Font Awesome

## 浏览器支持

- Chrome 60+
- Firefox 55+
- Edge 79+
- Safari 11+

## 常见问题

### 无法启动？
- 检查 Python 版本是否为 3.7+
- 确保端口 5000 未被占用
- 查看控制台错误信息

### 忘记密码？
由于安全考虑，系统不支持密码找回。建议记住主密码。

### 如何在多台电脑使用？
- 将整个项目文件夹复制到其他设备
- 复制 `database.db` 文件以同步数据

## 更新日志

### v2.0 (2026-01-30)
- 新增收藏网站功能
- 新增图片备忘功能
- 图片预览支持点击放大
- 优化数据库完整性
- 完善错误处理机制

### v1.0 (2026-01-30)
- 完整的用户认证系统
- 密码记录管理
- 密码生成器
- 分类和搜索功能
- 现代化玻璃态 UI 设计

---

## 项目信息

**项目名称**: 密码管理系统 V2
**版本**: v2.0
**作者**: zoecc
**许可证**: MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

本项目基于 MIT License 开源。
详见 [LICENSE](LICENSE) 文件。

## 联系方式

- **作者**: zoecc
- **GitHub**: https://github.com/zoe20230520/password_generator
- **Gitee**: https://gitee.com/zoe0520/password_generator

---

**© 2026 zoecc. All rights reserved.**

---

**需要帮助？请查看 [USER_GUIDE.md](USER_GUIDE.md) 获取详细使用说明**
