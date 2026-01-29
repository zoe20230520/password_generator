# 贡献指南

感谢您对密码管理系统的关注！我们欢迎任何形式的贡献。

## 如何贡献

### 报告 Bug

如果您发现了 Bug，请：

1. 检查 [Issues](../../issues) 是否已有相关问题
2. 如果没有，创建新的 Issue，包含：
   - 清晰的标题
   - 详细的复现步骤
   - 预期行为和实际行为
   - 环境信息（操作系统、Python 版本、浏览器等）
   - 截图或错误日志

### 提出新功能

如果您有新功能建议：

1. 先检查 [Issues](../../issues) 是否有类似建议
2. 如果没有，创建新的 Feature Request，包含：
   - 功能描述
   - 使用场景
   - 预期效果

### 提交代码

#### 开发流程

1. Fork 本仓库
2. 创建您的特性分支：
   ```bash
   git checkout -b feature/您的功能名称
   ```
3. 提交您的更改：
   ```bash
   git commit -m '添加某个功能'
   ```
4. 推送到分支：
   ```bash
   git push origin feature/您的功能名称
   ```
5. 提交 Pull Request

#### 代码规范

- 遵循 PEP 8 Python 代码风格
- 添加适当的注释
- 确保代码通过测试
- 更新相关文档

#### Commit 消息格式

使用清晰的 Commit 消息：

```
类型(范围): 简短描述

详细描述（可选）

关联 Issue（可选）
```

类型包括：
- `feat`: 新功能
- `fix`: 修复 Bug
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具链相关

示例：
```
feat(login): 添加记住我功能

实现记住我复选框，允许用户保存登录状态 7 天

Closes #123
```

## 开发环境设置

### 1. 克隆仓库
```bash
git clone https://github.com/zoecc/password-manager.git
cd password-manager
```

### 2. 创建虚拟环境（推荐）
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

### 3. 安装依赖
```bash
pip install -r backend/requirements.txt
```

### 4. 启动开发服务器
```bash
python backend/app.py
```

### 5. 运行测试（如果有）
```bash
pytest tests/
```

## 文档

如果您修改了功能，请同步更新相关文档：
- README.md
- USER_GUIDE.md
- CHANGELOG.md

## 许可证

通过贡献代码，您同意您的代码将基于 MIT License 开源。

## 联系方式

如有疑问，请通过以下方式联系：
- 提交 [Issue](../../issues)
- 邮箱：[您的邮箱]

---

**感谢您的贡献！**
