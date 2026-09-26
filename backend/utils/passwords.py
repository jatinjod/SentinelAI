import base64
import hashlib
import hmac
import secrets


_SCRYPT_N = 2**14
_SCRYPT_R = 8
_SCRYPT_P = 1
_DKLEN = 64
_SALT_BYTES = 16


def hash_password(password: str) -> str:
    if not password:
        raise ValueError("Password cannot be empty.")

    salt = secrets.token_bytes(_SALT_BYTES)
    derived_key = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=_SCRYPT_N,
        r=_SCRYPT_R,
        p=_SCRYPT_P,
        dklen=_DKLEN,
    )

    return "$scrypt$1$" + ".".join(
        [
            base64.urlsafe_b64encode(salt).decode("ascii").rstrip("="),
            base64.urlsafe_b64encode(derived_key).decode("ascii").rstrip("="),
        ]
    )


def verify_password(password: str, encoded: str | None) -> bool:
    if not password or not encoded:
        return False

    try:
        parts = encoded.split("$", 3)
        if len(parts) != 4 or parts[1] != "scrypt" or parts[2] != "1":
            return False

        salt_b64, key_b64 = parts[3].split(".", 1)
        salt = base64.urlsafe_b64decode(salt_b64 + "=" * (-len(salt_b64) % 4))
        expected_key = base64.urlsafe_b64decode(
            key_b64 + "=" * (-len(key_b64) % 4)
        )

        derived_key = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=_SCRYPT_N,
            r=_SCRYPT_R,
            p=_SCRYPT_P,
            dklen=len(expected_key),
        )

        return hmac.compare_digest(derived_key, expected_key)
    except (ValueError, IndexError, base64.binascii.Error):
        return False
