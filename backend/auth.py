import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from models import User
from config import Config

# JWT 配置 - 使用统一的配置
SECRET_KEY = Config.SECRET_KEY

def generate_token(user_id):
    """生成 JWT token"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7),  # token 有效期 7 天
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def verify_token(token):
    """验证 JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    """认证装饰器：保护需要登录的接口"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # 从请求头获取 token
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({'success': False, 'error': '无效的认证格式'}), 401

        if not token:
            return jsonify({'success': False, 'error': '未提供认证令牌'}), 401

        user_id = verify_token(token)
        if not user_id:
            return jsonify({'success': False, 'error': '认证令牌无效或已过期'}), 401

        # 将 user_id 存入 flask.g 供后续使用
        from flask import g
        g.user_id = user_id

        return f(*args, **kwargs)

    return decorated

def get_current_user_id():
    """获取当前登录用户的 ID"""
    from flask import g
    return getattr(g, 'user_id', None)
