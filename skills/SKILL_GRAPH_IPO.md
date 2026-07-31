---
name: GraphIPO Agent Skill
description: Skill for AI agents using the GraphIPO design-first methodology via MCP tools.
---
# SKILL: GraphIPO Agent

## Prerequisites
- The GraphIPO MCP server must be configured in your IDE's MCP settings.
- A project must be initialized with `graph-ipo init` or by calling `start_discovery`.

## 1. Core Workflow

### New Project
1. Call `start_discovery` with the user's project description.
2. **Conduct the discovery interview** — ask 1-2 questions at a time, wait for answers.
3. Call `complete_discovery` with a summary of what was learned.
4. Create 5-8 high-level IPO nodes with `create_ipo_node`.
5. Connect nodes with `add_edge` to show data flow.
6. Present the graph to the user for validation.

### Existing Project
1. Call `onboard_existing_project` to scan the codebase.
2. Review the generated nodes with the user.
3. Refine nodes based on user feedback.

### Implementation
1. Use `get_context_injection` to get scoped context for a specific node.
2. Implement the code according to the node's specification.
3. Update node status with `set_node_status` (DESIGN → READY_FOR_IMPLEMENTATION → IMPLEMENTED).

### Audit
1. Call `run_audit` to verify code matches the design graph.
2. Review the audit report with `get_audit_report`.

## 2. Available MCP Tools

| Tool | Purpose |
|------|---------|
| `start_discovery` | Initialize project, begin interview |
| `complete_discovery` | Mark interview as done |
| `create_ipo_node` | Create or update a node |
| `add_edge` | Connect two nodes |
| `set_node_status` | Update node lifecycle status |
| `get_context_injection` | Get implementation context for a node |
| `get_canvas` | View full project state |
| `detect_stack` | Auto-detect project technology |
| `onboard_existing_project` | Import existing codebase |
| `run_audit` | Verify code vs design |
| `assign_node` | Assign a node to an agent |
| `lock_node` / `unlock_node` | Multi-agent coordination |

## 3. Rules
- **Never skip discovery.** Always interview the user before creating nodes.
- **Node status must progress sequentially**: DESIGN → READY_FOR_IMPLEMENTATION → IMPLEMENTED.
- **Use NEEDS_REVISION** if implementation doesn't match spec — don't delete and recreate.
- **Keep graphs modular**: 5-8 nodes for small projects, decompose further for larger ones.
