# @0xlayne/graph-ipo-harness

MCP Server for **GraphIPO** — a design-first, AI-assisted software engineering methodology.

## What is GraphIPO?

GraphIPO lets you design software architecture visually as a graph of Input-Process-Output nodes, then delegate implementation to AI agents that follow your design exactly.

## Quick Start

Add to your IDE's MCP configuration:

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

Then tell your AI agent:

> "I want to build a task management app. Use `start_discovery` to begin."

## Features

- **21 MCP tools** for architecture design, node management, and code auditing
- **Guided discovery** — the agent interviews you and generates the architecture
- **Existing project onboarding** — scan code and import it as a design graph
- **Per-node lifecycle** tracking (Design → Specified → Implemented → Audited)
- **Bidirectional Canvas UI** — visual editing with real-time WebSocket sync
- **Tree-Sitter AST auditing** — verify code matches design
- **Multi-agent support** — node locking and task assignment

## Links

- [GitHub](https://github.com/LayneStyle/graph-ipo)
- [Documentation](https://github.com/LayneStyle/graph-ipo/tree/main/docs)

## License

MIT
