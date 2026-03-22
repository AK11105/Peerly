import json
import re
import uuid
import requests
from app.models import Node, ScaffoldNode, GapDetectionResult

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL = "llama3"


def _call_ollama(prompt: str) -> str:
    """Calls Ollama. keep_alive keeps model loaded between requests."""
    response = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "keep_alive": "10m",
        },
        timeout=300,
    )
    response.raise_for_status()
    return response.json()["message"]["content"]


def _parse_json(raw: str) -> dict | list:
    cleaned = raw.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
    if fence_match:
        try:
            return json.loads(fence_match.group(1).strip())
        except json.JSONDecodeError:
            pass
    for pattern in (r"(\{[\s\S]*\})", r"(\[[\s\S]*\])"):
        match = re.search(pattern, cleaned)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
    raise ValueError(f"Could not extract valid JSON:\n{raw[:300]}")


def generate_weave(topic: str, seed_nodes: list[str] = [], include_scaffolds: bool = True) -> list[Node]:
    seed_hint = f"\nInclude these concepts: {', '.join(seed_nodes)}." if seed_nodes else ""

    prompt = f"""You are a curriculum designer. Build a learning map for: "{topic}".{seed_hint}

Generate 6-8 knowledge nodes ordered by prerequisite depth.
Rules: depth starts at 0 (foundation). difficulty 1-5. Each node: title (max 5 words) + 1-2 sentence description.

Output ONLY a JSON array:
[{{"title":"..","description":"..","depth":0,"difficulty":1}}, ...]"""

    raw = _call_ollama(prompt)
    parsed = _parse_json(raw)
    # AI-generated nodes are scaffolds — humans contribute to replace them
    return [
        Node(
            id=str(uuid.uuid4()),
            title=item["title"],
            description=item["description"],
            depth=int(item["depth"]),
            difficulty=int(item["difficulty"]),
            is_scaffold=include_scaffolds,
            contributed_by=None,
        )
        for item in parsed
    ]


def detect_gap(existing_nodes: list[Node], new_title: str, new_description: str) -> GapDetectionResult:
    max_depth = max((n.depth for n in existing_nodes), default=0)
    used = sorted(set((n.depth, n.difficulty) for n in existing_nodes))
    used_str = ", ".join(f"({d},{diff})" for d, diff in used)
    summary = "\n".join(f"- [{n.depth}/{n.difficulty}] {n.title}" for n in existing_nodes)

    prompt = f"""Review this learning map for missing prerequisites.

Existing nodes:
{summary}

Max depth: {max_depth}. Used (depth,difficulty) slots: {used_str}

New node: "{new_title}" — {new_description}

Does this new node require knowledge NOT covered above?

If YES: {{"gap_detected":true,"missing_concept":"name","scaffold_node":{{"title":"short title","description":"1-2 sentences.","depth":<int less than new node depth>,"difficulty":<1-5 not in used slots>}}}}
If NO: {{"gap_detected":false,"missing_concept":null,"scaffold_node":null}}

Output ONLY the JSON."""

    raw = _call_ollama(prompt)
    parsed = _parse_json(raw)

    if not parsed.get("gap_detected") or not parsed.get("scaffold_node"):
        return GapDetectionResult(gap_detected=False)

    s = parsed["scaffold_node"]
    return GapDetectionResult(
        gap_detected=True,
        missing_concept=parsed.get("missing_concept"),
        scaffold_node=ScaffoldNode(
            id=str(uuid.uuid4()),
            title=s["title"],
            description=s["description"],
            depth=int(s["depth"]),
            difficulty=int(s["difficulty"]),
        ),
    )


def explain_node(title: str, description: str, topic: str, depth: int, difficulty: int) -> str:
    """Generate a 400-600 word deep-dive explainer for a node."""
    level = ["foundational", "core", "intermediate", "advanced", "expert"][min(depth, 4)]
    diff_label = ["", "beginner", "easy", "intermediate", "advanced", "expert"][min(difficulty, 5)]

    prompt = f"""You are an expert teacher writing a deep-dive explanation for a learning platform.

Topic: {topic}
Node: {title}
Summary: {description}
Level: {level} ({diff_label} difficulty)

Write a clear, engaging 400-600 word explanation of "{title}" for someone learning {topic}.

Structure your response like this:
## What it is
One paragraph explaining the concept clearly.

## Why it matters
One paragraph on why this is important in {topic}.

## How it works
2-3 paragraphs explaining the mechanics, with a concrete example or analogy.

## Key takeaway
One short paragraph summarising what the learner should remember.

Write in plain English. Be concrete. Use analogies where helpful. No bullet lists in the main body — flowing prose only. Do not use markdown bold (**text**). Use ## for section headers only."""

    return _call_ollama(prompt)
