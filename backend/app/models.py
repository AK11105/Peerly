from pydantic import BaseModel
from typing import Optional


class Node(BaseModel):
    id: str
    title: str
    description: str
    depth: int
    difficulty: int        # 1 (easiest) – 5 (hardest)
    is_scaffold: bool = False
    contributed_by: Optional[str] = "community"


class Weave(BaseModel):
    id: str
    topic: str
    nodes: list[Node] = []
    field: Optional[str] = None 
    nodes: list[Node] = []


class GenerateWeaveRequest(BaseModel):
    topic: str
    field : Optional[str] = None
    seed_nodes: Optional[list[str]] = []
    include_scaffolds: bool = True 


class ContributeNodeRequest(BaseModel):
    weave_id: str
    scaffold_node_id: str          # the scaffold being replaced
    title: str
    description: str
    contributed_by: Optional[str] = "anonymous"


class AddNodeRequest(BaseModel):
    weave_id: str
    title: str
    description: str
    contributed_by: Optional[str] = "anonymous"


class ScaffoldNode(BaseModel):
    id: str
    title: str
    description: str
    depth: int
    difficulty: int


class GapDetectionResult(BaseModel):
    gap_detected: bool
    missing_concept: Optional[str] = None
    scaffold_node: Optional[ScaffoldNode] = None

