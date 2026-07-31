# Installation and Usage Guide — GraphIPO

## 1. Setting up the MCP Server in your AI Agent

Add this configuration to your IDE's MCP settings (e.g., Antigravity, Cursor, Claude):

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

**That's it.** You don't need to manually clone, compile, or install anything. `npx` automatically downloads and runs the server every time your agent connects.

### Where does this file go?
- **Antigravity**: `~/.gemini/config/mcp_config.json`
- **Cursor**: `.cursor/mcp.json` in the project root
- **Claude Desktop**: Settings > Developer > MCP Servers
- **Claude Code (CLI)**: `claude mcp add graph-ipo npx -y @0xlayne/graph-ipo-harness`

---

## 2. Initialize Your Project

In your project directory, run:

```bash
npx @0xlayne/graph-ipo-harness init
```

This creates `.ipo/canvas.json` and automatically opens the **Canvas UI** in your browser at `http://localhost:3001`. The Canvas UI is embedded in the package — no separate installation or cloning needed.

You can also check your project status anytime:

```bash
npx @0xlayne/graph-ipo-harness status
```

---

## 3. Starting Your Agent

### For a NEW project:
Tell your AI agent:
> "I want to build [describe your idea]. Use `start_discovery` to begin."

The agent will:
1. Start an interactive discovery interview asking questions about your project (users, features, platform).
2. Wait for your answers.
3. Call `complete_discovery` to finalize the interview phase.
4. Automatically create architecture nodes based on your requirements.

### For an EXISTING project:
Tell your AI agent:
> "Scan my existing project and import it into GraphIPO. Use `onboard_existing_project`."

The agent will:
1. Scan your source code (TypeScript, Python, C#, etc.).
2. Create nodes representing your existing modules and directories.
3. Ask you what you want to change or improve.

### To RESUME a project:
Simply open your project folder in your IDE! The graph state is automatically persisted in the `.ipo/canvas.json` file. The MCP server and Canvas UI will instantly read from this file and resume right where you left off.