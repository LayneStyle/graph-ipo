#!/usr/bin/env python3
"""
Reverse Graph Analyzer - GraphIPO Static Analysis & Discrepancy Audit Engine
-----------------------------------------------------------------------------
Scans target codebases (.cs, .ts, .tsx, .py) using regex AST heuristics to extract
declared classes, method symbols, and execution call graphs. Compares codebase static
graph against GraphIPO .ipo/canvas.json design specification to identify:
  1. MISSING_IN_CODE: Specified design node symbols absent in code.
  2. UNMAPPED_IN_DESIGN: Codebase methods not tracked in design nodes.
  3. ORDER_MISMATCH: Step sequence violations in method execution calls.

Emits JSON audit output (ipo_drift_report.json) and Markdown audit report (ipo_drift_report.md).
"""

import os
import sys
import re
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set, Tuple, Optional, Any
from dataclasses import dataclass, field, asdict

# ---------------------------------------------------------------------------
# Data Models
# ---------------------------------------------------------------------------

@dataclass
class CodeSymbol:
    """Represents a declared class or method symbol in the scanned codebase."""
    full_name: str           # e.g., "NetworkManager.Initialize" or "AuthenticateUser"
    class_name: str         # e.g., "NetworkManager" or ""
    method_name: str        # e.g., "Initialize"
    file_path: str          # Relative path from code_dir
    line_number: int
    language: str           # "csharp", "typescript", "python"
    parameters: List[str] = field(default_factory=list)

@dataclass
class CallInvocation:
    """Represents a method invocation within a caller method's body."""
    caller_symbol: str      # e.g., "PlayerController.OnFireInput"
    called_symbol: str      # e.g., "WeaponManager.GetActiveWeapon" or "GetActiveWeapon"
    file_path: str
    line_number: int
    call_order: int         # 1-based sequential index inside caller method body

@dataclass
class CodebaseGraph:
    """Aggregated static graph extracted from code parsing."""
    files_scanned: int = 0
    symbols: Dict[str, CodeSymbol] = field(default_factory=dict)         # key: normalized symbol string
    class_methods: Dict[str, List[CodeSymbol]] = field(default_factory=dict) # key: class_name
    invocations: Dict[str, List[CallInvocation]] = field(default_factory=dict) # key: caller_symbol

@dataclass
class Discrepancy:
    """Defines a architectural discrepancy between code and GraphIPO canvas."""
    discrepancy_type: str   # "MISSING_IN_CODE", "UNMAPPED_IN_DESIGN", "ORDER_MISMATCH"
    severity: str           # "HIGH", "MEDIUM", "LOW"
    node_id: str            # Node ID from canvas.json or "N/A"
    node_title: str         # Node title or "N/A"
    target_symbol: str      # Symbol name related to discrepancy
    description: str        # Human readable summary
    details: Dict[str, Any] = field(default_factory=dict)

# ---------------------------------------------------------------------------
# Regex AST Static Parser
# ---------------------------------------------------------------------------

