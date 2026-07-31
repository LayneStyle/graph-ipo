#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express, { Request, Response } from "express";
import { z } from "zod";
import { loadCanvas, saveCanvas } from "./canvasStore.js";
import { buildStateBanner, validateCanvasState, evaluateNodePhase } from "./fsm.js";
import { IPONode, IPOEdge, NodeStatusType, PhaseType, CanvasProgressSummary } from "./types.js";
import { wsBridge } from "./ws-bridge.js";
import { fileURLToPath } from 'node:url';
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function checkLock(node: IPONode, agent_id?: string): string | null {
  if (!node.locked_by || !node.locked_at) return null;
  if (agent_id && node.locked_by === agent_id) return null;
  const lockTime = new Date(node.locked_at).getTime();
  if (Date.now() - lockTime > 30 * 60 * 1000) return null;
  return `Node is locked by ${node.locked_by}`;
}

const server = new McpServer({
  name: "graph-ipo-harness",
  version: "1.0.0"
});

// Tool 1: get_canvas
server.tool(
  "get_canvas",
  "Returns the current .ipo/canvas.json structure or creates a default canvas if missing.",
  {
    path: z.string().optional().describe("Optional custom path to .ipo/canvas.json")
  },
  async (args) => {
    const { canvas, filePath } = loadCanvas(args.path);
    saveCanvas(canvas, filePath);

    const banner = buildStateBanner(canvas, process.env.MCP_CLIENT_NAME || "antigravity");
    const contentText = `Canvas Loaded Successfully (${filePath}):\n\n${JSON.stringify(canvas, null, 2)}\n${banner}`;

    return {
      content: [{ type: "text", text: contentText }]
    };
  }
);

// Tool: start_discovery
server.tool(
  "start_discovery",
  "Initializes a new GraphIPO project by setting the project description and user experience level. Returns guided instructions for the agent to conduct a discovery interview with the user, then generate the initial architecture graph.",
  {
    project_description: z.string().describe("What the user wants to build, in their own words (e.g., 'a task management app for teams')"),
    experience_level: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('intermediate').describe("User's software development experience level"),
    language: z.enum(['EN', 'ES']).optional().default('EN').describe("Preferred language for communication"),
    path: z.string().optional()
  },
  async (args) => {
    const { canvas, filePath } = loadCanvas(args.path);
    canvas.project_description = args.project_description;
    canvas.user_experience_level = args.experience_level as any;
    canvas.code_language = args.language as any;
    canvas.discovery_completed = false;
    saveCanvas(canvas, filePath);

    const levelInstructions = {
      beginner: `The user is a BEGINNER developer. You MUST:
- Use simple, everyday language. Avoid jargon like 'middleware', 'repository', 'dependency injection'.
- Explain EVERY architectural decision in plain terms.
- Name nodes with descriptive names the user understands (e.g., 'Login Screen', 'Task List Page', NOT 'AuthMiddleware').
- When writing pseudocode, use natural language steps, not programming syntax.
- Ask the user to validate each major decision before proceeding.`,
      intermediate: `The user is an INTERMEDIATE developer. You MUST:
- Use clear language but you can introduce technical concepts WITH brief explanations.
- Name nodes with semi-technical names (e.g., 'User Authentication', 'Task API Service').
- When writing pseudocode, use structured natural language with occasional technical terms.
- Explain WHY you're making architectural decisions, not just what they are.`,
      advanced: `The user is an ADVANCED developer. You can:
- Use standard technical terminology freely.
- Name nodes with technical precision (e.g., 'AuthMiddleware', 'TaskRepository').
- Write pseudocode using programming conventions.
- Focus on trade-offs and architectural patterns rather than basic explanations.`
    };

    const discoveryInstructions = `
═══════════════════════════════════════════════════════════════
🚀 PROJECT DISCOVERY INITIALIZED
═══════════════════════════════════════════════════════════════

Project: ${args.project_description}
Experience Level: ${args.experience_level}
Language: ${args.language === 'ES' ? 'Spanish' : 'English'}

${levelInstructions[args.experience_level || 'intermediate']}

═══════════════════════════════════════════════════════════════
⚠️  MANDATORY: DISCOVERY INTERVIEW REQUIRED
═══════════════════════════════════════════════════════════════

You MUST conduct a discovery interview with the user BEFORE creating any nodes.
DO NOT call create_ipo_node until you have asked questions and received answers.

Ask these categories of questions ONE or TWO at a time (NOT all at once):

1. USERS: Who will use this? (end users, admins, API consumers, both?)
2. CORE FEATURES: What are the 3-5 main things a user can do?
3. DATA: What information does the app need to store or manage?
4. PLATFORM: Web, mobile, desktop? Any specific technology preferences?
5. INTEGRATIONS: Does it need to connect to external services? (payments, auth, APIs, etc.)

IMPORTANT RULES:
- Ask 1-2 questions, WAIT for the user's response, then ask the next ones.
- DO NOT assume answers. The user's vision may surprise you.
- After gathering enough answers (at least 3 exchanges), call complete_discovery.
- ONLY THEN start creating nodes with create_ipo_node.

After the interview, for each node you create:
- Set a clear, user-friendly title
- Write a 'description' explaining what this component does and why it exists
- Start with high-level nodes (5-8 max), don't over-decompose initially
- Connect nodes with add_edge to show data flow
- Present the resulting graph to the user for validation

The user should look at the graph and say "Yes, that's what I want to build."
═══════════════════════════════════════════════════════════════
`;

    wsBridge.broadcast({ type: 'DISCOVERY_STARTED', payload: { project_description: args.project_description, experience_level: args.experience_level } });

    return {
      content: [{ type: "text", text: discoveryInstructions }]
    };
  }
);

