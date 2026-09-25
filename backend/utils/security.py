from cryptography.fernet import Fernet

from config import GITHUB_ENCRYPTION_KEY


def get_cipher():
    if not GITHUB_ENCRYPTION_KEY:
        raise ValueError("GITHUB_ENCRYPTION_KEY is not configured.")

    return Fernet(GITHUB_ENCRYPTION_KEY.encode())


def encrypt_token(token: str) -> str:
    cipher = get_cipher()
    return cipher.encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    cipher = get_cipher()
    return cipher.decrypt(encrypted_token.encode()).decode()