class CodebaseASTParser:
    """Tree-sitter based AST parser for C#, TypeScript, and Python source files."""

    KEYWORDS_TO_IGNORE = {
        # C# / Common keywords
        "if", "else", "for", "foreach", "while", "do", "switch", "case", "catch", "try",
        "using", "lock", "new", "return", "throw", "await", "yield", "typeof", "sizeof",
        "base", "this", "null", "true", "false", "var", "void", "int", "string", "bool",
        # TS / JS keywords
        "function", "const", "let", "class", "interface", "type", "export", "import",
        "default", "from", "async", "public", "private", "protected", "static", "readonly",
        # Python keywords
        "def", "self", "cls", "pass", "print", "len", "range", "super", "enumerate"
    }

    FRAMEWORK_LIFECYCLE_METHODS = {
        "Awake", "Start", "Update", "FixedUpdate", "LateUpdate", "OnEnable", "OnDisable",
        "OnDestroy", "OnTriggerEnter", "OnCollisionEnter", "__init__", "__str__", "__repr__",
        "constructor", "render", "componentDidMount", "componentWillUnmount", "useEffect"
    }

    def __init__(self, code_dir: Path):
        self.code_dir = code_dir
        self.parsers = {}
        self._init_parsers()

    def _init_parsers(self):
        import tree_sitter_python as tspython
        import tree_sitter_javascript as tsjavascript
        import tree_sitter_typescript as tstypescript
        try:
            import tree_sitter_c_sharp as tscsharp
        except ImportError:
            tscsharp = None
        from tree_sitter import Language, Parser

        lang_configs = {
            '.py': ('python', tspython.language()),
            '.ts': ('typescript', tstypescript.language_typescript()),
            '.tsx': ('typescript', tstypescript.language_tsx()),
            '.js': ('javascript', tsjavascript.language()),
            '.jsx': ('javascript', tsjavascript.language()),
        }
        if tscsharp:
            lang_configs['.cs'] = ('csharp', tscsharp.language())

        for ext, (name, lang_ptr) in lang_configs.items():
            parser = Parser(Language(lang_ptr))
            self.parsers[ext] = (name, parser)

    def parse_codebase(self) -> CodebaseGraph:
        graph = CodebaseGraph()
        ignore_dirs = {".git", "node_modules", "bin", "obj", "__pycache__", ".venv", "venv", "dist", "build", ".vs"}

        for root, dirs, files in os.walk(self.code_dir):
            dirs[:] = [d for d in dirs if d not in ignore_dirs]

            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in self.parsers:
                    full_path = Path(root) / file
                    rel_path = os.path.relpath(full_path, self.code_dir).replace('\\\\', '/')
                    self._parse_file(full_path, rel_path, ext, graph)
                    graph.files_scanned += 1

        return graph

    def _parse_file(self, full_path: Path, rel_path: str, ext: str, graph: CodebaseGraph):
        lang_name, parser = self.parsers[ext]
        try:
            with open(full_path, 'rb') as f:
                source = f.read()
        except Exception as e:
            print(f"Warning: Could not read {rel_path}: {e}")
            return

        tree = parser.parse(source)
        self._extract_symbols(tree.root_node, source, lang_name, rel_path, graph)

    def _get_child_text(self, node, field_name, source):
        child = node.child_by_field_name(field_name)
        if child:
            return source[child.start_byte:child.end_byte].decode('utf-8')
        return None

    def _get_base_classes(self, node, source, lang_name):
        return []

    def _get_parameters(self, node, source):
        params = []
        params_node = node.child_by_field_name('parameters')
        if not params_node:
            return params
        for child in params_node.children:
            if child.type not in ('(', ')', ',', '{', '}'):
                params.append(source[child.start_byte:child.end_byte].decode('utf-8').strip())
        return params

    def _get_return_type(self, node, source):
        ret = node.child_by_field_name('return_type')
        if ret:
            return source[ret.start_byte:ret.end_byte].decode('utf-8')
        return None

    def _extract_symbols(self, root, source, lang_name, rel_path, graph):
        def get_node_text(n):
            return source[n.start_byte:n.end_byte].decode('utf-8')

        def extract_invocations(method_node, caller_symbol):
            call_order = 1
            def visit_calls(n):
                nonlocal call_order
                if n.type in ('call', 'call_expression', 'invocation_expression'):
                    func_node = n.child_by_field_name('function') or n.child_by_field_name('expression')
                    if not func_node:
                        for c in n.children:
                            if c.is_named:
                                func_node = c
                                break

                    if func_node:
                        method_called = get_node_text(func_node)
                        method_called = ''.join(method_called.split())
                        m_name_only = method_called.split('.')[-1]
                        if m_name_only not in self.KEYWORDS_TO_IGNORE:
                            if not (m_name_only == caller_symbol.split(".")[-1] and n.start_point[0] == method_node.start_point[0]):
                                graph.invocations.setdefault(caller_symbol, []).append(
                                    CallInvocation(
                                        caller_symbol=caller_symbol,
                                        called_symbol=method_called,
                                        file_path=rel_path,
                                        line_number=n.start_point[0] + 1,
                                        call_order=call_order
                                    )
                                )
                                call_order += 1
                for c in n.children:
                    visit_calls(c)
            visit_calls(method_node)

        def visit(node, parent_class=None):
            # Classes
            if node.type in ('class_declaration', 'class_definition', 'class_specifier'):
                name = self._get_child_text(node, 'name', source) or self._get_child_text(node, 'identifier', source)
                if name:
                    for child in node.children:
                        visit(child, parent_class=name)
                    return

            # Functions/Methods
            if node.type in ('function_definition', 'method_declaration',
                            'function_declaration', 'arrow_function',
                            'method_definition'):
                
                name = self._get_child_text(node, 'name', source) or self._get_child_text(node, 'identifier', source)
                
                if not name and node.parent and node.parent.type == 'variable_declarator':
                    name = self._get_child_text(node.parent, 'name', source)
                
                if name and name not in self.KEYWORDS_TO_IGNORE:
                    full_sym = f"{parent_class}.{name}" if parent_class else name
                    params = self._get_parameters(node, source)
                    
                    code_sym = CodeSymbol(
                        full_name=full_sym,
                        class_name=parent_class or "",
                        method_name=name,
                        file_path=rel_path,
                        line_number=node.start_point[0] + 1,
                        language=lang_name,
                        parameters=params
                    )
                    
                    graph.symbols[full_sym] = code_sym
                    graph.symbols[name] = code_sym
                    
                    if parent_class:
                        graph.class_methods.setdefault(parent_class, []).append(code_sym)
                    
                    extract_invocations(node, full_sym)
            
            for child in node.children:
                visit(child, parent_class)

        visit(root)


