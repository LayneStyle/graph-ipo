# GraphIPO 🚀

**GraphIPO** (Graph Input-Process-Output Engineering) is a design-first, AI-assisted software engineering methodology.

Decompose complex systems into visual architecture graphs, refine them interactively, and let AI agents implement the code — guaranteeing adherence to your design.

---

## 🗂️ Project Structure

```
├── harness/        # MCP server (Node.js/TypeScript) — published as @0xlayne/graph-ipo-harness
├── canvas-ui/      # Interactive React + React Flow visual canvas
├── analyzers/      # Code-to-Graph reverse engineering (Python + Tree-Sitter)
├── docs/           # Architecture specs, guides, and documentation
├── skills/         # Agent instructions & SKILL_GRAPH_IPO.md
└── .ipo/           # Default canvas data (canvas.json)
```

---

## 🌟 Core Concepts

1. **Top-Down Hierarchical Graph:** Decompose systems into atomic Input-Process-Output (IPO) nodes.
2. **Per-Node Lifecycle:** Independent progress tracking (`MACRO_DESIGN` → `NODE_DRILLDOWN` → `SPECIFIED` → `IMPLEMENTATION` → `AUDIT`).
3. **Guided Discovery:** The agent interviews you about your project and generates the initial architecture.
4. **Existing Project Onboarding:** Scan an existing codebase and import it as a graph for redesign.
5. **Bidirectional Canvas UI:** Real-time visual canvas with inline editing, notes, and agent assignment.
6. **Tree-Sitter AST Audit Engine:** Compare implemented code against design graphs for compliance.
7. **Multi-Agent Collaboration:** Node locking and task assignment for parallel agent work.

---

## 🛠️ MCP Tools (21 Active)

| Tool | Purpose |
|------|---------|
| `start_discovery` | **Guided interview** for new projects |
| `onboard_existing_project` | **Import existing codebase** into the graph |
| `set_experience_level` | Set user experience level (`beginner` / `intermediate` / `advanced`) |
| `get_canvas` | Read canvas state and progress dashboard |
| `create_ipo_node` | Create or update an IPO node |
| `update_node_pseudocode` | Update pseudocode or execution plan |
| `set_node_status` | Set node status |
| `set_code_language` | Set naming language (`EN`, `ES`, `CUSTOM`) |
| `validate_state` | Run compliance validation & progress metrics |
| `remove_node` | Remove a node and clean up edges |
| `add_edge` | Connect two nodes |
| `remove_edge` | Remove edge by ID |
| `get_context_injection` | Retrieve connected node context & instructions |
| `search_nodes` | Search across titles, categories, symbols |
| `lock_node` / `unlock_node` | Multi-agent node locking |
| `assign_node` | Assign a node to a specific agent |
| `get_my_assignments` | List nodes assigned to an agent |
| `detect_stack` | Auto-detect technology stack |
| `run_audit` | Execute tree-sitter AST audit |
| `get_audit_report` | Retrieve last audit report |

---

## 🚀 Quick Start

### 1. Configure the MCP server in your AI agent

Add this to your IDE's MCP configuration:

```json
{
  "mcpServers": {
    "graph-ipo": {
      "command": "npx",
      "args": ["-y", "@0xlayne/graph-ipo-harness"]
    }
  }
}
```

That's it. `npx` downloads and runs it automatically. No manual installation needed.

### 2. (Optional) Visual Canvas UI

```bash
npx degit LayneStyle/graph-ipo/canvas-ui graph-ipo-canvas
cd graph-ipo-canvas
npm install
npm run dev
```

Open `http://localhost:5173`.

### 3. Tell your AI agent to begin

**New project:**
> *"I want to build a task management app for teams. Use `start_discovery` to begin."*

**Existing project:**
> *"Scan my existing codebase and import it into GraphIPO. Use `onboard_existing_project`."*

---

## 📖 Documentation

- [Installation & Usage Guide (ES)](docs/INSTALLATION_AND_USAGE_GUIDE.md)
- [User Guide](docs/USER_GUIDE.md)
- [Architecture Spec](docs/architecture_spec.md)

## License

MIT
