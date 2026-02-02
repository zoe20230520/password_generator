from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

# 导入加密管理器（延后导入避免循环依赖）
crypto = None

class User(db.Model):
    """用户模型"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        """设置密码（加密）"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """验证密码"""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """将模型转换为字典"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<User {self.username}>'

class PasswordEntry(db.Model):
    """密码记录模型"""
    __tablename__ = 'password_entries'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    site_name = db.Column(db.String(100), nullable=False)
    site_url = db.Column(db.String(255))
    username = db.Column(db.String(100), nullable=False)
    password = db.Column(db.String(255), nullable=False)
    notes = db.Column(db.Text)
    strength = db.Column(db.String(20))
    category = db.Column(db.String(50))
    image_filename = db.Column(db.String(255))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # 关联用户
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    user = db.relationship('User', backref=db.backref('passwords', lazy=True))

    def to_dict(self):
        """将模型转换为字典"""
        return {
            'id': self.id,
            'site_name': self.site_name,
            'site_url': self.site_url,
            'username': self.username,
            'password': self.password,
            'notes': self.notes,
            'strength': self.strength,
            'category': self.category,
            'image_filename': self.image_filename,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def to_dict_masked(self):
        """将模型转换为字典（密码脱敏）"""
        data = self.to_dict()
        data['password'] = '••••••••'
        return data

    def __repr__(self):
        return f'<PasswordEntry {self.site_name} - {self.username}>'

class FavoriteItem(db.Model):
    """收藏网站模型"""
    __tablename__ = 'favorite_items'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(100), nullable=False, default='未命名收藏')
    content = db.Column(db.Text, nullable=False)  # 加密存储
    category = db.Column(db.String(50))
    tags = db.Column(db.String(200))
    is_password = db.Column(db.Boolean, default=False)
    item_type = db.Column(db.String(20), default='link')  # link, image, article
    url = db.Column(db.String(500))  # 网址URL
    image_url = db.Column(db.String(500))  # 封面图片URL
    use_count = db.Column(db.Integer, default=0)
    last_used = db.Column(db.DateTime)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    user = db.relationship('User', backref=db.backref('favorite_items', lazy=True))

    def set_content(self, content):
        """设置内容（加密）"""
        from crypto_utils import crypto
        if crypto:
            self.content = crypto.encrypt(content) if content else ''
        else:
            self.content = content

    def get_content(self):
        """获取内容（解密）"""
        from crypto_utils import crypto
        if crypto and self.content:
            try:
                return crypto.decrypt(self.content)
            except:
                return self.content
        return self.content if self.content else ''

    def to_dict(self, decrypt=True):
        """将模型转换为字典"""
        data = {
            'id': self.id,
            'title': self.title,
            'content': self.get_content() if decrypt else '***',
            'category': self.category,
            'tags': self.tags,
            'is_password': self.is_password,
            'item_type': self.item_type,
            'url': self.url,
            'image_url': self.image_url,
            'use_count': self.use_count,
            'last_used': self.last_used.isoformat() if self.last_used else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        return data

    def __repr__(self):
        return f'<FavoriteItem {self.title}>'

class FavoriteUsage(db.Model):
    """收藏网站使用统计模型"""
    __tablename__ = 'favorite_usage'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('favorite_items.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    action = db.Column(db.String(20))  # copy, view, edit, delete

    # 关系
    user = db.relationship('User', backref=db.backref('favorite_usage', lazy=True))
    item = db.relationship('FavoriteItem', backref=db.backref('usage_logs', lazy=True))

    def to_dict(self):
        """将模型转换为字典"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'item_id': self.item_id,
            'timestamp': self.timestamp.isoformat(),
            'action': self.action
        }

    def __repr__(self):
        return f'<FavoriteUsage {self.action} at {self.timestamp}>'


