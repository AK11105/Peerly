# Peerly — MVP Backend

FastAPI backend for the Peerly hackathon prototype.

## Setup

```bash
cd peerly-backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Configure

```bash
cp .env.example .env
# Add your Anthropic API key to .env
```

## Seed the demo Weave

Run this once before the demo. Creates a pre-built Machine Learning Weave with one Scaffold node so you always have a fallback.

```bash
python seed.py
```

## Run

```bash
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

## Expose publicly (demo day)

```bash
ngrok http 8000
```

---

## API Reference

### Weaves

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/weaves` | List all Weaves |
| GET | `/api/weaves/{id}` | Get a single Weave |
| POST | `/api/weaves/generate` | Generate a new Weave via AI (Call 1) |
| DELETE | `/api/weaves/{id}` | Delete a Weave |

### Nodes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/weaves/{id}/nodes/{node_id}` | Get a single Node |
| POST | `/api/weaves/{id}/nodes` | Add a node + run gap detection (Call 2) |
| POST | `/api/weaves/{id}/contribute` | Replace a Scaffold with community content |

---

## Demo Flow

### 1 — Load the pre-seeded ML Weave
```
GET /api/weaves/demo-ml-weave
```

### 2 — Replace the Scaffold node
```
POST /api/weaves/demo-ml-weave/contribute
{
  "weave_id": "demo-ml-weave",
  "scaffold_node_id": "scaffold-backprop",
  "title": "Backpropagation",
  "description": "Backpropagation computes gradients layer by layer using the chain rule, allowing efficient weight updates across deep networks.",
  "contributed_by": "demo_user"
}
```

### 3 — Add a new node (triggers gap detection live)
```
POST /api/weaves/demo-ml-weave/nodes
{
  "weave_id": "demo-ml-weave",
  "title": "Transformer Architecture",
  "description": "Covers self-attention, multi-head attention, and positional encoding. The foundation of modern LLMs.",
  "contributed_by": "demo_user"
}
```
→ Gap detector will flag "Attention Mechanism" as missing and insert a Scaffold automatically.

### 4 — Generate a fresh Weave on any topic
```
POST /api/weaves/generate
{
  "topic": "Quantum Computing",
  "seed_nodes": ["Qubits", "Superposition"]
}
```

---

## Project Structure

```
peerly-backend/
├── main.py           # FastAPI app + CORS
├── seed.py           # Pre-generate demo Weave
├── requirements.txt
├── .env.example
├── data/
│   └── weaves.json   # JSON file store (auto-created)
└── app/
    ├── __init__.py
    ├── models.py     # Pydantic models
    ├── store.py      # JSON persistence layer
    ├── ai.py         # Claude API — Call 1 (Weave builder) + Call 2 (Gap detector)
    └── routes.py     # All FastAPI endpoints
```
