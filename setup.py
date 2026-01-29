"""
密码管理系统 - 安装配置文件
作者: zoecc
版本: v1.0
"""

from setuptools import setup, find_packages

# 读取 README 文件
with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

# 读取依赖列表
with open("backend/requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="password-manager-zoecc",
    version="1.0.0",
    author="zoecc",
    author_email="",
    description="一个安全、便捷的密码管理解决方案",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/zoecc/password-manager",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: End Users/Desktop",
        "Topic :: Security :: Cryptography",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.7",
    install_requires=requirements,
    include_package_data=True,
    entry_points={
        "console_scripts": [
            "password-manager=backend.app:create_app",
        ],
    },
)
