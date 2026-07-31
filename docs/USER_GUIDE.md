# User Guide — GraphIPO Framework

Welcome to **GraphIPO** (Graph Input-Process-Output Engineering). GraphIPO is a **design-first methodology** that helps you and your AI agent plan, visualize, and implement software systems through a structured architecture graph.

## What is GraphIPO?
GraphIPO encourages you to step back and design your system's architecture before writing code. By breaking your app down into atomic Input-Process-Output (IPO) nodes, you ensure the AI understands the exact data flow and requirements, reducing hallucinations and messy code.

## The Core Workflow
1. **Discovery**: The agent interviews you to understand your requirements, then calls `complete_discovery` to generate a draft design.
2. **Design**: You and the agent refine the architecture graph. Nodes represent features or components.
3. **Implementation**: Once a node is fully designed, the agent writes the actual code.
4. **Audit**: The agent uses the `run_audit` tool to compare the written code against the design in the graph, ensuring compliance.

## Understanding the Canvas UI
When the MCP server is running, the Canvas UI is available at `http://localhost:3001`. It shows a visual representation of your architecture in real-time. You can also launch it with `npx @0xlayne/graph-ipo-harness init`.

### How to Read an IPO Node
Each node in the graph represents a specific piece of your system and follows the **IPO model**:
- **Inputs**: What data or triggers go into this node?
- **Process**: What logic or transformation happens inside?
- **Outputs**: What data is returned or where does it go next?

### Node Statuses & Lifecycle Phases
Nodes move through specific phases as they mature:
- **MACRO_DESIGN**: High-level concept.
- **NODE_DRILLDOWN**: Expanding the details.
- **SPECIFIED**: Requirements are locked in.
- **IMPLEMENTATION**: Code is being written.
- **AUDIT**: Code is verified against the design.

Statuses help track readiness (e.g., `DRAFT`, `READY_FOR_IMPLEMENTATION`, `COMPLETED`).

### Flow Tracing
To understand how data moves through your system, use **Flow Tracing**. Simply select a node in the Canvas UI, and it will highlight the data flow path upstream and downstream, making complex architectures easy to understand.

## Tips for Best Results
- **Be specific in Discovery**: The better you answer the agent's questions, the more accurate the initial graph will be.
- **Lock and unlock nodes**: If multiple agents are working, use node locking to prevent conflicts.
- **Keep technical language but explain it**: Aim for an intermediate level. If a node uses advanced concepts, add explanatory notes.
- **Audit frequently**: Run `run_audit` after major code changes to catch deviations early.
