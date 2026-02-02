#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
临时打包启动脚本
将所有模块整合在一起打包
"""

import os
import sys

# 添加当前目录到路径
if getattr(sys, 'frozen', False):
    # 打包后的环境 - 所有文件在 _MEIPASS 目录
    base_path = sys._MEIPASS
    # 将 backend 目录添加到路径
    backend_path = os.path.join(base_path, 'backend')
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)
    if base_path not in sys.path:
        sys.path.insert(0, base_path)
else:
    # 开发环境
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(current_dir, 'backend')
    # 添加到系统路径
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    if current_dir not in sys.path:
        sys.path.insert(0, current_dir)

# 导入并运行 Flask 应用
import webbrowser
import threading
import time

# 设置工作目录为 EXE 所在目录（确保数据持久化）
if getattr(sys, 'frozen', False):
    # 打包后的环境 - 使用 EXE 所在目录
    exe_dir = os.path.dirname(sys.executable)
    os.chdir(exe_dir)
else:
    # 开发环境 - 使用项目根目录
    project_root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_root)

from app import create_app

app = create_app()

# 延迟打开浏览器
def open_browser():
    time.sleep(1.5)
    webbrowser.open('http://localhost:5000')

if __name__ == '__main__':
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.daemon = True
    browser_thread.start()

    app.run(debug=False, host='0.0.0.0', port=5000, use_reloader=False)