// Tool: complete_discovery
server.tool(
  "complete_discovery",
  "Marks the discovery interview as completed. Call this AFTER you have asked the user discovery questions and received their answers. This unlocks node creation without warnings.",
  {
    summary: z.string().describe("Brief summary of what was learned during discovery (e.g., 'User wants a 2-player browser game with score tracking')"),
    path: z.string().optional()
  },
  async (args) => {
    const { canvas, filePath } = loadCanvas(args.path);
    canvas.discovery_completed = true;
    saveCanvas(canvas, filePath);
    wsBridge.broadcast({ type: 'FULL_STATE', payload: canvas });
    const banner = buildStateBanner(canvas);
    return {
      content: [{ type: "text", text: `✅ Discovery interview completed.\n\nSummary: ${args.summary}\n\nYou may now create IPO nodes based on the user's requirements. Start with 5-8 high-level nodes, then connect them with edges.\n${banner}` }]
    };
  }
);

// Tool: set_experience_level
server.tool(
  "set_experience_level",
  "Sets the user's experience level, which controls how the agent communicates and names components.",
  {
    level: z.enum(['beginner', 'intermediate', 'advanced']).describe("User experience level"),
    path: z.string().optional()
  },
  async (args) => {
    const { canvas, filePath } = loadCanvas(args.path);
    canvas.user_experience_level = args.level as any;
    saveCanvas(canvas, filePath);
    const banner = buildStateBanner(canvas);
    return { content: [{ type: "text", text: `Experience level set to '${args.level}'. Agent communication style updated accordingly.\n${banner}` }] };
  }
);


// Tool 2: create_ipo_node
server.tool(
  "create_ipo_node",
  "Adds a new IPO node with inputs, target_symbols, process_steps/pseudocode, and outputs.",
  {
    id: z.string().describe("Unique node identifier (e.g. node_auth_handler)"),
    title: z.string().describe("Human readable title of the node"),
    description: z.string().optional().describe("Plain language description of what this node does and why it exists"),
    domain: z.string().optional().describe("Domain or category (e.g., System Engine, Client Component, API Route Handler)"),
    category: z.string().optional().describe("Category alias for domain"),
    inputs: z.array(z.string()).optional().describe("Array of input dependencies or triggers"),
    target_symbols: z.array(z.string()).optional().describe("Array of target symbols or file paths"),
    process_steps: z.array(z.string()).optional().describe("Sequential/parallel execution steps or pseudocode"),
    process_execution_plan: z.array(z.string()).optional().describe("Execution plan steps alias"),
    outputs: z.array(z.string()).optional().describe("Array of outputs, state changes, or event emissions"),
    status: z.enum(["DESIGN", "READY_FOR_IMPLEMENTATION", "IMPLEMENTED", "NEEDS_REVISION", "REWORK"]).optional().default("DESIGN"),
    agent_id: z.string().optional().describe("Agent ID for lock checking"),
    assigned_to: z.string().optional().describe("Assign this node to a specific agent"),
    notes: z.string().optional().describe("User comments or notes"),
    path: z.string().optional().describe("Optional custom path to .ipo/canvas.json")
  },
  async (args) => {
    const { canvas, filePath } = loadCanvas(args.path);

    // Warn if discovery interview has not been completed
    let discoveryWarning = '';
    if (canvas.discovery_completed === false) {
      discoveryWarning = '\n\n⚠️ WARNING: Discovery interview has not been completed yet. You should conduct the interview with the user first, then call complete_discovery before creating nodes. If you intentionally want to skip the interview, you may continue, but the design quality may suffer.\n';
    }

    const existingIndex = canvas.nodes.findIndex((n) => n.id === args.id);
    const existingNode = existingIndex >= 0 ? canvas.nodes[existingIndex] : null;

    if (existingNode) {
      const lockError = checkLock(existingNode, args.agent_id);
      if (lockError) {
        return { content: [{ type: "text", text: `Error: ${lockError}` }] };
      }
    }

    const cat = args.category || args.domain || existingNode?.category || "General";
    const steps = (args.process_execution_plan || args.process_steps) ?? existingNode?.process_execution_plan ?? [];

    const newNode: IPONode = {
      id: args.id,
      title: args.title,
      description: args.description || existingNode?.description || '',
      category: cat,
      lifecycle_phase: "MACRO_DESIGN",
      target_symbols: args.target_symbols ?? existingNode?.target_symbols ?? [],
      inputs: args.inputs ?? existingNode?.inputs ?? [],
      process_execution_plan: steps,
      outputs: args.outputs ?? existingNode?.outputs ?? [],
      status: (args.status as NodeStatusType) || existingNode?.status || "DESIGN",
      assigned_to: args.assigned_to ?? existingNode?.assigned_to,
      notes: args.notes ?? existingNode?.notes
    };

    newNode.lifecycle_phase = evaluateNodePhase(newNode);

    let wasAdded = false;
    if (existingIndex >= 0) {
      canvas.nodes[existingIndex] = newNode;
    } else {
      canvas.nodes.push(newNode);
      wasAdded = true;
    }

    saveCanvas(canvas, filePath);
    
    if (wasAdded) {
      wsBridge.broadcast({ type: 'NODE_ADDED', payload: { node: newNode } });
    } else {
      wsBridge.broadcast({ type: 'NODE_STATUS_CHANGED', payload: { node_id: newNode.id, new_status: newNode.status } });
    }

    const banner = buildStateBanner(canvas);
    const contentText = `IPO Node '${args.id}' successfully ${existingIndex >= 0 ? "updated" : "created"}.${discoveryWarning}\n\nNode Details:\n${JSON.stringify(newNode, null, 2)}\n${banner}`;

    return {
      content: [{ type: "text", text: contentText }]
    };
  }
);

