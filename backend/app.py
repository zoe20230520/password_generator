import os
import random
import string
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from PIL import Image
import io

from config import Config
from models import db, PasswordEntry, User
from auth import token_required, generate_token, verify_token, get_current_user_id

def create_app():
    """创建并配置Flask应用"""
    app = Flask(__name__, static_folder='../frontend', static_url_path='')
    app.config.from_object(Config)

    # 启用CORS
    CORS(app)

    # 初始化数据库
    db.init_app(app)

    # 确保上传目录存在
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # 创建数据库表
    with app.app_context():
        db.create_all()

    # 注册路由
    register_routes(app)

    return app

def register_routes(app):
    """注册所有路由"""

    # 主页路由
    @app.route('/')
    def index():
        return send_from_directory(app.static_folder, 'index.html')

    # ==================== 认证 API ====================

    @app.route('/api/auth/register', methods=['POST'])
    def register():
        """用户注册"""
        try:
            data = request.get_json()

            # 验证必填字段
            if not data.get('username') or not data.get('email') or not data.get('password'):
                return jsonify({'success': False, 'error': '用户名、邮箱和密码为必填字段'}), 400

            # 检查用户名是否已存在
            if User.query.filter_by(username=data['username']).first():
                return jsonify({'success': False, 'error': '用户名已存在'}), 400

            # 检查邮箱是否已存在
            if User.query.filter_by(email=data['email']).first():
                return jsonify({'success': False, 'error': '邮箱已被注册'}), 400

            # 验证密码长度
            if len(data['password']) < 6:
                return jsonify({'success': False, 'error': '密码长度至少为6位'}), 400

            # 创建用户
            user = User(
                username=data['username'],
                email=data['email']
            )
            user.set_password(data['password'])

            db.session.add(user)
            db.session.commit()

            return jsonify({
                'success': True,
                'message': '注册成功',
                'data': user.to_dict()
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/auth/login', methods=['POST'])
    def login():
        """用户登录"""
        try:
            data = request.get_json()

            # 验证必填字段
            if not data.get('username') or not data.get('password'):
                return jsonify({'success': False, 'error': '用户名和密码为必填字段'}), 400

            # 查找用户
            user = User.query.filter_by(username=data['username']).first()

            # 验证密码
            if not user or not user.check_password(data['password']):
                return jsonify({'success': False, 'error': '用户名或密码错误'}), 401

            # 生成 token
            token = generate_token(user.id)

            return jsonify({
                'success': True,
                'message': '登录成功',
                'data': {
                    'token': token,
                    'user': user.to_dict()
                }
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/auth/me', methods=['GET'])
    @token_required
    def get_current_user():
        """获取当前登录用户信息"""
        try:
            user_id = get_current_user_id()
            user = User.query.get(user_id)

            if not user:
                return jsonify({'success': False, 'error': '用户不存在'}), 404

            return jsonify({
                'success': True,
                'data': user.to_dict()
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    # ==================== 密码记录管理API ====================

    @app.route('/api/passwords', methods=['GET'])
    @token_required
    def get_passwords():
        """获取密码列表"""
        try:
            user_id = get_current_user_id()
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 20, type=int)
            search = request.args.get('search', '')
            category = request.args.get('category', '')

            # 只查询当前用户的密码
            query = PasswordEntry.query.filter_by(user_id=user_id)

            # 搜索过滤
            if search:
                search_term = f'%{search}%'
                query = query.filter(
                    (PasswordEntry.site_name.ilike(search_term)) |
                    (PasswordEntry.username.ilike(search_term)) |
                    (PasswordEntry.notes.ilike(search_term))
                )

            # 分类过滤
            if category:
                query = query.filter(PasswordEntry.category == category)

            # 分页
            pagination = query.order_by(PasswordEntry.updated_at.desc()).paginate(
                page=page, per_page=per_page, error_out=False
            )

            return jsonify({
                'success': True,
                'data': [item.to_dict_masked() for item in pagination.items],
                'total': pagination.total,
                'pages': pagination.pages,
                'current_page': page
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/passwords/<int:entry_id>', methods=['GET'])
    @token_required
    def get_password(entry_id):
        """获取单个密码详情"""
        try:
            user_id = get_current_user_id()
            entry = PasswordEntry.query.filter_by(id=entry_id, user_id=user_id).first_or_404()
            return jsonify({'success': True, 'data': entry.to_dict()})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/passwords', methods=['POST'])
    @token_required
    def create_password():
        """创建密码记录"""
        try:
            user_id = get_current_user_id()
            data = request.get_json()

            # 验证必填字段
            if not data.get('site_name') or not data.get('username') or not data.get('password'):
                return jsonify({'success': False, 'error': '网站名称、用户名和密码为必填字段'}), 400

            # 创建记录
            entry = PasswordEntry(
                site_name=data['site_name'],
                site_url=data.get('site_url', ''),
                username=data['username'],
                password=data['password'],
                notes=data.get('notes', ''),
                strength=data.get('strength', ''),
                category=data.get('category', ''),
                image_filename=data.get('image_filename', ''),
                user_id=user_id  # 关联当前用户
            )

            db.session.add(entry)
            db.session.commit()

            return jsonify({'success': True, 'data': entry.to_dict_masked()}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/passwords/<int:entry_id>', methods=['PUT'])
    @token_required
    def update_password(entry_id):
        """更新密码记录"""
        try:
            user_id = get_current_user_id()
            entry = PasswordEntry.query.filter_by(id=entry_id, user_id=user_id).first_or_404()
            data = request.get_json()

            # 更新字段
            if 'site_name' in data:
                entry.site_name = data['site_name']
            if 'site_url' in data:
                entry.site_url = data['site_url']
            if 'username' in data:
                entry.username = data['username']
            if 'password' in data:
                entry.password = data['password']
            if 'notes' in data:
                entry.notes = data['notes']
            if 'strength' in data:
                entry.strength = data['strength']
            if 'category' in data:
                entry.category = data['category']
            if 'image_filename' in data:
                # 删除旧图片
                if entry.image_filename and entry.image_filename != data['image_filename']:
                    delete_image_file(entry.image_filename)
                entry.image_filename = data['image_filename']

            entry.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({'success': True, 'data': entry.to_dict_masked()})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/passwords/<int:entry_id>', methods=['DELETE'])
    @token_required
    def delete_password(entry_id):
        """删除密码记录"""
        try:
            user_id = get_current_user_id()
            entry = PasswordEntry.query.filter_by(id=entry_id, user_id=user_id).first_or_404()

            # 删除关联的图片
            if entry.image_filename:
                delete_image_file(entry.image_filename)

            db.session.delete(entry)
            db.session.commit()

            return jsonify({'success': True, 'message': '删除成功'})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500

    # ==================== 辅助功能API ====================

    @app.route('/api/generate-password', methods=['POST'])
    @token_required
    def generate_password():
        """生成随机密码"""
        try:
            data = request.get_json()
            length = data.get('length', 12)

            if length < 6 or length > 32:
                return jsonify({'success': False, 'error': '密码长度必须在6-32位之间'}), 400

            use_letters = data.get('letters', True)
            use_numbers = data.get('numbers', True)
            use_symbols = data.get('symbols', True)

            if not any([use_letters, use_numbers, use_symbols]):
                return jsonify({'success': False, 'error': '至少选择一种字符类型'}), 400

            # 构建字符集
            chars = ''
            if use_letters:
                chars += string.ascii_letters
            if use_numbers:
                chars += string.digits
            if use_symbols:
                chars += '!@#$%^&*()_+-=[]{}|;:,.<>?'

            # 生成密码
            password = ''.join(random.choice(chars) for _ in range(length))

            # 计算强度
            strength = calculate_password_strength(password)

            return jsonify({
                'success': True,
                'data': {
                    'password': password,
                    'strength': strength
                }
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/categories', methods=['GET'])
    @token_required
    def get_categories():
        """获取所有分类"""
        try:
            user_id = get_current_user_id()
            categories = db.session.query(PasswordEntry.category).filter(
                PasswordEntry.user_id == user_id,
                PasswordEntry.category != '',
                PasswordEntry.category.isnot(None)
            ).distinct().all()

            return jsonify({
                'success': True,
                'data': [cat[0] for cat in categories if cat[0]]
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/uploads/<filename>')
    @token_required
    def get_uploaded_file(filename):
        """获取上传的图片"""
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    @app.route('/api/upload', methods=['POST'])
    @token_required
    def upload_image():
        """上传图片"""
        try:
            if 'file' not in request.files:
                return jsonify({'success': False, 'error': '未选择文件'}), 400

            file = request.files['file']
            if file.filename == '':
                return jsonify({'success': False, 'error': '未选择文件'}), 400

            # 验证文件类型
            if not allowed_file(file.filename, app.config['ALLOWED_EXTENSIONS']):
                return jsonify({'success': False, 'error': '不支持的文件格式'}), 400

            # 生成唯一文件名
            filename = generate_unique_filename(file.filename)

            # 优化并保存图片
            image = Image.open(file)

            # 缩放到最大尺寸
            image.thumbnail((app.config['MAX_IMAGE_SIZE'], app.config['MAX_IMAGE_SIZE']))

            # 保存
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            image.save(filepath, quality=app.config['IMAGE_QUALITY'], optimize=True)

            return jsonify({
                'success': True,
                'data': {
                    'filename': filename,
                    'url': f'/api/uploads/{filename}'
                }
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/upload/<filename>', methods=['DELETE'])
    @token_required
    def delete_image(filename):
        """删除图片"""
        try:
            if delete_image_file(filename):
                return jsonify({'success': True, 'message': '删除成功'})
            else:
                return jsonify({'success': False, 'error': '文件不存在'}), 404
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    # ==================== 工具函数 ====================

def calculate_password_strength(password):
    """计算密码强度"""
    score = 0
    length = len(password)

    # 长度评分
    if length >= 8:
        score += 1
    if length >= 12:
        score += 1
    if length >= 16:
        score += 1

    # 字符类型评分
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_symbol = any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in password)

    if has_upper and has_lower:
        score += 1
    if has_digit:
        score += 1
    if has_symbol:
        score += 1

    # 转换为强度等级
    if score <= 2:
        return 'extreme-weak'
    elif score == 3:
        return 'weak'
    elif score == 4:
        return 'medium'
    elif score == 5:
        return 'strong'
    else:
        return 'extreme-strong'

def allowed_file(filename, allowed_extensions):
    """检查文件扩展名是否允许"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

def generate_unique_filename(filename):
    """生成唯一文件名"""
    from uuid import uuid4
    ext = filename.rsplit('.', 1)[1].lower()
    return f"{uuid4().hex}.{ext}"

def delete_image_file(filename):
    """删除图片文件"""
    try:
        filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
            return True
        return False
    except Exception:
        return False

# 运行应用
if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
