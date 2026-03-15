import json
import os
from app.models import Weave

STORE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "weaves.json")


def _ensure_store():
    os.makedirs(os.path.dirname(STORE_PATH), exist_ok=True)
    if not os.path.exists(STORE_PATH):
        with open(STORE_PATH, "w") as f:
            json.dump({}, f)


def load_all() -> dict[str, dict]:
    _ensure_store()
    with open(STORE_PATH, "r") as f:
        return json.load(f)


def save_all(data: dict):
    _ensure_store()
    with open(STORE_PATH, "w") as f:
        json.dump(data, f, indent=2)


def get_weave(weave_id: str) -> Weave | None:
    data = load_all()
    raw = data.get(weave_id)
    if not raw:
        return None
    return Weave(**raw)


def save_weave(weave: Weave):
    data = load_all()
    data[weave.id] = weave.model_dump()
    save_all(data)


def delete_weave(weave_id: str) -> bool:
    data = load_all()
    if weave_id not in data:
        return False
    del data[weave_id]
    save_all(data)
    return True


def list_weaves() -> list[Weave]:
    data = load_all()
    return [Weave(**v) for v in data.values()]
