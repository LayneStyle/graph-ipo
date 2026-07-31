# GraphIPO 🚀

**GraphIPO** (Graph Input-Process-Output Engineering) is a design-first, AI-assisted software engineering methodology.

Decompose complex systems into visual architecture graphs, refine them interactively, and let AI agents implement the code — guaranteeing adherence to your design.

> **⚠️ Token Usage Advisory**
> GraphIPO maintains a rich architecture context. Frequent updates or large graphs can consume a significant amount of context window tokens. Keep your graphs modular and use focused agents when possible.

---

## 🌟 Core Features

1. **Top-Down Hierarchical Graph:** Decompose systems into atomic Input-Process-Output (IPO) nodes.
2. **Guided Discovery:** The agent interviews you about your project, then calls `complete_discovery` to generate the architecture.
3. **Existing Project Onboarding:** Scan an existing codebase and import it as a graph using `onboard_existing_project`.
4. **Bidirectional Canvas UI:** Real-time visual canvas with inline editing and Flow Tracing.
5. **Tree-Sitter AST Audit Engine:** Compare implemented code against design graphs for compliance.

---

## 🚀 Quick Start

### 1. Configure the MCP server in your AI agent

Add this to your IDE's MCP configuration (e.g., in Antigravity, Cursor, or Claude):

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

### 2. Initialize your project

```bash
npx @0xlayne/graph-ipo-harness init
```

This creates `.ipo/canvas.json` and opens the **Canvas UI** automatically in your browser at `http://localhost:3001`.

> The Canvas UI is embedded in the package — no separate installation needed.

### 3. Tell your AI agent to begin

**New project:**
> *"I want to build a task management app for teams. Use `start_discovery` to begin."*

**Existing project:**
> *"Scan my existing codebase and import it into GraphIPO. Use `onboard_existing_project`."*

**Resume project:**
Just open your project folder in your IDE! The `.ipo/canvas.json` state persists automatically.

---

## 📖 Documentation

- [Installation & Usage Guide](docs/INSTALLATION_AND_USAGE_GUIDE.md)
- [User Guide](docs/USER_GUIDE.md)
- [Architecture Spec](docs/architecture_spec.md)

## License

MIT
