import os
import random
import string
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from PIL import Image
import io

from config import Config
from models import db, PasswordEntry, User, ClipboardItem, ClipboardUsage
from auth import token_required, generate_token, verify_token, get_current_user_id

# 获取项目根目录（backup_files所在目录）
BACKUP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backup_files')
os.makedirs(BACKUP_DIR, exist_ok=True)

def create_app():
    """创建并配置Flask应用"""
    # 获取正确的前端目录路径
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(backend_dir, '..', 'frontend')
    frontend_dir = os.path.abspath(frontend_dir)

    # 创建 Flask 应用,完全禁用静态文件处理
    app = Flask(__name__, static_folder=None)

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
    register_routes(app, frontend_dir)

    return app

def register_routes(app, frontend_dir):
    """注册所有路由"""

    # 主页路由
    @app.route('/')
    def index():
        return send_from_directory(frontend_dir, 'index.html')

    # 处理所有前端页面和静态文件（包括 .html, .css, .js, .png, .jpg, .ico 等）
    @app.route('/<path:filename>')
    def serve_static(filename):
        return send_from_directory(frontend_dir, filename)

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

            # 生成密码备份文件
            try:
                backup_filename = f"password_backup_{user.username}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
                backup_path = os.path.join(BACKUP_DIR, backup_filename)

                backup_content = f"""========================================
    密码管理系统 - 密码备份文件
    ========================================

    用户名: {user.username}
    邮箱: {user.email}
    密码: {data['password']}
    创建时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

    ========================================
    ⚠️  安全提示
    ========================================

    1. 请妥善保管此文件，不要泄露给他人
    2. 建议将此文件存储在安全的位置
    3. 如果忘记密码，可以使用此文件找回
    4. 使用后建议删除此文件或移至其他安全位置

    ========================================
    © 2026 密码管理系统
    ========================================
    """

                with open(backup_path, 'w', encoding='utf-8') as f:
                    f.write(backup_content)

            except Exception as backup_error:
                # 备份文件生成失败不影响注册
                print(f"备份文件生成失败: {str(backup_error)}")

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

    @app.route('/api/auth/forgot-password', methods=['POST'])
    def forgot_password():
        """找回密码 - 查找备份文件"""
        try:
            data = request.get_json()
            username = data.get('username')

            if not username:
                return jsonify({'success': False, 'error': '请提供用户名'}), 400

            # 查找用户
            user = User.query.filter_by(username=username).first()
            if not user:
                return jsonify({'success': False, 'error': '用户不存在'}), 404

            # 查找备份文件
            backup_files = []
            try:
                for filename in os.listdir(BACKUP_DIR):
                    if filename.startswith(f"password_backup_{username}_") and filename.endswith('.txt'):
                        backup_path = os.path.join(BACKUP_DIR, filename)
                        backup_files.append({
                            'filename': filename,
                            'created_at': datetime.fromtimestamp(
                                os.path.getctime(backup_path)
                            ).strftime('%Y-%m-%d %H:%M:%S')
                        })
            except Exception as e:
                print(f"读取备份目录失败: {str(e)}")

            if not backup_files:
                return jsonify({
                    'success': False,
                    'error': '未找到密码备份文件。如果首次注册时未成功创建备份文件，则无法找回密码。'
                }), 404

            # 返回备份文件列表（按时间倒序）
            backup_files.sort(key=lambda x: x['created_at'], reverse=True)

            return jsonify({
                'success': True,
                'message': '找到密码备份文件',
                'data': {
                    'username': username,
                    'email': user.email,
                    'backup_files': backup_files
                }
            })

        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/auth/backup-file/<username>/<filename>', methods=['GET'])
    def get_backup_file(username, filename):
        """获取备份文件内容"""
        try:
            # 安全检查：只允许访问指定用户名的备份文件
            if not filename.startswith(f"password_backup_{username}_") or not filename.endswith('.txt'):
                return jsonify({'success': False, 'error': '无效的备份文件名'}), 400

            backup_path = os.path.join(BACKUP_DIR, filename)

            if not os.path.exists(backup_path):
                return jsonify({'success': False, 'error': '备份文件不存在'}), 404

            # 读取文件内容
            with open(backup_path, 'r', encoding='utf-8') as f:
                content = f.read()

            return jsonify({
                'success': True,
                'data': {
                    'filename': filename,
                    'content': content,
                    'created_at': datetime.fromtimestamp(
                        os.path.getctime(backup_path)
                    ).strftime('%Y-%m-%d %H:%M:%S')
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

    @app.route('/api/passwords/export', methods=['GET'])
    @token_required
    def export_passwords():
        """导出所有密码记录"""
        try:
            user_id = get_current_user_id()
            entries = PasswordEntry.query.filter_by(user_id=user_id).all()

            export_data = [entry.to_dict() for entry in entries]

            return jsonify({
                'success': True,
                'data': export_data,
                'count': len(export_data),
                'export_date': datetime.utcnow().isoformat()
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/passwords/import', methods=['POST'])
    @token_required
    def import_passwords():
        """导入密码记录"""
        try:
            user_id = get_current_user_id()
            data = request.get_json()
            entries_data = data.get('entries', [])

            if not entries_data:
                return jsonify({'success': False, 'error': 'entries数组不能为空'}), 400

            imported_count = 0
            skipped_count = 0
            error_messages = []

            for entry_data in entries_data:
                try:
                    # 验证必填字段
                    if not entry_data.get('site_name') or not entry_data.get('username') or not entry_data.get('password'):
                        error_messages.append(f'跳过缺少必填字段的记录')
                        skipped_count += 1
                        continue

                    # 检查是否已存在（根据网站名和用户名）
                    existing = PasswordEntry.query.filter_by(
                        user_id=user_id,
                        site_name=entry_data.get('site_name'),
                        username=entry_data.get('username')
                    ).first()

                    if existing:
                        skipped_count += 1
                        continue  # 跳过已存在的

                    # 创建新记录
                    entry = PasswordEntry(
                        site_name=entry_data.get('site_name'),
                        site_url=entry_data.get('site_url', ''),
                        username=entry_data.get('username'),
                        password=entry_data.get('password'),
                        notes=entry_data.get('notes', ''),
                        strength=entry_data.get('strength', 'weak'),
                        category=entry_data.get('category', ''),
                        image_filename=entry_data.get('image_filename', ''),
                        user_id=user_id
                    )
                    db.session.add(entry)
                    imported_count += 1
                except Exception as e:
                    error_messages.append(f'导入失败: {str(e)}')
                    skipped_count += 1
                    continue

            db.session.commit()

            return jsonify({
                'success': True,
                'message': f'成功导入 {imported_count} 条记录，跳过 {skipped_count} 条',
                'imported': imported_count,
                'skipped': skipped_count,
                'errors': error_messages
            })
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/passwords/batch-delete', methods=['POST'])
    @token_required
    def batch_delete_passwords():
        """批量删除密码记录"""
        try:
            user_id = get_current_user_id()
            data = request.get_json()
            entry_ids = data.get('entry_ids', [])

            if not entry_ids:
                return jsonify({'success': False, 'error': 'entry_ids数组不能为空'}), 400

            # 查询并删除属于当前用户的记录
            entries = PasswordEntry.query.filter(
                PasswordEntry.id.in_(entry_ids),
                PasswordEntry.user_id == user_id
            ).all()

            # 删除关联的图片
            for entry in entries:
                if entry.image_filename:
                    delete_image_file(entry.image_filename)

            # 批量删除
            deleted_count = PasswordEntry.query.filter(
                PasswordEntry.id.in_(entry_ids),
                PasswordEntry.user_id == user_id
            ).delete(synchronize_session=False)

            db.session.commit()

            return jsonify({
                'success': True,
                'message': f'成功删除 {deleted_count} 条记录'
            })
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/backup', methods=['GET'])
    @token_required
    def export_backup():
        """导出完整备份（包含用户信息和所有密码）"""
        try:
            user_id = get_current_user_id()
            user = User.query.get(user_id)
            entries = PasswordEntry.query.filter_by(user_id=user_id).all()

            backup_data = {
                'version': '1.0',
                'backup_date': datetime.utcnow().isoformat(),
                'user': user.to_dict() if user else None,
                'passwords': [entry.to_dict() for entry in entries],
                'count': len(entries)
            }

            return jsonify({
                'success': True,
                'data': backup_data
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    # ==================== 剪贴板管理 API ====================

    @app.route('/api/clipboard', methods=['GET'])
    @token_required
    def get_clipboard_items():
        """获取剪贴板内容列表"""
        try:
            user_id = get_current_user_id()
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 20, type=int)
            search = request.args.get('search', '')
            category = request.args.get('category', '')
            tag = request.args.get('tag', '')
            is_password = request.args.get('is_password', type=bool)

            # 只查询当前用户的剪贴板
            query = ClipboardItem.query.filter_by(user_id=user_id)

            # 搜索过滤
            if search:
                search_term = f'%{search}%'
                query = query.filter(
                    (ClipboardItem.title.ilike(search_term)) |
                    (ClipboardItem.tags.ilike(search_term))
                )

            # 分类过滤
            if category:
                query = query.filter(ClipboardItem.category == category)

            # 标签过滤
            if tag:
                query = query.filter(ClipboardItem.tags.like(f'%{tag}%'))

            # 密码类型过滤
            if is_password is not None:
                query = query.filter(ClipboardItem.is_password == is_password)

            # 分页
            pagination = query.order_by(ClipboardItem.updated_at.desc()).paginate(
                page=page, per_page=per_page, error_out=False
            )

            return jsonify({
                'success': True,
                'data': [item.to_dict(decrypt=False) for item in pagination.items],
                'total': pagination.total,
                'pages': pagination.pages,
                'current_page': page
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/clipboard/<int:item_id>', methods=['GET'])
    @token_required
    def get_clipboard_item(item_id):
        """获取单个剪贴板内容详情"""
        try:
            user_id = get_current_user_id()
            item = ClipboardItem.query.filter_by(id=item_id, user_id=user_id).first_or_404()

            # 记录查看日志
            usage = ClipboardUsage(user_id=user_id, item_id=item_id, action='view')
            db.session.add(usage)

            return jsonify({'success': True, 'data': item.to_dict(decrypt=True)})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/clipboard', methods=['POST'])
    @token_required
    def create_clipboard_item():
        """创建剪贴板内容"""
        try:
            user_id = get_current_user_id()
            data = request.get_json()

            # 验证必填字段
            if not data.get('content'):
                return jsonify({'success': False, 'error': '内容为必填字段'}), 400

            # 创建记录
            item = ClipboardItem(
                title=data.get('title', '未命名剪贴板'),
                category=data.get('category', ''),
                tags=data.get('tags', ''),
                is_password=data.get('is_password', False),
                use_count=0,
                user_id=user_id
            )
            item.set_content(data['content'])

            db.session.add(item)
            db.session.commit()

            return jsonify({'success': True, 'data': item.to_dict(decrypt=False)}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/clipboard/<int:item_id>', methods=['PUT'])
    @token_required
    def update_clipboard_item(item_id):
        """更新剪贴板内容"""
        try:
            user_id = get_current_user_id()
            item = ClipboardItem.query.filter_by(id=item_id, user_id=user_id).first_or_404()
            data = request.get_json()

            # 更新字段
            if 'title' in data:
                item.title = data['title']
            if 'category' in data:
                item.category = data['category']
            if 'tags' in data:
                item.tags = data['tags']
            if 'is_password' in data:
                item.is_password = data['is_password']
            if 'content' in data:
                item.set_content(data['content'])

            item.updated_at = datetime.utcnow()
            db.session.commit()

            # 记录编辑日志
            usage = ClipboardUsage(user_id=user_id, item_id=item_id, action='edit')
            db.session.add(usage)
            db.session.commit()

            return jsonify({'success': True, 'data': item.to_dict(decrypt=False)})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/clipboard/<int:item_id>', methods=['DELETE'])
    @token_required
    def delete_clipboard_item(item_id):
        """删除剪贴板内容"""
        try:
            user_id = get_current_user_id()
            item = ClipboardItem.query.filter_by(id=item_id, user_id=user_id).first_or_404()

            # 记录删除日志
            usage = ClipboardUsage(user_id=user_id, item_id=item_id, action='delete')
            db.session.add(usage)

            db.session.delete(item)
            db.session.commit()

            return jsonify({'success': True, 'message': '删除成功'})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/clipboard/<int:item_id>/copy', methods=['POST'])
    @token_required
    def copy_clipboard_item(item_id):
        """复制剪贴板内容"""
        try:
            user_id = get_current_user_id()
            item = ClipboardItem.query.filter_by(id=item_id, user_id=user_id).first_or_404()

            # 增加使用计数
            item.use_count = (item.use_count or 0) + 1
            item.last_used = datetime.utcnow()

            # 记录复制日志
            usage = ClipboardUsage(user_id=user_id, item_id=item_id, action='copy')
            db.session.add(usage)
            db.session.commit()

            return jsonify({
                'success': True,
                'data': {
                    'content': item.get_content(),
                    'use_count': item.use_count
                }
            })
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/clipboard/batch', methods=['POST'])
    @token_required
    def batch_create_clipboard():
        """批量创建剪贴板内容"""
        try:
            user_id = get_current_user_id()
            data = request.get_json()
            items_data = data.get('items', [])

            if not items_data:
                return jsonify({'success': False, 'error': 'items数组不能为空'}), 400

            created_items = []
            for item_data in items_data:
                if not item_data.get('content'):
                    continue

                item = ClipboardItem(
                    title=item_data.get('title', '未命名剪贴板'),
                    category=item_data.get('category', ''),
                    tags=item_data.get('tags', ''),
                    is_password=item_data.get('is_password', False),
                    user_id=user_id
                )
                item.set_content(item_data['content'])
                db.session.add(item)
                created_items.append(item)

            db.session.commit()

            return jsonify({
                'success': True,
                'message': f'成功创建 {len(created_items)} 条记录',
                'data': [item.to_dict(decrypt=False) for item in created_items]
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/clipboard/batch/delete', methods=['POST'])
    @token_required
    def batch_delete_clipboard():
        """批量删除剪贴板内容"""
        try:
            user_id = get_current_user_id()
            data = request.get_json()
            item_ids = data.get('item_ids', [])

            if not item_ids:
                return jsonify({'success': False, 'error': 'item_ids数组不能为空'}), 400

            # 删除属于当前用户的记录
            deleted_count = ClipboardItem.query.filter(
                ClipboardItem.id.in_(item_ids),
                ClipboardItem.user_id == user_id
            ).delete(synchronize_session=False)

            db.session.commit()

            return jsonify({
                'success': True,
                'message': f'成功删除 {deleted_count} 条记录'
            })
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/clipboard/categories', methods=['GET'])
    @token_required
    def get_clipboard_categories():
        """获取剪贴板所有分类"""
        try:
            user_id = get_current_user_id()
            categories = db.session.query(ClipboardItem.category).filter(
                ClipboardItem.user_id == user_id,
                ClipboardItem.category != '',
                ClipboardItem.category.isnot(None)
            ).distinct().all()

            return jsonify({
                'success': True,
                'data': [cat[0] for cat in categories if cat[0]]
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/clipboard/tags', methods=['GET'])
    @token_required
    def get_clipboard_tags():
        """获取剪贴板所有标签"""
        try:
            user_id = get_current_user_id()
            items = ClipboardItem.query.filter_by(user_id=user_id).all()

            # 提取并合并所有标签
            all_tags = set()
            for item in items:
                if item.tags:
                    tags = [tag.strip() for tag in item.tags.split(',')]
                    all_tags.update(tags)

            return jsonify({
                'success': True,
                'data': sorted(list(all_tags))
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/clipboard/export', methods=['GET'])
    @token_required
    def export_clipboard():
        """导出剪贴板数据"""
        try:
            user_id = get_current_user_id()
            items = ClipboardItem.query.filter_by(user_id=user_id).all()

            export_data = [item.to_dict(decrypt=True) for item in items]

            return jsonify({
                'success': True,
                'data': export_data,
                'count': len(export_data)
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/clipboard/import', methods=['POST'])
    @token_required
    def import_clipboard():
        """导入剪贴板数据"""
        try:
            user_id = get_current_user_id()
            data = request.get_json()
            items_data = data.get('items', [])

            if not items_data:
                return jsonify({'success': False, 'error': 'items数组不能为空'}), 400

            imported_count = 0
            for item_data in items_data:
                if not item_data.get('content'):
                    continue

                # 检查是否已存在（根据标题和内容）
                existing = ClipboardItem.query.filter_by(
                    user_id=user_id,
                    title=item_data.get('title', '')
                ).first()

                if existing:
                    continue  # 跳过已存在的

                item = ClipboardItem(
                    title=item_data.get('title', '未命名剪贴板'),
                    category=item_data.get('category', ''),
                    tags=item_data.get('tags', ''),
                    is_password=item_data.get('is_password', False),
                    user_id=user_id
                )
                item.set_content(item_data['content'])
                db.session.add(item)
                imported_count += 1

            db.session.commit()

            return jsonify({
                'success': True,
                'message': f'成功导入 {imported_count} 条记录'
            })
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/clipboard/stats', methods=['GET'])
    @token_required
    def get_clipboard_stats():
        """获取剪贴板统计信息"""
        try:
            user_id = get_current_user_id()

            total_items = ClipboardItem.query.filter_by(user_id=user_id).count()
            password_items = ClipboardItem.query.filter_by(user_id=user_id, is_password=True).count()

            # 获取最近使用次数最多的项目
            top_items = ClipboardItem.query.filter_by(user_id=user_id).order_by(
                ClipboardItem.use_count.desc()
            ).limit(5).all()

            # 最近添加的项目
            recent_items = ClipboardItem.query.filter_by(user_id=user_id).order_by(
                ClipboardItem.created_at.desc()
            ).limit(5).all()

            return jsonify({
                'success': True,
                'data': {
                    'total_items': total_items,
                    'password_items': password_items,
                    'text_items': total_items - password_items,
                    'top_items': [item.to_dict(decrypt=False) for item in top_items],
                    'recent_items': [item.to_dict(decrypt=False) for item in recent_items]
                }
            })
        except Exception as e:
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
