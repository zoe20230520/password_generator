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
    # 收集备份目录（保留.gitkeep）
    (os.path.join(project_root, 'backup_files'), 'backup_files'),
    # 收集数据库文件（如果存在）
    (os.path.join(project_root, 'database.db'), '.'),  # 临时文件，运行时会自动创建
]

block_cipher = None

a = Analysis(
    ['app.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=[
        'flask',
        'flask_cors',
        'sqlalchemy',
        'jwt',
        'pillow',
        'werkzeug',
        'cryptography',
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
    [],
    exclude_binaries=True,
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

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='PasswordManager',
    debug=False,
    bootloader_ignore_signals=False,
    strip_binaries=False,
    zipname=None,
)
