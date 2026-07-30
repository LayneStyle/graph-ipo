# GraphIPO Specification Document

## 1. Overview
GraphIPO (Graph Input-Process-Output Engineering) is an architecture specification and governance framework for AI Agentic workflows.

## 2. Directory Layout
- `harness/`: Local MCP Server with Tri-Layer FSM state enforcement.
- `profiles/`: Domain profiles (Unity, Web Fullstack, Data Analytics).
- `adapters/`: Adapters for multi-platform support (Antigravity, Claude, Cursor, Codex).
- `skills/`: Agent Explorer instruction skill.
- `canvas-ui/`: Visual React + React Flow canvas application.
- `analyzers/`: Code-to-Graph audit engine.

## 3. Workflow Phases
The execution lifecycle consists of 5 phases:
1. `MACRO_DESIGN`: Initial system layout.
2. `NODE_DRILLDOWN`: Detailed exploration and requirements gathering.
3. `SPECIFIED`: Finalized specs ready for code generation.
4. `IMPLEMENTATION`: Writing code.
5. `AUDIT`: Verifying implementation against the graph.

## 4. Node Specification Format
Nodes in GraphIPO contain:
- `node_id`: Unique identifier.
- `domain`: Associated domain profile (`UNITY`, `WEB`, `DATA`).
- `inputs`: Formatted inputs, state prerequisites, trigger conditions.
- `process_execution_plan`: Target symbols, lifecycle phase, sequential/parallel execution steps.
- `outputs`: Formatted outputs, RPC targets, state mutations, error fallbacks.
- `edges`: Directed edge support linking nodes together (currently being added).

## 5. Reverse Audit Engine
A Python-based reverse engineering and discrepancy auditor that statically analyzes source code to verify compliance with `.ipo/canvas.json`.
