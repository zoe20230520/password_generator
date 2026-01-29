from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

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

