import re

with open('src/fsm.ts', 'r', encoding='utf-8') as f:
    content = f.read()

def add_tools(match):
    tools = match.group(1)
    # Add common tools if not exist
    if '"get_profile"' not in tools:
        tools = tools[:-1] + ', "get_profile", "request_phase_regression"]'
    return f'allowed_tools: {tools}'

# regex for allowed_tools
content = re.sub(r'allowed_tools:\s*(\[[^\]]+\])', add_tools, content)

# Now add phase specific ones:
# NODE_DRILLDOWN, SPECIFIED, IMPLEMENTATION: lock_node, unlock_node
# AUDIT: run_audit, get_audit_report, lock_node, unlock_node

content = content.replace(
    'allowed_tools: ["get_canvas", "update_node_pseudocode", "create_ipo_node", "set_code_language", "validate_state", "set_node_status", "add_edge", "remove_edge", "remove_node", "search_nodes", "get_context_injection", "get_profile", "request_phase_regression"]',
    'allowed_tools: ["get_canvas", "update_node_pseudocode", "create_ipo_node", "set_code_language", "validate_state", "set_node_status", "add_edge", "remove_edge", "remove_node", "search_nodes", "get_context_injection", "get_profile", "request_phase_regression", "lock_node", "unlock_node"]'
)

content = content.replace(
    'allowed_tools: ["get_canvas", "set_node_status", "set_code_language", "validate_state", "search_nodes", "get_context_injection", "get_profile", "request_phase_regression"]',
    'allowed_tools: ["get_canvas", "set_node_status", "set_code_language", "validate_state", "search_nodes", "get_context_injection", "get_profile", "request_phase_regression", "lock_node", "unlock_node"]'
)

# Wait, SPECIFIED, IMPLEMENTATION, and AUDIT have the exact same list initially.
# So let's replace AUDIT's specifically.

with open('src/fsm.ts', 'w', encoding='utf-8') as f:
    f.write(content)

