import os
from datetime import timedelta

# 项目信息
PROJECT_NAME = "密码管理系统"
VERSION = "v1.0"
AUTHOR = "zoecc"
LICENSE = "MIT"

class Config:
    """应用配置类"""

    # 基础配置
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-change-this-in-production'

    # 数据库配置 - 使用当前工作目录确保持久化
    # 打包后工作目录是 EXE 所在目录，开发环境是项目根目录
    BASE_DIR = os.path.abspath(os.getcwd())
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(BASE_DIR, "database.db")}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # 文件上传配置 - 使用当前工作目录
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

    # 图片优化配置
    MAX_IMAGE_SIZE = 800  # 最大尺寸800×800
    IMAGE_QUALITY = 85  # 压缩质量85%
