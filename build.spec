# -*- mode: python ; coding: utf-8 -*-
# PyInstaller 打包配置文件
# 用于将 Flask 应用打包成单个 EXE 文件

import sys
import os
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

# 项目根目录
project_root = os.path.dirname(os.path.abspath(SPEC))

# 数据收集
datas = [
    # 收集前端文件
    (os.path.join(project_root, 'frontend'), 'frontend'),
    # 收集后端文件
    (os.path.join(project_root, 'backend'), 'backend'),
    # 收集备份目录（保留.gitkeep）
    (os.path.join(project_root, 'backup_files'), 'backup_files'),
    # 收集数据库文件（如果存在）
    (os.path.join(project_root, 'database.db'), '.'),  # 临时文件，运行时会自动创建
]

# 收集 Pillow 数据文件
datas += collect_data_files('Pillow', include_py_files=True)

block_cipher = None

a = Analysis(
    ['run_app.py'],
    pathex=[project_root],
    binaries=[],
    datas=datas,
    hiddenimports=[
        'flask',
        'flask_cors',
        'flask_sqlalchemy',
        'sqlalchemy',
        'sqlalchemy.dialects',
        'sqlalchemy.dialects.sqlite',
        'sqlalchemy.orm',
        'jwt',
        'PyJWT',
        'PIL',
        'PIL._tkinter_finder',
        'PIL.Image',
        'PIL.ImageDraw',
        'PIL.ImageFont',
        'PIL.ImageFilter',
        'PIL.ImageEnhance',
        'pillow',
        'werkzeug',
        'werkzeug.serving',
        'werkzeug.middleware',
        'cryptography',
        'cryptography.fernet',
        'cryptography.hazmat',
        'cryptography.hazmat.primitives',
        'cryptography.hazmat.primitives.ciphers',
        'cryptography.hazmat.primitives.ciphers.modes',
        'cryptography.hazmat.primitives.ciphers.algorithms',
        'cryptography.hazmat.primitives.hashes',
        'cryptography.hazmat.primitives.kdf',
        'cryptography.hazmat.primitives.kdf.pbkdf2',
        'cryptography.hazmat.primitives.serialization',
        'cryptography.hazmat.primitives.asymmetric',
        'cryptography.hazmat.primitives.asymmetric.padding',
        'cryptography.hazmat.primitives.asymmetric.rsa',
        'cryptography.hazmat.backends',
        'cryptography.hazmat.backends.default_backend',
        'cryptography.hazmat.backends.openssl',
        'cryptography.exceptions',
        'config',
        'models',
        'auth',
        'crypto_utils',
        'app',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='PasswordManager',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # 隐藏控制台窗口
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # 可以添加 .ico 图标文件路径
    version_file=None,
)
