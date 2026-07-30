# GraphIPO Reverse Graph Analyzer 🔍

The **GraphIPO Reverse Graph Analyzer** is a static analysis audit tool designed to extract static codebase dependency graphs from source code files (`.cs`, `.ts`, `.tsx`, `.py`) and compare them against the GraphIPO `.ipo/canvas.json` architectural design specification.

It bridges design intent and code implementation by highlighting architectural drift and step sequence violations.

---

## 🌟 Key Features

- **Multi-Language Static Parser**: Extracts classes, method declarations, and method call invocations using tree-sitter real AST parsing for:
  - **C#** (`.cs`)
  - **TypeScript / React** (`.ts`, `.tsx`)
  - **Python** (`.py`)
  - **JavaScript** (`.js`, `.jsx`)
- **Automated Discrepancy Detection**:
  - `MISSING_IN_CODE` 🔴: Design nodes specify target symbols or outputs that are missing in the codebase.
  - `UNMAPPED_IN_DESIGN` 🟡: Codebase methods that are not covered or tracked by any node in the design canvas.
  - `ORDER_MISMATCH` 🔴: Caller methods executing step actions out of sequence relative to the `process_execution_plan`.
- **Implementation Graph Generation**: Automatically generates a secondary `.ipo/canvas.json` compatible graph representing the *actual* codebase implementation. This graph models files/classes as nodes and method invocations as edges, which can be visualized directly in the Canvas UI as an audit overlay.
- **Dual Audit Reports**:
  - **JSON Audit Summary** (`ipo_drift_report.json`): Machine-readable metrics and discrepancy lists. Now includes `node_audit_results` for deep Canvas UI integration.
  - **Markdown Audit Report** (`ipo_drift_report.md`): Human-readable report with compliance score, summary tables, and node details.

---

## 🛠️ Installation & Requirements

- Python 3.8+
- Tree-sitter libraries for proper AST parsing (`tree-sitter`, `tree-sitter-python`, `tree-sitter-javascript`, `tree-sitter-typescript`, `tree-sitter-c-sharp`).

Install dependencies using:
```bash
pip install -r requirements.txt
```

---

## 🚀 Usage Guide

### Basic Command Syntax

```bash
python reverse_graph_analyzer.py \
  --code-dir <path_to_codebase> \
  --canvas-json <path_to_canvas_json> \
  --output-report ipo_drift_report.md \
  --output-json ipo_drift_report.json
```

### Command Line Arguments

| Argument | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `--code-dir` | Yes | N/A | Path to directory containing source code to scan |
| `--canvas-json` | Yes | N/A | Path to GraphIPO design spec file (e.g. `.ipo/canvas.json`) |
| `--output-report` | No | `ipo_drift_report.md` | Path to save generated Markdown report |
| `--output-json` | No | `ipo_drift_report.json` | Path to save generated JSON summary |

---

## 💻 Canvas UI Integration

The analyzer outputs are specifically formatted to power the Canvas UI **Audit Mode**:

### 1. JSON Report (`ipo_drift_report.json`)
The JSON file is structured to be directly consumable by the frontend:
```json
{
  "compliance_score": 85,
  "total_discrepancies": 5,
  "node_audit_results": {
    "node_xxx": {
      "status": "MATCH" | "PARTIAL" | "MISSING" | "DRIFT",
      "discrepancies": [...],
      "coverage_percentage": 100
    }
  },
  "unmapped_code_symbols": [...]
}
```
The Canvas UI parses `node_audit_results` to color-code the nodes (e.g., green for MATCH, red for MISSING/DRIFT) and display discrepancy details in the node inspection panel.

### 2. Implementation Graph (`demo_canvas.json` / `canvas.json`)
The analyzer generates a new design specification purely from source code. When loaded alongside the original design canvas in the UI, it enables side-by-side comparison or overlay visualization to instantly identify drift.

---

## 🧪 Running the Audit Demo

To test the analyzer against sample code and canvas files, execute the included demo runner:

```bash
python run_audit_demo.py
```

This will run an end-to-end audit on sample C# and TypeScript code files against `.ipo/canvas.json` and generate report files in the local directory.

---

## 📊 Sample Output Report Preview

The generated Markdown report (`ipo_drift_report.md`) includes:
- Overall **Compliance Score** (0 - 100%)
- **Executive Summary Metrics** table
- Categorized **Architectural Discrepancies** with severity levels (`HIGH`, `MEDIUM`, `LOW`)
- **Node-by-Node Audit Details** highlighting matched vs missing target symbols
- Recommended action items for AI agents and human engineers.