// Tool 3: update_node_pseudocode
server.tool(
  "update_node_pseudocode",
  "Updates the pseudocode or process execution steps of a specific node.",
  {
    node_id: z.string().describe("Target node ID to update"),
    pseudocode: z.union([z.string(), z.array(z.string())]).describe("Pseudocode string or array of process execution steps"),
    process_steps: z.array(z.string()).optional().describe("Optional explicit process execution steps array"),
    agent_id: z.string().optional().describe("Agent ID for lock checking"),
    path: z.string().optional().describe("Optional custom path to .ipo/canvas.json")
  },
  async (args) => {
    const { canvas, filePath } = loadCanvas(args.path);

    const node = canvas.nodes.find((n) => n.id === args.node_id);
    if (!node) {
      const banner = buildStateBanner(canvas);
      return {
        content: [{ type: "text", text: `Error: Node with ID '${args.node_id}' not found in canvas.\n${banner}` }]
      };
    }

    const lockError = checkLock(node, args.agent_id);
    if (lockError) {
      return { content: [{ type: "text", text: `Error: ${lockError}` }] };
    }

    let steps: string[] = [];
    if (args.process_steps && args.process_steps.length > 0) {
      steps = args.process_steps;
    } else if (Array.isArray(args.pseudocode)) {
      steps = args.pseudocode;
    } else if (typeof args.pseudocode === "string") {
      steps = args.pseudocode
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }

    node.process_execution_plan = steps;
    node.lifecycle_phase = evaluateNodePhase(node);
    
    saveCanvas(canvas, filePath);
    wsBridge.broadcast({ type: 'NODE_UPDATED', payload: { node } });

    const banner = buildStateBanner(canvas);
    const contentText = `Pseudocode / Process Execution Plan for Node '${args.node_id}' updated successfully.\n\nNew Execution Plan:\n${JSON.stringify(steps, null, 2)}\n${banner}`;

    return {
      content: [{ type: "text", text: contentText }]
    };
  }
);

// Tool 4: set_node_status
server.tool(
  "set_node_status",
  "Sets the status of a specific node (DESIGN, READY_FOR_IMPLEMENTATION, IMPLEMENTED, NEEDS_REVISION, REWORK).",
  {
    node_id: z.string().describe("Target node ID"),
    status: z.enum(["DESIGN", "READY_FOR_IMPLEMENTATION", "IMPLEMENTED", "NEEDS_REVISION", "REWORK"]).describe("Target status for the node"),
    agent_id: z.string().optional().describe("Agent ID for lock checking"),
    path: z.string().optional().describe("Optional custom path to .ipo/canvas.json")
  },
  async (args) => {
    const { canvas, filePath } = loadCanvas(args.path);

    const node = canvas.nodes.find((n) => n.id === args.node_id);
    if (!node) {
      const banner = buildStateBanner(canvas);
      return {
        content: [{ type: "text", text: `Error: Node with ID '${args.node_id}' not found in canvas.\n${banner}` }]
      };
    }

    const lockError = checkLock(node, args.agent_id);
    if (lockError) {
      return { content: [{ type: "text", text: `Error: ${lockError}` }] };
    }

    const previousStatus = node.status;
    node.status = args.status as NodeStatusType;
    node.lifecycle_phase = evaluateNodePhase(node);

    saveCanvas(canvas, filePath);
    
    wsBridge.broadcast({ type: 'NODE_STATUS_CHANGED', payload: { node_id: node.id, new_status: node.status } });

    const banner = buildStateBanner(canvas);
    const contentText = `Node '${args.node_id}' status updated from '${previousStatus}' to '${node.status}'.\n${banner}`;

    return {
      content: [{ type: "text", text: contentText }]
    };
  }
);

// Tool 5: set_code_language
server.tool(
  "set_code_language",
  "Sets the target naming language for code, pseudocode, method names, and variables (EN for English, ES for Spanish, CUSTOM).",
  {
    language: z.enum(["EN", "ES", "CUSTOM"]).describe("Code and pseudocode symbol naming language"),
    path: z.string().optional().describe("Optional custom path to .ipo/canvas.json")
  },
  async (args) => {
    const { canvas, filePath } = loadCanvas(args.path);

    const previousLanguage = canvas.code_language || "EN";
    canvas.code_language = args.language as any;

    saveCanvas(canvas, filePath);
    wsBridge.broadcast({ type: 'STATE_CHANGED', payload: canvas });

    const banner = buildStateBanner(canvas, process.env.MCP_CLIENT_NAME || "antigravity");
    const contentText = `Code and pseudocode naming language updated from '${previousLanguage}' to '${canvas.code_language}'. All code symbols, method names, and pseudocode must now use ${canvas.code_language === 'EN' ? 'English' : canvas.code_language === 'ES' ? 'Spanish' : 'Custom'} naming conventions.\n${banner}`;

    return {
      content: [{ type: "text", text: contentText }]
    };
  }
);

