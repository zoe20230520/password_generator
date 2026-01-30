"""
数据库迁移脚本 - 添加剪贴板相关表
"""
import sys
import os

# 添加项目根目录到路径
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from backend.app import create_app, db

def migrate():
    """执行数据库迁移"""
    app = create_app()

    with app.app_context():
        print("开始数据库迁移...")

        # 创建新表
        db.create_all()

        # 检查表是否创建成功
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()

        print("迁移完成！")
        print(f"当前数据库中的表: {', '.join(tables)}")
        print("新增表:")
        print("  - clipboard_items (剪贴板内容表)")
        print("  - clipboard_usage (剪贴板使用统计表)")

if __name__ == '__main__':
    migrate()
