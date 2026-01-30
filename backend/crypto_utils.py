"""
AES加密工具模块
用于剪贴板内容的加密和解密
"""
import os
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64
import os


class CryptoManager:
    """加密管理器"""

    def __init__(self, password=None):
        """
        初始化加密管理器

        Args:
            password: 加密密码，如果为None则使用系统默认密钥
        """
        self.password = password or os.environ.get('ENCRYPTION_KEY', 'default-secret-key-change-this')
        self.fernet = self._get_fernet()

    def _get_fernet(self):
        """从密码生成Fernet实例"""
        # 使用PBKDF2从密码派生密钥
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'salt_value_should_be_random',
            iterations=100000,
            backend=default_backend()
        )
        key = base64.urlsafe_b64encode(kdf.derive(self.password.encode()))
        return Fernet(key)

    def encrypt(self, data):
        """
        加密数据

        Args:
            data: 待加密的字符串

        Returns:
            加密后的字符串（Base64编码）
        """
        if not data:
            return ''
        encrypted = self.fernet.encrypt(data.encode())
        return base64.urlsafe_b64encode(encrypted).decode()

    def decrypt(self, encrypted_data):
        """
        解密数据

        Args:
            encrypted_data: 加密的字符串

        Returns:
            解密后的原始字符串
        """
        if not encrypted_data:
            return ''
        try:
            decoded = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted = self.fernet.decrypt(decoded)
            return decrypted.decode()
        except Exception as e:
            raise ValueError(f"解密失败: {str(e)}")


# 从环境变量获取加密密钥
_ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY', 'default-secret-key-change-this')

# 全局加密管理器实例
crypto = CryptoManager(password=_ENCRYPTION_KEY)