server.tool(
  "validate_state",
  "Checks preconditions and state validation compliance against active canvas state.",
  {
    path: z.string().optional().describe("Optional custom path to .ipo/canvas.json")
  },
  async (args) => {
    const { canvas, filePath } = loadCanvas(args.path);
    const summary = validateCanvasState(canvas);
    saveCanvas(canvas, filePath);

    const banner = buildStateBanner(canvas);

    let statusSummary = summary.issues.length === 0
      ? "VALID: All state preconditions and node specifications satisfy harness rules."
      : `INVALID / INCOMPLETE: Found ${summary.issues.length} compliance issue(s).`;

    if (summary.issues.length > 0) {
      statusSummary += `\n\nIssues:\n` + summary.issues.map((iss, idx) => `  ${idx + 1}. ${iss}`).join("\n");
    }

    const contentText = `State Validation Results (${filePath}):\n\n${statusSummary}\n${banner}`;

    return {
      content: [{ type: "text", text: contentText }]
    };
  }
);

// Tool: remove_node
server.tool(
  "remove_node",
  "Removes a node from the canvas by ID.",
  {
    node_id: z.string().describe("Target node ID to remove"),
    path: z.string().optional().describe("Optional custom path to .ipo/canvas.json")
  },
  async (args) => {
    const { canvas, filePath } = loadCanvas(args.path);
    const existingIndex = canvas.nodes.findIndex((n) => n.id === args.node_id);

    if (existingIndex < 0) {
      const banner = buildStateBanner(canvas);
      return {
        content: [{ type: "text", text: `Error: Node '${args.node_id}' not found.\n${banner}` }]
      };
    }

    canvas.nodes.splice(existingIndex, 1);
    
    // Also remove any edges connected to this node
    if (canvas.edges) {
      canvas.edges = canvas.edges.filter(e => e.source !== args.node_id && e.target !== args.node_id);
    }

    saveCanvas(canvas, filePath);
    
    wsBridge.broadcast({ type: 'NODE_REMOVED', payload: { node_id: args.node_id } });

    const banner = buildStateBanner(canvas);
    return {
      content: [{ type: "text", text: `Node '${args.node_id}' successfully removed.\n${banner}` }]
    };
  }
);

// Tool: add_edge
server.tool(
  "add_edge",
  "Adds an edge between two nodes in the canvas.",
  {
    id: z.string().describe("Unique edge identifier"),
    source: z.string().describe("Source node ID"),
    target: z.string().describe("Target node ID"),
    label: z.string().optional().describe("Optional label for the edge"),
    type: z.enum(['DATA_FLOW', 'DEPENDENCY', 'SEQUENCE', 'EXCEPTION']).optional().describe("Optional type of edge"),
    path: z.string().optional().describe("Optional custom path to .ipo/canvas.json")
  },
  async (args) => {
    const { canvas, filePath } = loadCanvas(args.path);
    
    if (!canvas.edges) canvas.edges = [];
    
    const existingIndex = canvas.edges.findIndex((e) => e.id === args.id);
    const newEdge: IPOEdge = {
      id: args.id,
      source: args.source,
      target: args.target,
      label: args.label,
      type: args.type
    };

    if (existingIndex >= 0) {
      canvas.edges[existingIndex] = newEdge;
    } else {
      canvas.edges.push(newEdge);
    }

    saveCanvas(canvas, filePath);
    wsBridge.broadcast({ type: 'EDGE_ADDED', payload: { edge: newEdge } });
    const banner = buildStateBanner(canvas);
    
    return {
      content: [{ type: "text", text: `Edge '${args.id}' successfully ${existingIndex >= 0 ? 'updated' : 'added'}.\n${banner}` }]
    };
  }
);

// Tool: remove_edge
server.tool(
  "remove_edge",
  "Removes an edge from the canvas by ID.",
  {
    edge_id: z.string().describe("Target edge ID to remove"),
    path: z.string().optional().describe("Optional custom path to .ipo/canvas.json")
  },
  async (args) => {
    const { canvas, filePath } = loadCanvas(args.path);
    
    if (!canvas.edges) canvas.edges = [];
    
    const existingIndex = canvas.edges.findIndex((e) => e.id === args.edge_id);
    if (existingIndex < 0) {
      const banner = buildStateBanner(canvas);
      return {
        content: [{ type: "text", text: `Error: Edge '${args.edge_id}' not found.\n${banner}` }]
      };
    }

    canvas.edges.splice(existingIndex, 1);
    saveCanvas(canvas, filePath);
    wsBridge.broadcast({ type: 'EDGE_REMOVED', payload: { edge_id: args.edge_id } });
    const banner = buildStateBanner(canvas);
    
    return {
      content: [{ type: "text", text: `Edge '${args.edge_id}' successfully removed.\n${banner}` }]
    };
  }
);

