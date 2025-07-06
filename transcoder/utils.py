import urllib.parse

def get_url_decoded(url: str) -> str:
    return urllib.parse.unquote(url)