# ---------------------------------------------------------------------------
# Canvas Graph & Discrepancy Comparator Engine
# ---------------------------------------------------------------------------

class ReverseGraphAuditor:
    """Compares codebase static graph against GraphIPO canvas.json specification."""

    def __init__(self, code_graph: CodebaseGraph, canvas_spec: Dict[str, Any]):
        self.code_graph = code_graph
        self.canvas_spec = canvas_spec
        self.nodes = canvas_spec.get("nodes", [])

    def audit(self) -> Tuple[List[Discrepancy], Dict[str, Any]]:
        """Executes full discrepancy audit and produces structured results."""
        discrepancies: List[Discrepancy] = []
        node_audits: List[Dict[str, Any]] = []

        mapped_code_symbols: Set[str] = set()

        for node in self.nodes:
            node_id = node.get("id", "UNKNOWN_NODE")
            node_title = node.get("title", "Untitled Node")
            target_symbols = node.get("target_symbols", [])
            execution_plan = node.get("process_execution_plan", [])
            outputs = node.get("outputs", [])

            node_missing: List[str] = []
            node_matched: List[str] = []

            # 1. Audit Target Symbols (MISSING_IN_CODE)
            for ts_entry in target_symbols:
                raw_sym = ts_entry.get("symbol") if isinstance(ts_entry, dict) else str(ts_entry)
                norm_sym = self._normalize_symbol(raw_sym)
                matched_code_sym = self._find_matching_code_symbol(norm_sym)

                if matched_code_sym:
                    node_matched.append(raw_sym)
                    mapped_code_symbols.add(matched_code_sym.full_name)
                    mapped_code_symbols.add(matched_code_sym.method_name)
                else:
                    node_missing.append(raw_sym)
                    discrepancies.append(Discrepancy(
                        discrepancy_type="MISSING_IN_CODE",
                        severity="HIGH",
                        node_id=node_id,
                        node_title=node_title,
                        target_symbol=raw_sym,
                        description=f"Design target symbol '{raw_sym}' is missing in the codebase.",
                        details={"file_hint": ts_entry.get("file") if isinstance(ts_entry, dict) else None}
                    ))

            # 2. Audit Output Target Symbols
            for out in outputs:
                out_sym = out.get("target_symbol") if isinstance(out, dict) else str(out)
                out_case = out.get("case") if isinstance(out, dict) else "N/A"
                if out_sym:
                    norm_out = self._normalize_symbol(out_sym)
                    matched_code_sym = self._find_matching_code_symbol(norm_out)
                    if matched_code_sym:
                        mapped_code_symbols.add(matched_code_sym.full_name)
                        mapped_code_symbols.add(matched_code_sym.method_name)
                    else:
                        discrepancies.append(Discrepancy(
                            discrepancy_type="MISSING_IN_CODE",
                            severity="MEDIUM",
                            node_id=node_id,
                            node_title=node_title,
                            target_symbol=out_sym,
                            description=f"Node output target symbol '{out_sym}' is missing in codebase.",
                            details={"output_case": out_case}
                        ))

            # 3. Audit Execution Order (ORDER_MISMATCH)
            order_issues = self._audit_execution_order(node, mapped_code_symbols)
            discrepancies.extend(order_issues)

            node_audits.append({
                "node_id": node_id,
                "title": node_title,
                "lifecycle_phase": node.get("lifecycle_phase"),
                "status": node.get("status"),
                "matched_symbols": node_matched,
                "missing_symbols": node_missing,
                "order_issues_count": len(order_issues)
            })

        # 4. Audit Unmapped Code Methods (UNMAPPED_IN_DESIGN)
        unmapped_discrepancies = self._audit_unmapped_methods(mapped_code_symbols)
        discrepancies.extend(unmapped_discrepancies)

        # 5. Compute Compliance Metrics
        metrics = self._compute_metrics(discrepancies)

        return discrepancies, {
            "metrics": metrics,
            "nodes_audit": node_audits
        }

    def _normalize_symbol(self, sym: str) -> str:
        """Cleans and normalizes symbol string (removes parameters/parentheses)."""
        if not sym:
            return ""
        sym = re.sub(r'\(.*?\)', '', sym).strip()
        return sym

    def _find_matching_code_symbol(self, norm_sym: str) -> Optional[CodeSymbol]:
        """Finds CodeSymbol matching normalized name or class.method combination."""
        if not norm_sym:
            return None

        # 1. Exact match
        if norm_sym in self.code_graph.symbols:
            return self.code_graph.symbols[norm_sym]

        parts = norm_sym.split('.')
        method_part = parts[-1]

        # 2. Case-insensitive exact match
        for sym_key, sym_obj in self.code_graph.symbols.items():
            if sym_key.lower() == norm_sym.lower():
                return sym_obj

        # 3. Method name match (case-insensitive)
        for sym_key, sym_obj in self.code_graph.symbols.items():
            if sym_obj.method_name.lower() == method_part.lower():
                if len(parts) == 1:
                    return sym_obj
                elif sym_obj.class_name and sym_obj.class_name.lower() == parts[0].lower():
                    return sym_obj

        return None

    def _audit_execution_order(self, node: Dict[str, Any], mapped_code_symbols: Set[str]) -> List[Discrepancy]:
        """Checks if calls inside target symbols adhere to process_execution_plan step order."""
        discrepancies: List[Discrepancy] = []
        node_id = node.get("id", "UNKNOWN")
        node_title = node.get("title", "Untitled")
        plan = node.get("process_execution_plan", [])

        if not plan:
            return discrepancies

        ignore_kw = {k.lower() for k in CodebaseASTParser.KEYWORDS_TO_IGNORE}

        # Map step number to symbol signatures referenced in step
        step_symbol_map: Dict[int, Set[str]] = {}
        for idx, step_item in enumerate(plan, 1):
            if isinstance(step_item, dict):
                step_num = step_item.get("step", idx)
                text_sources = []
                if "actions" in step_item and isinstance(step_item["actions"], list):
                    text_sources.extend(step_item["actions"])
                if "targets" in step_item and isinstance(step_item["targets"], list):
                    text_sources.extend(step_item["targets"])
                if "rule" in step_item:
                    text_sources.append(str(step_item["rule"]))
                if "formula" in step_item:
                    text_sources.append(str(step_item["formula"]))
                full_text = " ".join(text_sources)
            else:
                step_num = idx
                full_text = str(step_item)

            symbols_in_step = set()
            found_syms = re.findall(r'\b(?:[A-Za-z0-9_]+\.)?[A-Za-z0-9_]+\b', full_text)
            for s in found_syms:
                norm = self._normalize_symbol(s)
                method_name_only = norm.split('.')[-1].lower()
                if norm and method_name_only not in ignore_kw:
                    symbols_in_step.add(method_name_only)

            step_symbol_map[step_num] = symbols_in_step

        # Find invocations within the node's target symbols
        target_symbols = node.get("target_symbols", [])
        for ts in target_symbols:
            raw_sym = ts.get("symbol") if isinstance(ts, dict) else str(ts)
            norm_sym = self._normalize_symbol(raw_sym)
            code_sym = self._find_matching_code_symbol(norm_sym)

            if not code_sym:
                continue

            invocations = self.code_graph.invocations.get(code_sym.full_name, [])
            detected_step_sequence: List[Tuple[int, int, str]] = [] # (call_order, step_num, symbol_called)

            for inv in invocations:
                called_mname = inv.called_symbol.split('.')[-1].lower()
                for step_num, step_syms in step_symbol_map.items():
                    if called_mname in step_syms:
                        detected_step_sequence.append((inv.call_order, step_num, inv.called_symbol))
                        # Register as mapped symbol
                        mapped_code_symbols.add(inv.called_symbol)
                        mapped_code_symbols.add(inv.called_symbol.split('.')[-1])

            # Check sequence monotonicity
            last_step = 0
            for call_ord, step_num, called_sym in detected_step_sequence:
                if step_num < last_step:
                    discrepancies.append(Discrepancy(
                        discrepancy_type="ORDER_MISMATCH",
                        severity="HIGH",
                        node_id=node_id,
                        node_title=node_title,
                        target_symbol=code_sym.full_name,
                        description=(
                            f"Step sequence violation in '{code_sym.full_name}': "
                            f"Call to '{called_sym}' (Step {step_num}) occurred after "
                            f"Step {last_step} execution."
                        ),
                        details={
                            "caller": code_sym.full_name,
                            "called_symbol": called_sym,
                            "expected_step": step_num,
                            "previous_step": last_step,
                            "call_order": call_ord
                        }
                    ))
                last_step = max(last_step, step_num)

        return discrepancies

    def _audit_unmapped_methods(self, mapped_symbols: Set[str]) -> List[Discrepancy]:
        """Identifies declared codebase methods not covered by any IPO canvas node."""
        unmapped: List[Discrepancy] = []

        seen_methods: Set[str] = set()
        mapped_lower = {s.lower() for s in mapped_symbols}

        for sym_key, sym_obj in self.code_graph.symbols.items():
            if sym_obj.full_name in seen_methods:
                continue
            seen_methods.add(sym_obj.full_name)

            if sym_obj.method_name in CodebaseASTParser.FRAMEWORK_LIFECYCLE_METHODS:
                continue

            if (sym_obj.full_name.lower() not in mapped_lower and
                sym_obj.method_name.lower() not in mapped_lower):
                unmapped.append(Discrepancy(
                    discrepancy_type="UNMAPPED_IN_DESIGN",
                    severity="LOW",
                    node_id="N/A",
                    node_title="Unmapped Code Method",
                    target_symbol=sym_obj.full_name,
                    description=f"Codebase method '{sym_obj.full_name}' ({sym_obj.file_path}:{sym_obj.line_number}) is not mapped to any GraphIPO design node.",
                    details={
                        "file_path": sym_obj.file_path,
                        "line_number": sym_obj.line_number,
                        "language": sym_obj.language
                    }
                ))

        return unmapped

    def _compute_metrics(self, discrepancies: List[Discrepancy]) -> Dict[str, Any]:
        """Computes summary stats and overall design adherence score."""
        missing_count = sum(1 for d in discrepancies if d.discrepancy_type == "MISSING_IN_CODE")
        order_count = sum(1 for d in discrepancies if d.discrepancy_type == "ORDER_MISMATCH")
        unmapped_count = sum(1 for d in discrepancies if d.discrepancy_type == "UNMAPPED_IN_DESIGN")

        total_target_symbols = sum(
            len(node.get("target_symbols", [])) for node in self.nodes
        )

        matched_target_symbols = max(0, total_target_symbols - missing_count)
        base_score = (matched_target_symbols / total_target_symbols * 100) if total_target_symbols > 0 else 100.0

        # Apply penalties for order mismatches and unmapped methods
        penalty = (order_count * 10) + (unmapped_count * 1)
        score = max(0, min(100, int(round(base_score - penalty))))

        unique_symbols_count = len(set(sym.full_name for sym in self.code_graph.symbols.values()))
        return {
            "total_nodes": len(self.nodes),
            "files_scanned": self.code_graph.files_scanned,
            "total_symbols_extracted": unique_symbols_count,
            "discrepancies_total": len(discrepancies),
            "missing_in_code_count": missing_count,
            "order_mismatch_count": order_count,
            "unmapped_in_design_count": unmapped_count,
            "compliance_score": score
        }