// Tool: get_context_injection
server.tool(
  "get_context_injection",
  "Enhanced context injection for Layer 3, retrieving node context with connected edges and sibling summaries.",
  {
    node_id: z.string().describe("Target node ID"),
    path: z.string().optional().describe("Optional custom path to .ipo/canvas.json")
  },
  async (args) => {
    const { canvas } = loadCanvas(args.path);
    const node = canvas.nodes.find((n) => n.id === args.node_id);
    
    if (!node) {
      const banner = buildStateBanner(canvas);
      return {
        content: [{ type: "text", text: `Error: Node '${args.node_id}' not found.\n${banner}` }]
      };
    }

    const connectedEdges = (canvas.edges || []).filter(e => e.source === args.node_id || e.target === args.node_id);
    const connectedNodeIds = new Set(connectedEdges.flatMap(e => [e.source, e.target]));
    connectedNodeIds.delete(args.node_id);
    
    const connectedNodes = Array.from(connectedNodeIds).map(id => {
      const n = canvas.nodes.find(node => node.id === id);
      return n ? { id: n.id, title: n.title, status: n.status } : null;
    }).filter(n => n !== null);

    const siblings = canvas.nodes
      .filter(n => n.id !== args.node_id)
      .map(n => ({ id: n.id, title: n.title, status: n.status }));

    const levelGuide = canvas.user_experience_level === 'beginner' 
      ? 'Use simple language. Explain every decision. No jargon.'
      : canvas.user_experience_level === 'advanced'
      ? 'Use precise technical language. Focus on trade-offs.'
      : 'Use clear language with explained technical terms.';

    const contextPayload = {
      active_node: node,
      node_description: node.description || '',
      connected_nodes: connectedNodes,
      connected_edges: connectedEdges,
      sibling_nodes_summary: siblings,
      project_type: canvas.project_type,
      project_description: canvas.project_description,
      user_experience_level: canvas.user_experience_level || 'intermediate',
      instruction: `Implementation Instruction: Ensure alignment with the node's description, target_symbols, inputs, process_execution_plan, and outputs. ${levelGuide}`
    };

    const banner = buildStateBanner(canvas);
    return {
      content: [{ type: "text", text: `Context Injection for '${args.node_id}':\n\n${JSON.stringify(contextPayload, null, 2)}\n${banner}` }]
    };
  }
);

