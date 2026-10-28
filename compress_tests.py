from pathlib import Path
p = Path("src/data/lessons/l2-3-3.ts")
s = p.read_text(encoding="utf-8")
start_marker = "# ---- services/ai/tests/test_suggest.py ----"
end_marker = 'assert normalise("Crème  Brûlée!") == "creme brulee"` },'
start = s.index(start_marker)
end = s.index(end_marker) + len(end_marker)
new = '''# ---- services/ai/tests/test_suggest.py ----
import pytest
from fastapi.testclient import TestClient
from devatlas_ai.api import CONTENT, create_app
from devatlas_ai.suggest import Suggestion, SuggestTrie, normalise
@pytest.fixture
def client():
    with TestClient(create_app(CONTENT)) as c:
        yield c
def texts(client, q):
    resp = client.get("/suggest", params={"q": q})
    assert resp.status_code == 200
    return [s["text"] for s in resp.json()]
def test_ranking_and_normalisation(client):
    assert texts(client, "h") == ["Big-O and hash maps", "Trees, BSTs and heaps", "Hash map", "Heap", "Hash function"]
    assert texts(client, "DEJA") == ["Déjà vu bug"]
    assert texts(client, "  binary   SE") == ["Recursion, sorting and binary search", "Binary search"]
    assert texts(client, "s").count("Recursion, sorting and binary search") == 1
def test_validation_and_unit(client):
    assert texts(client, "zzz") == []
    assert texts(client, "!!!") == []      # empty after normalising
    assert client.get("/suggest", params={"q": ""}).status_code == 422
    assert client.get("/suggest", params={"q": "x" * 65}).status_code == 422
    assert client.get("/suggest").status_code == 422
    t = SuggestTrie()
    t.insert(Suggestion("Docker", "term", 90)); t.insert(Suggestion("docs", "term", 40))
    assert [s.text for s in t.suggest("DOC", k=1)] == ["Docker"]
    assert normalise("Crème  Brûlée!") == "creme brulee"` },'''
s = s[:start] + new + s[end:]
p.write_text(s, encoding="utf-8")
print("ok")
