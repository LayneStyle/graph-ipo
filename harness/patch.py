import re
import os

with open('src/server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
imports = """import { wsBridge } from "./ws-bridge.js";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function checkLock(node: IPONode, agent_id?: string): string | null {
  if (!node.locked_by || !node.locked_at) return null;
  if (agent_id && node.locked_by === agent_id) return null;
  const lockTime = new Date(node.locked_at).getTime();
  if (Date.now() - lockTime > 30 * 60 * 1000) return null;
  return `Node is locked by ${node.locked_by}`;
}
"""

content = content.replace('import { IPONode, IPOEdge, NodeStatusType, ProfileType } from "./types.js";', 
                          'import { IPONode, IPOEdge, NodeStatusType, ProfileType, PhaseType } from "./types.js";\n' + imports)

# Update create_ipo_node
content = content.replace('status: z.enum(["DESIGN", "READY_FOR_IMPLEMENTATION", "IMPLEMENTED", "NEEDS_REVISION"]).optional().default("DESIGN"),',
                          'status: z.enum(["DESIGN", "READY_FOR_IMPLEMENTATION", "IMPLEMENTED", "NEEDS_REVISION", "REWORK"]).optional().default("DESIGN"),\n    agent_id: z.string().optional().describe("Agent ID for lock checking"),')

content = content.replace('''    const existingIndex = canvas.nodes.findIndex((n) => n.id === args.id);
    const existingNode = existingIndex >= 0 ? canvas.nodes[existingIndex] : null;''',
'''    const existingIndex = canvas.nodes.findIndex((n) => n.id === args.id);
    const existingNode = existingIndex >= 0 ? canvas.nodes[existingIndex] : null;

    if (existingNode) {
      const lockError = checkLock(existingNode, args.agent_id);
      if (lockError) {
        return { content: [{ type: "text", text: `Error: ${lockError}` }] };
      }
    }''')

content = content.replace('''    if (existingIndex >= 0) {
      canvas.nodes[existingIndex] = newNode;
    } else {
      canvas.nodes.push(newNode);
    }

    canvas.phase = evaluatePhase(canvas);
    saveCanvas(canvas, filePath);''',
'''    let wasAdded = false;
    if (existingIndex >= 0) {
      canvas.nodes[existingIndex] = newNode;
    } else {
      canvas.nodes.push(newNode);
      wasAdded = true;
    }

    const oldPhase = canvas.phase;
    canvas.phase = evaluatePhase(canvas);
    saveCanvas(canvas, filePath);
    
    if (wasAdded) {
      wsBridge.broadcast({ type: 'NODE_ADDED', payload: { node: newNode } });
    } else {
      wsBridge.broadcast({ type: 'NODE_STATUS_CHANGED', payload: { node_id: newNode.id, new_status: newNode.status } });
    }
    if (oldPhase !== canvas.phase) {
      wsBridge.broadcast({ type: 'PHASE_CHANGED', payload: { phase: canvas.phase } });
    }''')


# Update update_node_pseudocode
content = content.replace('''    process_steps: z.array(z.string()).optional().describe("Optional explicit process execution steps array"),
    path: z.string().optional().describe("Optional custom path to .ipo/canvas.json")''',
'''    process_steps: z.array(z.string()).optional().describe("Optional explicit process execution steps array"),
    agent_id: z.string().optional().describe("Agent ID for lock checking"),
    path: z.string().optional().describe("Optional custom path to .ipo/canvas.json")''')

content = content.replace('''      return {
        content: [{ type: "text", text: `Error: Node with ID '${args.node_id}' not found in canvas.${banner}` }]
      };
    }''',
'''      return {
        content: [{ type: "text", text: `Error: Node with ID '${args.node_id}' not found in canvas.${banner}` }]
      };
    }

    const lockError = checkLock(node, args.agent_id);
    if (lockError) {
      return { content: [{ type: "text", text: `Error: ${lockError}` }] };
    }''')


# Update set_node_status
content = content.replace('''    status: z.enum(["DESIGN", "READY_FOR_IMPLEMENTATION", "IMPLEMENTED", "NEEDS_REVISION"]).describe("Target status for the node"),
    path: z.string().optional().describe("Optional custom path to .ipo/canvas.json")''',
'''    status: z.enum(["DESIGN", "READY_FOR_IMPLEMENTATION", "IMPLEMENTED", "NEEDS_REVISION", "REWORK"]).describe("Target status for the node"),
    agent_id: z.string().optional().describe("Agent ID for lock checking"),
    path: z.string().optional().describe("Optional custom path to .ipo/canvas.json")''')

content = content.replace('''    const previousStatus = node.status;
    node.status = args.status as NodeStatusType;

    canvas.phase = evaluatePhase(canvas);
    saveCanvas(canvas, filePath);''',
'''    const lockError = checkLock(node, args.agent_id);
    if (lockError) {
      return { content: [{ type: "text", text: `Error: ${lockError}` }] };
    }

    const previousStatus = node.status;
    node.status = args.status as NodeStatusType;

    const oldPhase = canvas.phase;
    canvas.phase = evaluatePhase(canvas);
    saveCanvas(canvas, filePath);
    
    wsBridge.broadcast({ type: 'NODE_STATUS_CHANGED', payload: { node_id: node.id, new_status: node.status } });
    if (oldPhase !== canvas.phase) {
      wsBridge.broadcast({ type: 'PHASE_CHANGED', payload: { phase: canvas.phase } });
    }''')


# Update remove_node
content = content.replace('''    // Also remove any edges connected to this node
    if (canvas.edges) {
      canvas.edges = canvas.edges.filter(e => e.source !== args.node_id && e.target !== args.node_id);
    }

    canvas.phase = evaluatePhase(canvas);
    saveCanvas(canvas, filePath);''',
'''    // Also remove any edges connected to this node
    if (canvas.edges) {
      canvas.edges = canvas.edges.filter(e => e.source !== args.node_id && e.target !== args.node_id);
    }

    const oldPhase = canvas.phase;
    canvas.phase = evaluatePhase(canvas);
    saveCanvas(canvas, filePath);
    
    wsBridge.broadcast({ type: 'NODE_REMOVED', payload: { node_id: args.node_id } });
    if (oldPhase !== canvas.phase) {
      wsBridge.broadcast({ type: 'PHASE_CHANGED', payload: { phase: canvas.phase } });
    }''')


# Update add_edge
content = content.replace('''    saveCanvas(canvas, filePath);
    const banner = buildStateBanner(canvas);''',
'''    saveCanvas(canvas, filePath);
    wsBridge.broadcast({ type: 'EDGE_ADDED', payload: { edge: newEdge } });
    const banner = buildStateBanner(canvas);''')

# Update remove_edge
content = content.replace('''    canvas.edges.splice(existingIndex, 1);
    saveCanvas(canvas, filePath);
    const banner = buildStateBanner(canvas);''',
'''    canvas.edges.splice(existingIndex, 1);
    saveCanvas(canvas, filePath);
    wsBridge.broadcast({ type: 'EDGE_REMOVED', payload: { edge_id: args.edge_id } });
    const banner = buildStateBanner(canvas);''')


# Insert new tools before main()
new_tools = """
// Tool: get_profile
server.tool(
  "get_profile",
  "Reads a profile JSON file from the profiles directory.",
  {
    profile_name: z.string().optional().describe("Profile name (e.g. unity, web_fullstack). If omitted, returns active profile.")
  },
  async (args) => {
    let name = args.profile_name;
    if (!name) {
      const { canvas } = loadCanvas();
      name = canvas.active_profile.toLowerCase();
      if (name === "unity_gamedev") name = "unity";
    }
    const profilePath = path.join(__dirname, "..", "..", "profiles", `${name}.profile.json`);
    if (!fs.existsSync(profilePath)) {
      return { content: [{ type: "text", text: `Error: Profile '${name}' not found at ${profilePath}` }] };
    }
    const data = fs.readFileSync(profilePath, "utf-8");
    return { content: [{ type: "text", text: data }] };
  }
);

// Tool: request_phase_regression
server.tool(
  "request_phase_regression",
  "Forces a phase override to move to an earlier phase.",
  {
    target_phase: z.enum(["MACRO_DESIGN", "NODE_DRILLDOWN", "SPECIFIED", "IMPLEMENTATION", "AUDIT"]).describe("Target phase to revert to"),
    reason: z.string().describe("Reason for regression"),
    path: z.string().optional().describe("Optional custom path to .ipo/canvas.json")
  },
  async (args) => {
    const { canvas, filePath } = loadCanvas(args.path);
    canvas.override_phase = args.target_phase as PhaseType;
    canvas.phase = evaluatePhase(canvas); // will use override
    saveCanvas(canvas, filePath);
    
    console.error(`[PHASE REGRESSION] Target: ${args.target_phase}, Reason: ${args.reason}, Time: ${new Date().toISOString()}`);
    wsBridge.broadcast({ type: 'PHASE_CHANGED', payload: { phase: canvas.phase } });
    
    const banner = buildStateBanner(canvas);
    return { content: [{ type: "text", text: `Successfully forced phase to ${args.target_phase}. Reason: ${args.reason}\n${banner}` }] };
  }
);

// Tool: lock_node
server.tool(
  "lock_node",
  "Locks a node for a specific agent.",
  {
    node_id: z.string(),
    agent_id: z.string(),
    path: z.string().optional()
  },
  async (args) => {
    const { canvas, filePath } = loadCanvas(args.path);
    const node = canvas.nodes.find(n => n.id === args.node_id);
    if (!node) return { content: [{ type: "text", text: `Error: Node not found` }] };
    
    const lockError = checkLock(node, args.agent_id);
    if (lockError) return { content: [{ type: "text", text: `Error: ${lockError}` }] };
    
    node.locked_by = args.agent_id;
    node.locked_at = new Date().toISOString();
    saveCanvas(canvas, filePath);
    return { content: [{ type: "text", text: `Node ${args.node_id} locked by ${args.agent_id}` }] };
  }
);

// Tool: unlock_node
server.tool(
  "unlock_node",
  "Unlocks a node.",
  {
    node_id: z.string(),
    agent_id: z.string(),
    path: z.string().optional()
  },
  async (args) => {
    const { canvas, filePath } = loadCanvas(args.path);
    const node = canvas.nodes.find(n => n.id === args.node_id);
    if (!node) return { content: [{ type: "text", text: `Error: Node not found` }] };
    
    if (node.locked_by && node.locked_by !== args.agent_id) {
      const lockTime = new Date(node.locked_at || 0).getTime();
      if (Date.now() - lockTime <= 30 * 60 * 1000) {
        return { content: [{ type: "text", text: `Error: Node is locked by ${node.locked_by}` }] };
      }
    }
    
    node.locked_by = undefined;
    node.locked_at = undefined;
    saveCanvas(canvas, filePath);
    return { content: [{ type: "text", text: `Node ${args.node_id} unlocked` }] };
  }
);

// Tool: run_audit
server.tool(
  "run_audit",
  "Runs the reverse graph analyzer on a codebase.",
  {
    code_dir: z.string(),
    canvas_path: z.string().optional()
  },
  async (args) => {
    const scriptPath = path.join(__dirname, "..", "..", "analyzers", "reverse_graph_analyzer.py");
    const { filePath } = loadCanvas(args.canvas_path);
    const outPath = path.join(__dirname, "..", "audit_report.json");
    
    try {
      execSync(`python "${scriptPath}" --code-dir "${args.code_dir}" --canvas-json "${filePath}" --output-json "${outPath}"`, { encoding: 'utf-8' });
      const report = fs.readFileSync(outPath, "utf-8");
      return { content: [{ type: "text", text: `Audit complete:\n${report}` }] };
    } catch (err: any) {
      return { content: [{ type: "text", text: `Error running audit: ${err.message || err}\n${err.stdout || ''}\n${err.stderr || ''}` }] };
    }
  }
);

// Tool: get_audit_report
server.tool(
  "get_audit_report",
  "Gets the latest audit report.",
  {
    report_path: z.string().optional()
  },
  async (args) => {
    const outPath = args.report_path || path.join(__dirname, "..", "audit_report.json");
    if (!fs.existsSync(outPath)) {
      return { content: [{ type: "text", text: `Error: Report not found at ${outPath}` }] };
    }
    const report = fs.readFileSync(outPath, "utf-8");
    return { content: [{ type: "text", text: report }] };
  }
);

async function main() {
"""

content = content.replace("async function main() {", new_tools)

# Initialize WS bridge in stdio mode, wait, requirements say: 
# "Initialize the bridge in main() only when running in stdio mode (when running SSE mode, the bridge is also useful)" - Actually prompt says "Initialize the bridge in main() only when running in stdio mode (when running SSE mode, the bridge is also useful)", wait, it implies either only stdio or both? "only when running in stdio mode (when running SSE mode, the bridge is also useful)" -> let's just initialize it universally in main.

ws_init = """
  wsBridge.setGetState(() => {
    const { canvas } = loadCanvas();
    return canvas;
  });
  wsBridge.initialize(9120);
"""

content = content.replace("const args = process.argv.slice(2);", "const args = process.argv.slice(2);\n" + ws_init)

with open('src/server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
