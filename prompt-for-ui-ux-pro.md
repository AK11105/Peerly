You are a senior **UI/UX designer + frontend architect** with deep expertise in:

* Next.js (App Router)
* Tailwind CSS
* shadcn/ui
* Complex interaction-heavy systems

I want you to **refactor my entire product UI + UX** to make it **intuitive, discoverable, and scalable for mass adoption**.

---

# 🎯 Core Objective

Transform the product so that:

* First-time users instantly understand how to use it
* Navigation feels effortless and obvious
* Users can easily access all major features without confusion
* The experience feels **guided, not overwhelming**

⚠️ Constraints:

* DO NOT touch/modify backend, APIs, or business logic
* DO NOT remove features
* ONLY improve:

  * UI clarity
  * UX flows
  * Component placement
  * Onboarding
  * Responsiveness

---

# 🧠 Context About My App

* Built with: **Next.js + Tailwind v4 + shadcn/ui**
* Complex product with:

  * Nodes, weaves, contributions
  * Mindmap (ReactFlow)
  * Modals, drawers, panels
* Currently:

  * Desktop-first
  * Dark-first
  * High cognitive load

---

# 🔥 Your Tasks

## 1. UX Overhaul (CRITICAL)

Refactor UX to:

* Reduce **cognitive overload**
* Improve **discoverability of features**
* Make actions feel **obvious and guided**

### Apply principles:

* Progressive disclosure (show less → reveal more)
* Action-based learning (learn by doing, not reading)
* Clear primary actions per screen
* Strong visual hierarchy

👉 Users should reach value quickly (“aha moment”) and not feel lost ([Excited][1])

---

## 2. Onboarding System (VERY IMPORTANT)

Design a **complete onboarding experience**, not just UI tweaks.

### Requirements:

### A. First-Time Experience

* Welcome screen (minimal, not bloated)
* Ask 1–2 key questions (intent-based onboarding)  (let me know explicitly on this change)
* Guide users to their **first meaningful action**

### B. Product Tour (Smart, not annoying)

* Use:

  * Tooltips
  * Hotspots
  * Contextual hints
* Avoid long intro slides

👉 Prefer **progressive onboarding over static tutorials** ([Design Studio UI/UX][2])

---

### C. Guided Interaction Flow

* Walk user through:

  * Creating/understanding a node
  * Navigating a weave
  * Contributing

* Use:

  * Step-by-step actions
  * “Click here to continue” interactions

---

### D. Continuous Onboarding

* Don’t show everything at once
* Trigger hints when:

  * User first uses a feature
  * User seems stuck

---

### E. UX Goal

Users should feel:

* “Oh this is easy”
* “I know what to do next”
* “I didn’t need instructions”

---

## 3. Navigation & Discoverability

Refactor layout so:

* All major features are easily reachable
* No hidden or confusing entry points

### Improve:

* Navbar structure
* Feature grouping
* Action placement

### Add:

* Clear primary CTA per screen
* Secondary actions de-emphasized

---

## 4. Multi-Theme System

Support:

1. Light Mode (White)
2. Dark Mode
3. Dim Mode
4. System Mode

also multiple accent colours (not fixated on a single accent colour) 

### Requirements:

* Use semantic tokens (not hardcoded colors)
* Maintain consistency across all components
* Ensure accessibility (contrast)

---

## 5. Mobile-First Refactor (CRITICAL)

Convert app to **mobile-first UX**

### Requirements:

* Design for mobile first, then scale up
* Replace:

  * Side panels → bottom sheets
  * Dense layouts → stacked flows

### Optimize:

* Tap targets
* Thumb navigation
* Modal usability

---

## 6. Component-Level Improvements

Refactor:

### Navbar

* Minimal, adaptive, mobile-friendly
* Prioritize key actions

### Node Cards

* Better readability
* Clear affordances (clickable, states)

### Modals / Drawers

* Cleaner inputs
* Better spacing
* Mobile-friendly sheets

### MindMap

* Improve usability on mobile
* Simplify interactions
* Reduce clutter

---

## 7. Design System Upgrade

Create a scalable system:

* Typography scale
* Spacing system
* Color tokens
* Elevation system

Standardize:

* Buttons
* Inputs
* Cards
* States (hover, active, disabled)

---

## 8. Reduce Cognitive Load

* Remove unnecessary UI noise
* Group related actions
* Use whitespace intentionally
* Avoid overwhelming users

---

## 9. Output Format

Give output in this structure:

### A. UX Strategy

* Key problems + improvements

### B. Onboarding Flow Design

* First-time flow
* Product tour
* Continuous onboarding triggers

### C. Navigation & Layout Changes

### D. Theme System Architecture

### E. Mobile Refactor Plan

### F. Component-Level Improvements

### G. Tailwind / Code Suggestions

---

# 🚀 Final Goal

Make the product feel like:

* “This is insanely intuitive”
* “I didn’t need to learn anything”
* “Everything is exactly where I expect it”

---

Think like you are redesigning this for **millions of users with zero patience**.