# ---------------------------------------------------------------------------
# Report Generator (JSON & Markdown)
# ---------------------------------------------------------------------------

class ReportWriter:
    """Emits clean JSON and beautifully formatted Markdown audit reports."""

    @staticmethod
    def write_json_report(output_path: Path, canvas_file: str, code_dir: str,
                          metrics: Dict[str, Any], discrepancies: List[Discrepancy],
                          nodes_audit: List[Dict[str, Any]]):
        """Outputs structured JSON report."""
        
        node_audit_results = {}
        for node in nodes_audit:
            node_discrepancies = [asdict(d) for d in discrepancies if d.node_id == node['node_id']]
            
            # Determine status
            if node['missing_symbols']:
                status = "MISSING" if len(node['missing_symbols']) >= len(node['matched_symbols']) and len(node['matched_symbols']) == 0 else "PARTIAL"
            elif node['order_issues_count'] > 0:
                status = "DRIFT"
            else:
                status = "MATCH"
                
            total_symbols = len(node['matched_symbols']) + len(node['missing_symbols'])
            coverage_percentage = (len(node['matched_symbols']) / total_symbols * 100) if total_symbols > 0 else 100

            node_audit_results[node['node_id']] = {
                "status": status,
                "discrepancies": node_discrepancies,
                "coverage_percentage": coverage_percentage
            }
            
        unmapped_code_symbols = [asdict(d) for d in discrepancies if d.discrepancy_type == "UNMAPPED_IN_DESIGN"]
        
        report_data = {
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "canvas_file": str(canvas_file),
                "code_dir": str(code_dir),
                "analyzer_version": "1.0.0"
            },
            "compliance_score": metrics.get("compliance_score", 0),
            "total_discrepancies": metrics.get("discrepancies_total", 0),
            "node_audit_results": node_audit_results,
            "unmapped_code_symbols": unmapped_code_symbols,
            "summary": metrics,
            "nodes_audit": nodes_audit
        }

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, indent=2)

    @staticmethod
    def write_markdown_report(output_path: Path, canvas_file: str, code_dir: str,
                              metrics: Dict[str, Any], discrepancies: List[Discrepancy],
                              nodes_audit: List[Dict[str, Any]]):
        """Outputs Github-Flavored Markdown report."""
        score = metrics.get("compliance_score", 0)

        # Determine status badge
        if score >= 90:
            badge = "🟩 **PASSED / EXCELLENT**"
        elif score >= 70:
            badge = "🟨 **WARNING / MINOR DRIFT**"
        else:
            badge = "🟥 **CRITICAL DRIFT DETECTED**"

        lines = [
            "# GraphIPO Reverse Code-to-Graph Drift Report 🔍",
            "",
            f"**Audit Status:** {badge}  |  **Compliance Score:** `{score}%`",
            f"**Generated:** `{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}`",
            f"**Canvas Spec:** `{canvas_file}`  |  **Code Base:** `{code_dir}`",
            "",
            "---",
            "",
            "## 📊 Executive Summary Metrics",
            "",
            "| Metric | Count / Value | Description |",
            "| :--- | :---: | :--- |",
            f"| **Design Nodes** | `{metrics.get('total_nodes', 0)}` | Total IPO Canvas design nodes evaluated |",
            f"| **Files Scanned** | `{metrics.get('files_scanned', 0)}` | Source code files (.cs, .ts, .py) parsed |",
            f"| **Compliance Score** | `{score}%` | Design adherence rating (0 - 100%) |",
            f"| **Missing in Code** | `{metrics.get('missing_in_code_count', 0)}` | Design symbols not found in codebase |",
            f"| **Order Mismatches** | `{metrics.get('order_mismatch_count', 0)}` | Execution step sequence violations |",
            f"| **Unmapped Methods** | `{metrics.get('unmapped_in_design_count', 0)}` | Code methods absent in design nodes |",
            "",
            "---",
            "",
            "## ⚠️ Architectural Discrepancies Breakdown",
            ""
        ]

        if not discrepancies:
            lines.append("🎉 **No discrepancies detected! Codebase is in 100% synchronization with GraphIPO canvas specification.**\n")
        else:
            lines.extend([
                "| Severity | Discrepancy Type | Node ID | Symbol / Target | Description |",
                "| :---: | :--- | :---: | :--- | :--- |"
            ])

            severity_emoji = {"HIGH": "🔴 HIGH", "MEDIUM": "🟠 MED", "LOW": "🟡 LOW"}

            for d in discrepancies:
                sev = severity_emoji.get(d.severity, d.severity)
                lines.append(
                    f"| {sev} | `{d.discrepancy_type}` | `{d.node_id}` | `{d.target_symbol}` | {d.description} |"
                )

        lines.extend([
            "",
            "---",
            "",
            "## 🧩 Node-by-Node Audit Details",
            ""
        ])

        for node in nodes_audit:
            status_icon = "✅" if not node["missing_symbols"] and node["order_issues_count"] == 0 else "⚠️"
            lines.extend([
                f"### {status_icon} Node [{node['node_id']}]: {node['title']}",
                f"- **Lifecycle Phase:** `{node.get('lifecycle_phase', 'N/A')}`",
                f"- **Design Status:** `{node.get('status', 'N/A')}`",
                f"- **Matched Code Symbols:** {', '.join([f'`{s}`' for s in node['matched_symbols']]) if node['matched_symbols'] else '_None_'}",
                f"- **Missing Code Symbols:** {', '.join([f'`{s}`' for s in node['missing_symbols']]) if node['missing_symbols'] else 'None 🎉'}",
                f"- **Order Violation Count:** `{node['order_issues_count']}`",
                ""
            ])

        lines.extend([
            "---",
            "",
            "## 🚀 Actionable Recommendations",
            "",
            "1. **Fix Missing Symbols:** Implement design target symbols flagged with `MISSING_IN_CODE` in their respective code modules.",
            "2. **Correct Call Sequence:** Ensure caller methods execute steps strictly according to the `process_execution_plan` sequence defined in `.ipo/canvas.json`.",
            "3. **Update Canvas Spec:** If newly added codebase methods are valid architectural additions, append them into `.ipo/canvas.json` nodes to resolve `UNMAPPED_IN_DESIGN` warnings.",
            ""
        ])

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("\n".join(lines))


