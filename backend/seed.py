"""
Run this once before the demo to pre-generate a polished ML Weave.
Usage:  python seed.py
"""
from dotenv import load_dotenv
load_dotenv()

import uuid
from app.models import Weave, Node
from app import store

ML_WEAVE_ID = "demo-ml-weave"

nodes = [
    Node(id=str(uuid.uuid4()), title="What is Machine Learning",
         description="Defines ML as a subfield of AI where systems learn from data rather than explicit rules. Sets the foundation for all subsequent concepts.",
         depth=0, difficulty=1, is_scaffold=False),

    Node(id=str(uuid.uuid4()), title="Linear Algebra Basics",
         description="Covers vectors, matrices, and matrix multiplication. Essential for understanding how data and model weights are represented.",
         depth=0, difficulty=2, is_scaffold=False),

    Node(id=str(uuid.uuid4()), title="Probability & Statistics",
         description="Introduces probability distributions, mean, variance, and Bayes theorem. Underpins loss functions and model evaluation.",
         depth=0, difficulty=2, is_scaffold=False),

    Node(id=str(uuid.uuid4()), title="Supervised vs Unsupervised Learning",
         description="Distinguishes between learning from labelled data (supervised) and finding structure in unlabelled data (unsupervised). Frames the entire ML taxonomy.",
         depth=1, difficulty=1, is_scaffold=False),

    Node(id=str(uuid.uuid4()), title="Gradient Descent",
         description="Explains how models minimise a loss function by iteratively adjusting weights in the direction of steepest descent. Core optimisation mechanism for nearly all ML models.",
         depth=1, difficulty=3, is_scaffold=False),

    # Scaffold — the gap the AI detected
    Node(id="scaffold-backprop", title="Backpropagation",
         description="[AI Draft · needs contribution] Covers how gradients are propagated backwards through a neural network to update weights efficiently. Prerequisite for understanding neural network training.",
         depth=2, difficulty=4, is_scaffold=True),

    Node(id=str(uuid.uuid4()), title="Neural Networks",
         description="Introduces multi-layer perceptrons, activation functions, and forward passes. Builds directly on gradient descent and backpropagation.",
         depth=3, difficulty=4, is_scaffold=False),

    Node(id=str(uuid.uuid4()), title="Overfitting & Regularisation",
         description="Explains why models fail to generalise and introduces techniques like dropout, L2 regularisation, and early stopping.",
         depth=3, difficulty=3, is_scaffold=False),
]

weave = Weave(id=ML_WEAVE_ID, topic="Machine Learning", nodes=nodes)
store.save_weave(weave)
print(f"Seeded demo Weave: {ML_WEAVE_ID}")
print(f"Nodes: {len(nodes)} ({sum(1 for n in nodes if n.is_scaffold)} scaffold)")
