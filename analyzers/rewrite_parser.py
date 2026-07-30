import re

with open("reverse_graph_analyzer.py", "r", encoding="utf-8") as f:
    content = f.read()

start_marker = "class CodebaseASTParser:"
end_marker = "# Canvas Graph & Discrepancy Comparator Engine"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker) - 80 # Just to be safe and find the right place before this section

end_idx = content.rfind("# ---------------------------------------------------------------------------", start_idx, end_idx + 80)

replacement = """class CodebaseASTParser:
    \"\"\"Tree-sitter based AST parser for C#, TypeScript, and Python source files.\"\"\"

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
                    rel_path = os.path.relpath(full_path, self.code_dir).replace('\\', '/')
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
"""

new_content = content[:start_idx] + replacement + "\n\n" + content[end_idx:]

with open("reverse_graph_analyzer.py", "w", encoding="utf-8") as f:
    f.write(new_content)
print("Updated successfully")