# ---------------------------------------------------------------------------
# Main CLI Entrypoint
# ---------------------------------------------------------------------------

class ImplementationGraphGenerator:
    """Generates a GraphIPO canvas.json compatible structure from the codebase graph."""

    @staticmethod
    def generate(code_graph: CodebaseGraph) -> Dict[str, Any]:
        nodes = []
        
        node_map = {}
        for sym in code_graph.symbols.values():
            if '.' not in sym.full_name and sym.class_name == "":
                # Top level method
                node_id = sym.file_path.replace('/', '_').replace('.', '_') + "_" + sym.method_name
                title = sym.method_name
                group = sym.file_path
            else:
                node_id = sym.file_path.replace('/', '_').replace('.', '_') + "_" + sym.class_name
                title = sym.class_name
                group = sym.class_name

            if node_id not in node_map:
                node_map[node_id] = {
                    "id": node_id,
                    "title": title,
                    "status": "IMPLEMENTED",
                    "target_symbols": [{"symbol": group}],
                    "inputs": [],
                    "process_execution_plan": [],
                    "outputs": [],
                    "_methods": []
                }
            node_map[node_id]["_methods"].append(sym)
            
        for node in node_map.values():
            for m in node["_methods"]:
                # Add inputs
                for p in m.parameters:
                    node["inputs"].append({"name": p, "type": "any", "description": f"Parameter for {m.method_name}"})
                
                # Add execution plan
                node["process_execution_plan"].append(f"Execute {m.method_name}")
                
            del node["_methods"]
            nodes.append(node)

        # Edges
        edges = []
        for caller, invs in code_graph.invocations.items():
            caller_sym = code_graph.symbols.get(caller)
            if not caller_sym: continue
            
            if caller_sym.class_name:
                source_id = caller_sym.file_path.replace('/', '_').replace('.', '_') + "_" + caller_sym.class_name
            else:
                source_id = caller_sym.file_path.replace('/', '_').replace('.', '_') + "_" + caller_sym.method_name
                
            for inv in invs:
                called_sym = code_graph.symbols.get(inv.called_symbol)
                if not called_sym: continue
                
                if called_sym.class_name:
                    target_id = called_sym.file_path.replace('/', '_').replace('.', '_') + "_" + called_sym.class_name
                else:
                    target_id = called_sym.file_path.replace('/', '_').replace('.', '_') + "_" + called_sym.method_name
                
                if source_id != target_id:
                    edges.append({
                        "source": source_id,
                        "target": target_id,
                        "label": f"calls {inv.called_symbol.split('.')[-1]}"
                    })
                    
        return {
            "version": "1.0",
            "nodes": nodes,
            "edges": edges
        }

