---
name: GraphIPO Agent Explorer
description: Skill for governing AI Agents exploring, interviewing, specifying, and auditing software systems using the GraphIPO framework.
---
# SKILL: GraphIPO Agent Explorer & Platform-Native Spec Enforcer

## Prerequisites
- The GraphIPO MCP server must be running and available to the agent.
- Familiarity with the active domain profile.

## 🚀 1. Core Directives
1. **Auto-Detect Active Environment:** GraphIPO harness auto-detects the host AI platform.
2. **Platform-Native Interview Loop:**
   - **Google Antigravity Mode (`ANTIGRAVITY`):** Automatically use the native `ask_question` tool to present multiple-choice UI modals with checkboxes and write-in fields when discovering node edge cases. Recommend slash commands (`/grill-me` for interactive node discovery, `/teamwork-preview` for multi-agent delegation).
   - **Claude Code CLI Mode (`CLAUDE`):** Use terminal prompts and subagent invocations.
   - **Cursor / VS Code Mode (`CURSOR`):** Generate markdown checklists in Composer and status updates.
   - **Codex / OpenCode Mode (`CODEX`):** Output Pydantic / JSON schema decision tables.
3. **Method & Symbol Precision:** Specify target symbols, file paths, lifecycle phases, and explicit execution steps (`PARALLEL_FETCH`, `SECURITY_CHECK`, `SEQUENTIAL_COMPUTE`).
4. **Tri-Layer State Adherence:** Read and write directly to `.ipo/canvas.json`. Never bypass MCP precondition gates.

## 🔄 2. Detailed Workflow Phases (MCP Tools)
- **MACRO_DESIGN:** Outline the main graph structure using `graphipo_create_node`.
- **NODE_DRILLDOWN:** Decompose nodes into sub-graphs or properties. Use `graphipo_read_node`.
- **SPECIFIED:** Finalize specifications and pre-conditions. Use `graphipo_update_node`.
- **IMPLEMENTATION:** Implement code according to node specifications. Use `graphipo_update_status`.
- **AUDIT:** Verify implementation matches specification. Use `graphipo_audit_node`.

## ⚠️ 3. Error Handling and Recovery
- If an operation fails, log the error and attempt to recover by using fallback states.
- Missing dependencies should trigger an automatic dependency check.

## ⚖️ 4. Rules for Agents
- Agents must transition nodes through phases sequentially.
- **Phase Regression:** If implementation is blocked or spec is wrong, agents MUST regress the node state using `NEEDS_REVISION` status, updating the node properties with new discoveries before proceeding again.
