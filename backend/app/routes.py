import uuid
import threading
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.models import (
    Weave, Node,
    GenerateWeaveRequest,
    ContributeNodeRequest,
    AddNodeRequest,
    GapDetectionResult,
)
from app import store, ai

router = APIRouter()


# ── Weave endpoints ────────────────────────────────────────────────────────

@router.get("/weaves", response_model=list[Weave])
def list_weaves():
    return store.list_weaves()


@router.get("/weaves/{weave_id}", response_model=Weave)
def get_weave(weave_id: str):
    weave = store.get_weave(weave_id)
    if not weave:
        raise HTTPException(status_code=404, detail="Weave not found")
    return weave


@router.post("/weaves/generate", response_model=Weave)
def generate_weave(body: GenerateWeaveRequest):
    """AI-generate a full weave. This is the only blocking AI call — user waits at /create."""
    nodes = ai.generate_weave(body.topic, body.seed_nodes or [])
    weave = Weave(id=str(uuid.uuid4()), topic=body.topic, nodes=nodes)
    store.save_weave(weave)
    return weave


@router.delete("/weaves/{weave_id}")
def delete_weave(weave_id: str):
    if not store.delete_weave(weave_id):
        raise HTTPException(status_code=404, detail="Weave not found")
    return {"deleted": weave_id}


# ── Node / contribution endpoints ──────────────────────────────────────────

@router.post("/weaves/{weave_id}/contribute", response_model=Weave)
def contribute_node(weave_id: str, body: ContributeNodeRequest):
    """
    Replace a scaffold with a community contribution.
    Returns immediately — gap detection runs in the background and
    patches the weave file once complete (client can re-fetch after a moment).
    """
    weave = store.get_weave(weave_id)
    if not weave:
        raise HTTPException(status_code=404, detail="Weave not found")

    target = next((n for n in weave.nodes if n.id == body.scaffold_node_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Scaffold node not found")
    if not target.is_scaffold:
        raise HTTPException(status_code=400, detail="Target node is not a scaffold")

    # Replace scaffold immediately
    replacement = Node(
        id=target.id,
        title=body.title,
        description=body.description,
        depth=target.depth,
        difficulty=target.difficulty,
        is_scaffold=False,
        contributed_by=body.contributed_by,
    )
    weave.nodes = [replacement if n.id == target.id else n for n in weave.nodes]
    store.save_weave(weave)

    # Run gap detection in background — won't block the response
    def _run_gap_detection():
        try:
            gap = ai.detect_gap(weave.nodes, body.title, body.description)
            if gap.gap_detected and gap.scaffold_node:
                # Re-load weave (may have changed) then append scaffold
                current = store.get_weave(weave_id)
                if current:
                    s = gap.scaffold_node
                    new_scaffold = Node(
                        id=s.id,
                        title=s.title,
                        description=s.description,
                        depth=s.depth,
                        difficulty=s.difficulty,
                        is_scaffold=True,
                    )
                    current.nodes.append(new_scaffold)
                    current.nodes = _sort_nodes(current.nodes)
                    store.save_weave(current)
        except Exception as e:
            print(f"[gap detection] background error: {e}")

    threading.Thread(target=_run_gap_detection, daemon=True).start()

    return weave


@router.post("/weaves/{weave_id}/nodes", response_model=dict)
def add_node(weave_id: str, body: AddNodeRequest):
    """
    Add a new node. Gap detection runs in background.
    Returns the updated weave immediately + a gap_detection placeholder.
    """
    weave = store.get_weave(weave_id)
    if not weave:
        raise HTTPException(status_code=404, detail="Weave not found")

    new_node = Node(
        id=str(uuid.uuid4()),
        title=body.title,
        description=body.description,
        depth=max((n.depth for n in weave.nodes), default=0) + 1,
        difficulty=3,
        is_scaffold=False,
        contributed_by=body.contributed_by,
    )
    weave.nodes.append(new_node)
    weave.nodes = _sort_nodes(weave.nodes)
    store.save_weave(weave)

    def _run_gap_detection():
        try:
            gap = ai.detect_gap(weave.nodes, body.title, body.description)
            if gap.gap_detected and gap.scaffold_node:
                current = store.get_weave(weave_id)
                if current:
                    s = gap.scaffold_node
                    scaffold = Node(
                        id=s.id,
                        title=s.title,
                        description=s.description,
                        depth=s.depth,
                        difficulty=s.difficulty,
                        is_scaffold=True,
                    )
                    current.nodes.append(scaffold)
                    current.nodes = _sort_nodes(current.nodes)
                    store.save_weave(current)
        except Exception as e:
            print(f"[gap detection] background error: {e}")

    threading.Thread(target=_run_gap_detection, daemon=True).start()

    return {
        "weave": weave,
        "gap_detection": {"gap_detected": False, "missing_concept": None, "scaffold_node": None},
        "scaffold_inserted": None,
    }


@router.get("/weaves/{weave_id}/nodes/{node_id}", response_model=Node)
def get_node(weave_id: str, node_id: str):
    weave = store.get_weave(weave_id)
    if not weave:
        raise HTTPException(status_code=404, detail="Weave not found")
    node = next((n for n in weave.nodes if n.id == node_id), None)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node


# ── Helpers ────────────────────────────────────────────────────────────────

def _sort_nodes(nodes: list[Node]) -> list[Node]:
    return sorted(nodes, key=lambda n: (n.depth, n.difficulty, int(n.is_scaffold)))


# ── Node explainer ────────────────────────────────────────────────────────

class ExplainNodeRequest(BaseModel):
    title: str
    description: str
    topic: str
    depth: int = 0
    difficulty: int = 1


@router.post("/nodes/explain")
def explain_node(body: ExplainNodeRequest):
    """Generate a 400-600 word deep-dive explainer for a node via Ollama."""
    try:
        text = ai.explain_node(
            title=body.title,
            description=body.description,
            topic=body.topic,
            depth=body.depth,
            difficulty=body.difficulty,
        )
        return {"explainer": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ollama error: {e}")


@router.post("/weaves/{weave_id}/nodes/{node_id}/contribute", response_model=Weave)
def add_perspective(weave_id: str, node_id: str, body: AddNodeRequest):
    """Add an additional perspective/explanation to an existing community node."""
    weave = store.get_weave(weave_id)
    if not weave:
        raise HTTPException(status_code=404, detail="Weave not found")
    target = next((n for n in weave.nodes if n.id == node_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Node not found")

    # Append the new perspective to the existing description
    separator = "\n\n---\n\n"
    attribution = f"**{body.contributed_by}:** "
    target.description = target.description + separator + attribution + body.description
    store.save_weave(weave)
    return weave

@router.post("/weaves/{weave_id}/nodes/{node_id}/contribute", response_model=Weave)
def add_perspective(weave_id: str, node_id: str, body: AddNodeRequest):
    weave = store.get_weave(weave_id)
    if not weave:
        raise HTTPException(status_code=404, detail="Weave not found")
    target = next((n for n in weave.nodes if n.id == node_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Node not found")
    separator = "\n\n---\n\n"
    attribution = f"**{body.contributed_by}:** "
    target.description = target.description + separator + attribution + body.description
    store.save_weave(weave)
    return weave