def main():
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass

    parser = argparse.ArgumentParser(
        description="GraphIPO Reverse Graph Analyzer - Static Analysis & Discrepancy Auditor",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )

    parser.add_argument("--code-dir", required=True, type=str, help="Directory path of the target codebase to scan")
    parser.add_argument("--canvas-json", required=True, type=str, help="Path to GraphIPO design specification (.ipo/canvas.json)")
    parser.add_argument("--output-report", default="ipo_drift_report.md", type=str, help="Output file path for Markdown report")
    parser.add_argument("--output-json", default="ipo_drift_report.json", type=str, help="Output file path for JSON audit report")

    args = parser.parse_args()

    code_dir = Path(args.code_dir).resolve()
    canvas_path = Path(args.canvas_json).resolve()
    md_output = Path(args.output_report).resolve()
    json_output = Path(args.output_json).resolve()

    if not code_dir.exists() or not code_dir.is_dir():
        print(f"Error: Target code directory '{code_dir}' does not exist.")
        sys.exit(1)

    if not canvas_path.exists() or not canvas_path.is_file():
        print(f"Error: Canvas JSON file '{canvas_path}' does not exist.")
        sys.exit(1)

    print(f"🔍 GraphIPO Reverse Graph Analyzer v1.0.0")
    print(f"==========================================")
    print(f"Scanning Code Directory : {code_dir}")
    print(f"Parsing Design Specification: {canvas_path}")

    # 1. Parse Canvas Specification
    try:
        with open(canvas_path, 'r', encoding='utf-8') as f:
            canvas_spec = json.load(f)
    except Exception as e:
        print(f"Error reading canvas JSON file: {e}")
        sys.exit(1)

    # 2. Parse Codebase Static Graph
    parser_engine = CodebaseASTParser(code_dir)
    code_graph = parser_engine.parse_codebase()

    print(f"Files Scanned: {code_graph.files_scanned}")
    print(f"Symbols Extracted: {len(code_graph.symbols)}")

    # 3. Compare Codebase Graph against Canvas
    auditor = ReverseGraphAuditor(code_graph, canvas_spec)
    discrepancies, audit_summary = auditor.audit()

    metrics = audit_summary["metrics"]
    nodes_audit = audit_summary["nodes_audit"]

    # 4. Generate Reports
    ReportWriter.write_json_report(json_output, str(canvas_path), str(code_dir), metrics, discrepancies, nodes_audit)
    ReportWriter.write_markdown_report(md_output, str(canvas_path), str(code_dir), metrics, discrepancies, nodes_audit)
    
    # 5. Generate Implementation Graph
    impl_graph = ImplementationGraphGenerator.generate(code_graph)
    impl_out = Path(code_dir) / "demo_canvas.json"
    with open(impl_out, 'w', encoding='utf-8') as f:
        json.dump(impl_graph, f, indent=2)
    print(f"Implementation Graph: {impl_out}")

    print(f"\nAudit Finished!")
    print(f"------------------------------------------")
    print(f"Compliance Score : {metrics['compliance_score']}%")
    print(f"Discrepancies    : {metrics['discrepancies_total']} (Missing: {metrics['missing_in_code_count']}, Order: {metrics['order_mismatch_count']}, Unmapped: {metrics['unmapped_in_design_count']})")
    print(f"Markdown Report  : {md_output}")
    print(f"JSON Report      : {json_output}")

if __name__ == "__main__":
    main()