// Tool: search_nodes
server.tool(
  "search_nodes",
  "Search nodes by text query across titles, categories, target_symbols, inputs, and outputs.",
  {
    query: z.string().describe("Search query string"),
    path: z.string().optional().describe("Optional custom path to .ipo/canvas.json")
  },
  async (args) => {
    const { canvas } = loadCanvas(args.path);
    const q = args.query.toLowerCase();
    
    const matches = canvas.nodes.filter(n => {
      return (
        n.title.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q) ||
        n.id.toLowerCase().includes(q) ||
        (n.target_symbols && n.target_symbols.some(ts => ts.toLowerCase().includes(q))) ||
        (n.inputs && n.inputs.some(inp => inp.toLowerCase().includes(q))) ||
        (n.outputs && n.outputs.some(out => out.toLowerCase().includes(q)))
      );
    });

    const banner = buildStateBanner(canvas);
    return {
      content: [{ type: "text", text: `Search Results for '${args.query}':\n\n${JSON.stringify(matches, null, 2)}\n${banner}` }]
    };
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
    wsBridge.broadcast({ type: 'NODE_UPDATED', payload: { node } });
    const banner = buildStateBanner(canvas);
    return { content: [{ type: "text", text: `Node ${args.node_id} locked by ${args.agent_id}\n${banner}` }] };
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
    wsBridge.broadcast({ type: 'NODE_UPDATED', payload: { node } });
    const banner = buildStateBanner(canvas);
    return { content: [{ type: "text", text: `Node ${args.node_id} unlocked\n${banner}` }] };
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
      execFileSync('python', [scriptPath, '--code-dir', args.code_dir, '--canvas-json', filePath, '--output-json', outPath], { encoding: 'utf-8' });
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

// Tool: assign_node
server.tool(
  "assign_node",
  "Assigns a node to a specific agent for implementation.",
  {
    node_id: z.string().describe("Node ID to assign"),
    agent_id: z.string().describe("Agent identifier to assign this node to"),
    path: z.string().optional()
  },
  async (args) => {
    const { canvas, filePath } = loadCanvas(args.path);
    const node = canvas.nodes.find(n => n.id === args.node_id);
    if (!node) {
      return { content: [{ type: "text", text: `Error: Node not found` }] };
    }
    node.assigned_to = args.agent_id;
    saveCanvas(canvas, filePath);
    wsBridge.broadcast({ type: 'NODE_UPDATED', payload: { node } });
    const banner = buildStateBanner(canvas);
    return { content: [{ type: "text", text: `Node '${args.node_id}' assigned to agent '${args.agent_id}'.\n${banner}` }] };
  }
);

// Tool: get_my_assignments
server.tool(
  "get_my_assignments",
  "Returns all nodes assigned to the specified agent.",
  {
    agent_id: z.string().describe("Agent identifier"),
    path: z.string().optional()
  },
  async (args) => {
    const { canvas } = loadCanvas(args.path);
    const myNodes = canvas.nodes.filter(n => n.assigned_to === args.agent_id);
    const banner = buildStateBanner(canvas);
    return { content: [{ type: "text", text: `Assignments for '${args.agent_id}' (${myNodes.length} nodes):\n\n${JSON.stringify(myNodes, null, 2)}\n${banner}` }] };
  }
);

// Tool: detect_stack
server.tool(
  "detect_stack",
  "Auto-detects the project technology stack from the filesystem and updates canvas.project_type.",
  {
    project_dir: z.string().describe("Root directory of the project to analyze"),
    path: z.string().optional()
  },
  async (args) => {
    const { canvas, filePath } = loadCanvas(args.path);
    // Check for common files
    const indicators: string[] = [];
    const checkFile = (file: string, label: string) => {
      if (fs.existsSync(path.join(args.project_dir, file))) indicators.push(label);
    };
    checkFile('package.json', 'node');
    checkFile('tsconfig.json', 'typescript');
    checkFile('Assets/Scenes', 'unity');
    checkFile('ProjectSettings/ProjectSettings.asset', 'unity');
    checkFile('requirements.txt', 'python');
    checkFile('Pipfile', 'python');
    checkFile('pyproject.toml', 'python');
    checkFile('Cargo.toml', 'rust');
    checkFile('go.mod', 'go');
    checkFile('pom.xml', 'java');
    checkFile('.csproj', 'dotnet');
    checkFile('next.config.js', 'nextjs');
    checkFile('next.config.ts', 'nextjs');
    checkFile('vite.config.ts', 'vite');
    checkFile('angular.json', 'angular');
    // Also check for .sln files
    try {
      const files = fs.readdirSync(args.project_dir);
      if (files.some(f => f.endsWith('.sln'))) indicators.push('dotnet');
      if (files.some(f => f.endsWith('.csproj'))) indicators.push('dotnet');
    } catch {}
    
    canvas.project_type = indicators.join('+') || 'unknown';
    saveCanvas(canvas, filePath);
    const banner = buildStateBanner(canvas);
    return { content: [{ type: "text", text: `Detected stack: ${canvas.project_type}\n${banner}` }] };
  }
);

// Tool: onboard_existing_project
server.tool(
  "onboard_existing_project",
  "Scans an existing codebase using the tree-sitter AST analyzer, generates a draft IPO graph from what already exists, and returns instructions for the agent to reconcile the existing implementation with the user's desired design. Use this when applying GraphIPO to a project that already has code.",
  {
    project_dir: z.string().describe("Root directory of the existing project to scan"),
    project_description: z.string().optional().describe("User's description of what the project is or should become"),
    experience_level: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('intermediate'),
    path: z.string().optional()
  },
  async (args) => {
    const { canvas, filePath } = loadCanvas(args.path);

    // 1. Auto-detect stack
    const indicators: string[] = [];
    const checkFile = (file: string, label: string) => {
      if (fs.existsSync(path.join(args.project_dir, file))) indicators.push(label);
    };
    checkFile('package.json', 'node');
    checkFile('tsconfig.json', 'typescript');
    checkFile('Assets/Scenes', 'unity');
    checkFile('ProjectSettings/ProjectSettings.asset', 'unity');
    checkFile('requirements.txt', 'python');
    checkFile('pyproject.toml', 'python');
    checkFile('Cargo.toml', 'rust');
    checkFile('go.mod', 'go');
    checkFile('pom.xml', 'java');
    checkFile('next.config.js', 'nextjs');
    checkFile('next.config.ts', 'nextjs');
    checkFile('vite.config.ts', 'vite');
    checkFile('angular.json', 'angular');
    try {
      const files = fs.readdirSync(args.project_dir);
      if (files.some(f => f.endsWith('.sln'))) indicators.push('dotnet');
      if (files.some(f => f.endsWith('.csproj'))) indicators.push('dotnet');
    } catch {}
    canvas.project_type = indicators.join('+') || 'unknown';

    // 2. Scan source files to build a file manifest
    const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.cs', '.go', '.rs', '.java'];
    const scannedFiles: { file: string; classes: string[]; functions: string[]; lineCount: number }[] = [];

    function scanDir(dir: string, depth: number = 0) {
      if (depth > 5) return; // Limit recursion
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            // Skip common non-source directories
            if (['node_modules', '.git', 'dist', 'build', '__pycache__', '.next', 'vendor', 'Packages', 'Library'].includes(entry.name)) continue;
            scanDir(fullPath, depth + 1);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (sourceExtensions.includes(ext)) {
              try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                const lines = content.split('\n');
                const classes: string[] = [];
                const functions: string[] = [];
                
                // Simple extraction for manifest (tree-sitter does the deep analysis)
                for (const line of lines) {
                  const classMatch = line.match(/(?:class|interface|struct|enum)\s+(\w+)/);
                  if (classMatch) classes.push(classMatch[1]);
                  const funcMatch = line.match(/(?:function|def|func|fn|public|private|protected|static|async)\s+(\w+)\s*[\(<]/);
                  if (funcMatch && !['if', 'for', 'while', 'switch', 'catch'].includes(funcMatch[1])) {
                    functions.push(funcMatch[1]);
                  }
                }
                
                scannedFiles.push({
                  file: path.relative(args.project_dir, fullPath).replace(/\\/g, '/'),
                  classes,
                  functions,
                  lineCount: lines.length
                });
              } catch {}
            }
          }
        }
      } catch {}
    }

    scanDir(args.project_dir);

    // 3. Group files by directory/module to suggest node boundaries
    const moduleGroups: Record<string, typeof scannedFiles> = {};
    for (const file of scannedFiles) {
      const dir = path.dirname(file.file) || 'root';
      if (!moduleGroups[dir]) moduleGroups[dir] = [];
      moduleGroups[dir].push(file);
    }

    // 4. Generate draft nodes from modules
    let nodeIndex = 0;
    for (const [modulePath, files] of Object.entries(moduleGroups)) {
      const allClasses = files.flatMap(f => f.classes);
      const allFunctions = files.flatMap(f => f.functions);
      const allFiles = files.map(f => f.file);
      const totalLines = files.reduce((sum, f) => sum + f.lineCount, 0);
      
      const nodeId = `existing_${modulePath.replace(/[\/\\\.]/g, '_').toLowerCase()}_${nodeIndex++}`;
      const title = modulePath === 'root' ? 'Root Module' : modulePath.split('/').pop() || modulePath;
      
      const newNode: IPONode = {
        id: nodeId,
        title: title.charAt(0).toUpperCase() + title.slice(1),
        description: `Existing module at '${modulePath}/' with ${files.length} file(s) and ${totalLines} lines of code. Contains: ${allClasses.length > 0 ? allClasses.slice(0, 5).join(', ') : 'no classes'}.`,
        category: modulePath.split('/')[0] || 'General',
        lifecycle_phase: 'IMPLEMENTATION' as PhaseType,
        target_symbols: allFiles.slice(0, 10),
        inputs: [],
        process_execution_plan: allFunctions.slice(0, 15).map(f => `Existing function: ${f}()`),
        outputs: [],
        status: 'IMPLEMENTED' as NodeStatusType,
      };
      
      canvas.nodes.push(newNode);
    }

    // 5. Set canvas metadata
    if (args.project_description) {
      canvas.project_description = args.project_description;
    }
    canvas.user_experience_level = args.experience_level as any;
    saveCanvas(canvas, filePath);

    wsBridge.broadcast({ type: 'FULL_STATE', payload: canvas });

    // 6. Generate onboarding instructions for the agent
    const onboardInstructions = `
═══════════════════════════════════════════════════════════════
📂 EXISTING PROJECT ONBOARDED
═══════════════════════════════════════════════════════════════

Stack Detected: ${canvas.project_type}
Files Scanned: ${scannedFiles.length}
Modules Found: ${Object.keys(moduleGroups).length}
Draft Nodes Created: ${canvas.nodes.length}
${args.project_description ? `User Description: "${args.project_description}"` : ''}

═══ WHAT WAS DONE ═══

The codebase at '${args.project_dir}' was scanned and ${canvas.nodes.length} draft IPO nodes 
were created, one per module/directory. Each node contains:
- The existing files as target_symbols
- The existing functions as process_execution_plan entries
- Status set to IMPLEMENTED (since the code already exists)

═══ WHAT YOU MUST DO NOW ═══

1. PRESENT THE GRAPH to the user. Show them what was found and ask:
   "This is what I found in your existing code. Does this match how you think about your project?"

2. COMPARE with the user's vision. Ask:
   "What would you like to change or improve about this structure?"
   "Are there any features you want to add?"
   "Is there anything that should work differently?"

3. For each discrepancy between EXISTING code and DESIRED design, you have 3 options:
   a) ADAPT THE DESIGN to match the existing code (if the code is good)
   b) MARK THE NODE as NEEDS_REVISION (if the code should change)
   c) CREATE NEW NODES for features that don't exist yet

4. REFINE THE NODES:
   - Add proper descriptions in the user's language
   - Fill in inputs and outputs to show data flow
   - Add edges to connect the nodes
   - Rename nodes to be clearer if needed

5. Use 'run_audit' later to verify that the design and implementation stay in sync.

Remember: The user may not understand all the technical details of their own codebase.
Explain what you found in terms they can understand.
═══════════════════════════════════════════════════════════════

SCANNED FILE MANIFEST:
${scannedFiles.slice(0, 30).map(f => `  ${f.file} (${f.lineCount} lines, ${f.classes.length} classes, ${f.functions.length} functions)`).join('\n')}
${scannedFiles.length > 30 ? `  ... and ${scannedFiles.length - 30} more files` : ''}
`;

    return {
      content: [{ type: "text", text: onboardInstructions }]
    };
  }
);

