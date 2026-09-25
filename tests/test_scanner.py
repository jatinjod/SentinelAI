from services.scanner import scan_file


def test_detect_hardcoded_secrets():
    findings = scan_file("tests/sample_vulnerable.py")

    assert len(findings) == 2
    assert findings[0]["type"] == "hardcoded_secret"
    assert findings[0]["severity"] == "high"
    assert findings[1]["type"] == "hardcoded_secret"