async function main() {


  const args = process.argv.slice(2);

  wsBridge.setGetState(() => {
    const { canvas } = loadCanvas();
    return canvas;
  });

  wsBridge.setOnMutation((msg) => {
    const { canvas, filePath } = loadCanvas();
    
    switch (msg.type) {
      case 'UPDATE_NODE': {
        const { node_id, updates } = msg.payload;
        const node = canvas.nodes.find(n => n.id === node_id);
        if (node) {
          Object.assign(node, updates);
          node.lifecycle_phase = evaluateNodePhase(node);
          saveCanvas(canvas, filePath);
        }
        break;
      }
      case 'ASSIGN_NODE': {
        const { node_id, agent_id } = msg.payload;
        const node = canvas.nodes.find(n => n.id === node_id);
        if (node) {
          node.assigned_to = agent_id;
          saveCanvas(canvas, filePath);
        }
        break;
      }
      case 'ADD_NOTE': {
        const { node_id, note } = msg.payload;
        const node = canvas.nodes.find(n => n.id === node_id);
        if (node) {
          node.notes = note;
          saveCanvas(canvas, filePath);
        }
        break;
      }
    }
  });

  wsBridge.initialize(9120);

  // Always start REST API server for Canvas UI communication
  const apiApp = express();
  apiApp.use(express.json());

  // CORS: Allow Canvas UI from any localhost port
  apiApp.use((req: Request, res: Response, next: any) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.sendStatus(200); return; }
    next();
  });
  // Active project path — the CLI sets this so the server knows which project to serve
  let activeProjectPath: string | null = null;

  // REST: Set the active project path (called by CLI on init/canvas/discover)
  apiApp.post('/api/set-project', (req: Request, res: Response) => {
    const projectDir = req.body.path;
    if (projectDir && typeof projectDir === 'string') {
      activeProjectPath = path.join(projectDir, '.ipo', 'canvas.json');
      console.error(`[GraphIPO] Active project set to: ${projectDir}`);
      // Broadcast full state to connected Canvas UIs
      try {
        const { canvas } = loadCanvas(activeProjectPath);
        wsBridge.broadcast({ type: 'FULL_STATE', payload: canvas });
      } catch {}
      res.json({ success: true, path: activeProjectPath });
    } else {
      res.status(400).json({ error: 'Missing path in request body' });
    }
  });

  // REST: Get active project path
  apiApp.get('/api/project', (req: Request, res: Response) => {
    res.json({ path: activeProjectPath });
  });

  // REST: Get full canvas state
  apiApp.get('/api/canvas', (req: Request, res: Response) => {
    const overridePath = (req.query.path as string | undefined) || activeProjectPath;
    const { canvas } = loadCanvas(overridePath || undefined);
    res.json(canvas);
  });

  // REST: Update a node from UI
  apiApp.post('/api/update-node', (req: Request, res: Response) => {
    const { canvas, filePath } = loadCanvas(req.body.path);
    const { node_id, updates } = req.body;
    const node = canvas.nodes.find(n => n.id === node_id);
    if (node) {
      Object.assign(node, updates);
      node.lifecycle_phase = evaluateNodePhase(node);
      saveCanvas(canvas, filePath);
      wsBridge.broadcast({ type: 'NODE_UPDATED', payload: { node } });
      res.json({ success: true, node });
    } else {
      res.status(404).json({ error: 'Node not found' });
    }
  });

  // REST: Assign node to agent
  apiApp.post('/api/assign-node', (req: Request, res: Response) => {
    const { canvas, filePath } = loadCanvas(req.body.path);
    const { node_id, agent_id } = req.body;
    const node = canvas.nodes.find(n => n.id === node_id);
    if (node) {
      node.assigned_to = agent_id;
      saveCanvas(canvas, filePath);
      wsBridge.broadcast({ type: 'NODE_UPDATED', payload: { node } });
      res.json({ success: true, node });
    } else {
      res.status(404).json({ error: 'Node not found' });
    }
  });

  // Serve embedded Canvas UI (built from canvas-ui/)
  const serverFilePath = fileURLToPath(import.meta.url);
  const serverDir = path.dirname(serverFilePath);
  const canvasDistPath = path.join(serverDir, '..', 'canvas-dist');
  if (fs.existsSync(canvasDistPath)) {
    apiApp.use(express.static(canvasDistPath));
    // SPA fallback: serve index.html for non-API routes
    apiApp.get('*', (req: Request, res: Response) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(canvasDistPath, 'index.html'));
      }
    });
  }

  const apiPort = parseInt(process.env.GRAPHIPO_API_PORT || '3001', 10);
  const apiServer = apiApp.listen(apiPort, () => {
    const uiAvailable = fs.existsSync(canvasDistPath);
    console.error(`[GraphIPO] Canvas UI: http://localhost:${apiPort}${uiAvailable ? '' : ' (UI not bundled)'}`);
    console.error(`[GraphIPO] REST API:  http://localhost:${apiPort}/api/canvas`);
  });
  apiServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[GraphIPO] REST API port ${apiPort} in use, trying ${apiPort + 1}...`);
      apiApp.listen(apiPort + 1, () => {
        console.error(`[GraphIPO] REST API available at http://localhost:${apiPort + 1}/api/canvas`);
      });
    }
  });

  // Connect MCP transport (SSE or stdio)
  const isSSE = args.includes("--sse") || args.includes("--http") || Boolean(process.env.PORT);

  if (isSSE) {
    const sseApp = express();
    sseApp.use(express.json());
    const ssePort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    const sseTransports = new Map<string, SSEServerTransport>();

    sseApp.get("/sse", async (req: Request, res: Response) => {
      const transport = new SSEServerTransport("/messages", res);
      await server.connect(transport);
      sseTransports.set(transport.sessionId, transport);
    });

    sseApp.post("/messages", async (req: Request, res: Response) => {
      const sessionId = req.query.sessionId as string;
      const transport = sseTransports.get(sessionId);
      if (transport) {
        try {
          await transport.handlePostMessage(req, res);
        } catch (err) {
          console.error("Error handling SSE post message:", err);
          if (!res.headersSent) {
            res.status(500).send("Internal Server Error handling SSE message.");
          }
        }
      } else {
        res.status(400).send("SSE transport connection not initialized or invalid session.");
      }
    });

    sseApp.listen(ssePort, () => {
      console.error(`[GraphIPO] SSE transport listening on port ${ssePort}`);
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[GraphIPO] MCP Server running on stdio");
  }
}

main().catch((err) => {
  console.error("Fatal error running GraphIPO Harness Server:", err);
  process.exit(1);
});
