#!/usr/bin/env node

/**
 * GraphIPO CLI — Standard command-line interface
 * 
 * Commands:
 *   graph-ipo init        Initialize GraphIPO in the current project
 *   graph-ipo status      Show current project progress
 *   graph-ipo discover    Start/resume the discovery process  
 *   graph-ipo version     Show installed version
 *   graph-ipo help        Show help
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version from package.json
const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const VERSION = pkg.version;

// Colors for terminal output
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  white: '\x1b[37m',
};

const CANVAS_DIR = '.ipo';
const CANVAS_FILE = 'canvas.json';

function getCanvasPath(): string {
  return path.join(process.cwd(), CANVAS_DIR, CANVAS_FILE);
}

function canvasExists(): boolean {
  return fs.existsSync(getCanvasPath());
}

function loadCanvas(): any {
  const canvasPath = getCanvasPath();
  if (!fs.existsSync(canvasPath)) return null;
  return JSON.parse(fs.readFileSync(canvasPath, 'utf-8'));
}

// ============================================
// HELPERS
// ============================================

function openBrowser(url: string) {
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      execSync(`start "" "${url}"`, { stdio: 'ignore' });
    } else if (platform === 'darwin') {
      execSync(`open "${url}"`, { stdio: 'ignore' });
    } else {
      execSync(`xdg-open "${url}"`, { stdio: 'ignore' });
    }
  } catch {
    console.log(`  ${c.dim}Open in browser: ${c.cyan}${url}${c.reset}`);
  }
}

async function isServerRunning(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}/api/canvas`);
    return response.ok;
  } catch {
    return false;
  }
}

async function setActiveProject(port: number) {
  const projectDir = process.cwd();
  try {
    await fetch(`http://localhost:${port}/api/set-project`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: projectDir })
    });
    console.log(`  ${c.green}✓${c.reset} Active project: ${c.dim}${projectDir}${c.reset}`);
  } catch {
    // Server may not support this endpoint yet (old version)
  }
}

function startServerAndOpenBrowser() {
  const port = parseInt(process.env.GRAPHIPO_API_PORT || '3001', 10);
  const url = `http://localhost:${port}`;
  const serverScript = path.join(__dirname, 'server.js');

  // Check if server is already running
  isServerRunning(port).then(async (running) => {
    if (running) {
      console.log(`  ${c.green}✓${c.reset} Canvas UI already running at ${c.cyan}${url}${c.reset}`);
      await setActiveProject(port);
      openBrowser(url);
      return;
    }

    // Start server in background
    if (fs.existsSync(serverScript)) {
      console.log(`  ${c.dim}Starting GraphIPO server...${c.reset}`);
      const child = spawn('node', [serverScript], {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, GRAPHIPO_API_PORT: String(port) }
      });
      child.unref();

      // Wait for server to start, then set project and open browser
      setTimeout(async () => {
        console.log(`  ${c.green}✓${c.reset} Canvas UI available at ${c.cyan}${url}${c.reset}`);
        await setActiveProject(port);
        openBrowser(url);
      }, 1500);
    } else {
      console.log(`  ${c.yellow}⚠${c.reset} Server not found. The MCP server will start when your IDE connects.`);
      console.log(`  ${c.dim}Canvas will be available at ${c.cyan}${url}${c.reset}${c.dim} once the MCP is running.${c.reset}`);
    }
  });
}

function generateCanvasHtml(dir: string) {
  const htmlPath = path.join(dir, 'canvas.html');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GraphIPO Canvas</title>
<style>
  :root { --bg: #0f1117; --surface: #1a1d27; --border: #2a2d3a; --text: #e4e4e7; --dim: #71717a; --accent: #6366f1; --green: #22c55e; --yellow: #eab308; --blue: #3b82f6; --red: #ef4444; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
  .header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 16px 24px; display: flex; align-items: center; gap: 16px; }
  .header h1 { font-size: 18px; font-weight: 600; }
  .header .badge { background: var(--accent); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .header .stats { margin-left: auto; font-size: 13px; color: var(--dim); }
  .container { display: flex; height: calc(100vh - 57px); }
  .sidebar { width: 280px; background: var(--surface); border-right: 1px solid var(--border); overflow-y: auto; padding: 16px; flex-shrink: 0; }
  .sidebar h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--dim); margin-bottom: 12px; }
  .node-card { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 8px; cursor: pointer; transition: border-color 0.2s; }
  .node-card:hover { border-color: var(--accent); }
  .node-card.selected { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
  .node-title { font-size: 14px; font-weight: 500; margin-bottom: 4px; }
  .node-type { font-size: 11px; color: var(--dim); background: var(--surface); padding: 2px 6px; border-radius: 3px; display: inline-block; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }
  .status-IMPLEMENTED { background: var(--green); }
  .status-READY_FOR_IMPLEMENTATION { background: var(--blue); }
  .status-DESIGN { background: var(--yellow); }
  .status-NEEDS_REVISION { background: var(--red); }
  .canvas-area { flex: 1; position: relative; overflow: hidden; }
  svg { width: 100%; height: 100%; }
  .node-rect { fill: var(--surface); stroke: var(--border); stroke-width: 1.5; rx: 8; cursor: grab; transition: stroke 0.2s; }
  .node-rect:hover { stroke: var(--accent); }
  .node-label { fill: var(--text); font-size: 12px; font-weight: 500; pointer-events: none; }
  .node-sublabel { fill: var(--dim); font-size: 10px; pointer-events: none; }
  .edge-line { stroke: var(--border); stroke-width: 1.5; fill: none; marker-end: url(#arrow); }
  .edge-label { fill: var(--dim); font-size: 10px; }
  .detail-panel { width: 320px; background: var(--surface); border-left: 1px solid var(--border); padding: 20px; overflow-y: auto; display: none; }
  .detail-panel.open { display: block; }
  .detail-panel h2 { font-size: 16px; margin-bottom: 16px; }
  .detail-section { margin-bottom: 16px; }
  .detail-section h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--dim); margin-bottom: 8px; }
  .detail-section ul { list-style: none; }
  .detail-section li { font-size: 13px; padding: 4px 0; color: var(--text); border-bottom: 1px solid var(--border); }
  .detail-section li:last-child { border: none; }
  .welcome { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; padding: 40px; }
  .welcome h2 { font-size: 24px; margin-bottom: 12px; }
  .welcome p { color: var(--dim); max-width: 500px; line-height: 1.6; }
  .welcome code { background: var(--surface); padding: 2px 8px; border-radius: 4px; font-size: 13px; }
  .refresh-btn { position: fixed; bottom: 20px; right: 20px; background: var(--accent); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; z-index: 100; }
  .refresh-btn:hover { opacity: 0.9; }
  .empty-msg { color: var(--dim); font-size: 13px; text-align: center; padding: 20px; }
</style>
</head>
<body>
<div class="header">
  <h1>🚀 GraphIPO</h1>
  <span class="badge" id="projectType">Unknown Project</span>
  <span class="stats" id="stats">Loading...</span>
</div>
<div class="container">
  <div class="sidebar">
    <h3>Nodes in Canvas (<span id="nodeCount">0</span>)</h3>
    <div id="nodeList"></div>
  </div>
  <div class="canvas-area" id="canvasArea">
    <svg id="graphSvg">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#71717a"/>
        </marker>
      </defs>
    </svg>
  </div>
  <div class="detail-panel" id="detailPanel">
    <h2 id="detailTitle"></h2>
    <div id="detailContent"></div>
  </div>
</div>
<button class="refresh-btn" onclick="loadCanvas()">↻ Refresh</button>

<script>
let canvasData = null;
let selectedNode = null;

async function loadCanvas() {
  try {
    const res = await fetch('./canvas.json?t=' + Date.now());
    canvasData = await res.json();
    render();
  } catch (e) {
    document.getElementById('canvasArea').innerHTML = '<div class="welcome"><h2>⚠️ Could not load canvas.json</h2><p>Make sure this file is served via HTTP, not opened directly.<br>Run: <code>graph-ipo canvas</code></p></div>';
  }
}

function render() {
  const nodes = canvasData.nodes || [];
  const edges = canvasData.edges || [];
  
  // Header
  document.getElementById('projectType').textContent = canvasData.project_type || 'Unknown Project';
  const impl = nodes.filter(n => n.status === 'IMPLEMENTED').length;
  const design = nodes.filter(n => n.status === 'DESIGN').length;
  document.getElementById('stats').textContent = impl + '/' + nodes.length + ' Implemented · ' + design + ' In Design';
  document.getElementById('nodeCount').textContent = nodes.length;
  
  // Sidebar
  const list = document.getElementById('nodeList');
  if (nodes.length === 0) {
    list.innerHTML = '<div class="empty-msg">No nodes yet.<br>Tell your AI agent:<br><code>"Use start_discovery to begin."</code></div>';
  } else {
    list.innerHTML = nodes.map(n => '<div class="node-card" data-id="' + n.id + '" onclick="selectNode(\\'' + n.id + '\\')">' +
      '<div class="node-title"><span class="status-dot status-' + (n.status||'DESIGN') + '"></span>' + (n.title||n.id) + '</div>' +
      '<span class="node-type">' + (n.type||'Component') + '</span></div>').join('');
  }
  
  // SVG Canvas
  renderGraph(nodes, edges);
}

function renderGraph(nodes, edges) {
  const svg = document.getElementById('graphSvg');
  const area = document.getElementById('canvasArea');
  const W = area.clientWidth, H = area.clientHeight;
  
  if (nodes.length === 0) {
    svg.innerHTML = '<defs><marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#71717a"/></marker></defs>';
    document.getElementById('canvasArea').innerHTML += '<div class="welcome" id="welcomeMsg"><h2>🚀 Welcome to GraphIPO</h2><p>Design your software visually before writing any code.<br><br>Tell your AI agent what you want to build, and it will guide you through the design process.</p></div>';
    return;
  }
  
  const wel = document.getElementById('welcomeMsg');
  if (wel) wel.remove();
  
  // Simple force-directed layout
  const positions = {};
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const spacing = Math.min(W / (cols + 1), 220);
  nodes.forEach((n, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions[n.id] = { x: 80 + col * spacing, y: 80 + row * 140 };
  });
  
  let svgContent = '<defs><marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#71717a"/></marker></defs>';
  
  // Edges
  edges.forEach(e => {
    const s = positions[e.source], t = positions[e.target];
    if (s && t) {
      const mx = (s.x + t.x) / 2 + 75, my = (s.y + t.y) / 2;
      svgContent += '<line class="edge-line" x1="' + (s.x+75) + '" y1="' + (s.y+25) + '" x2="' + (t.x+75) + '" y2="' + (t.y+25) + '"/>';
      if (e.label) svgContent += '<text class="edge-label" x="' + mx + '" y="' + (my-5) + '" text-anchor="middle">' + e.label + '</text>';
    }
  });
  
  // Nodes
  const statusColors = { IMPLEMENTED: '#22c55e', READY_FOR_IMPLEMENTATION: '#3b82f6', DESIGN: '#eab308', NEEDS_REVISION: '#ef4444' };
  nodes.forEach(n => {
    const p = positions[n.id];
    const color = statusColors[n.status] || '#71717a';
    svgContent += '<g onclick="selectNode(\\'' + n.id + '\\')" style="cursor:pointer">';
    svgContent += '<rect class="node-rect" x="' + p.x + '" y="' + p.y + '" width="150" height="50" style="stroke:' + color + '"/>';
    svgContent += '<text class="node-label" x="' + (p.x+75) + '" y="' + (p.y+22) + '" text-anchor="middle">' + (n.title||n.id).substring(0,20) + '</text>';
    svgContent += '<text class="node-sublabel" x="' + (p.x+75) + '" y="' + (p.y+38) + '" text-anchor="middle">' + (n.status||'DESIGN') + '</text>';
    svgContent += '</g>';
  });
  
  svg.innerHTML = svgContent;
}

function selectNode(id) {
  selectedNode = canvasData.nodes.find(n => n.id === id);
  if (!selectedNode) return;
  
  document.querySelectorAll('.node-card').forEach(c => c.classList.toggle('selected', c.dataset.id === id));
  
  const panel = document.getElementById('detailPanel');
  panel.classList.add('open');
  document.getElementById('detailTitle').textContent = selectedNode.title || selectedNode.id;
  
  let html = '<div class="detail-section"><h4>Status</h4><p><span class="status-dot status-' + (selectedNode.status||'DESIGN') + '"></span>' + (selectedNode.status||'DESIGN') + '</p></div>';
  if (selectedNode.type) html += '<div class="detail-section"><h4>Type</h4><p>' + selectedNode.type + '</p></div>';
  if (selectedNode.inputs?.length) html += '<div class="detail-section"><h4>Inputs</h4><ul>' + selectedNode.inputs.map(i => '<li>→ ' + i + '</li>').join('') + '</ul></div>';
  if (selectedNode.process?.length) html += '<div class="detail-section"><h4>Process</h4><ul>' + selectedNode.process.map(p => '<li>⚙ ' + p + '</li>').join('') + '</ul></div>';
  if (selectedNode.outputs?.length) html += '<div class="detail-section"><h4>Outputs</h4><ul>' + selectedNode.outputs.map(o => '<li>← ' + o + '</li>').join('') + '</ul></div>';
  if (selectedNode.pseudocode) html += '<div class="detail-section"><h4>Pseudocode</h4><pre style="background:var(--bg);padding:12px;border-radius:6px;font-size:12px;overflow-x:auto;white-space:pre-wrap">' + selectedNode.pseudocode + '</pre></div>';
  
  document.getElementById('detailContent').innerHTML = html;
}

// Auto-refresh every 3 seconds
loadCanvas();
setInterval(loadCanvas, 3000);
</script>
</body>
</html>`;

  fs.writeFileSync(htmlPath, html, 'utf-8');
}

// ============================================
// COMMANDS
// ============================================

function cmdInit() {
  const canvasPath = getCanvasPath();
  
  if (canvasExists()) {
    console.log(`${c.yellow}⚠ GraphIPO is already initialized in this directory.${c.reset}`);
    console.log(`  Canvas: ${c.dim}${canvasPath}${c.reset}`);
    // Regenerate HTML in case it's missing or outdated
    const dir = path.join(process.cwd(), CANVAS_DIR);
    generateCanvasHtml(dir);
    console.log(`\n  Starting Canvas UI...`);
    cmdCanvas();
    return;
  }

  const canvas = {
    version: VERSION,
    project_type: "",
    project_description: "",
    user_experience_level: "intermediate",
    discovery_completed: false,
    code_language: "EN",
    edges: [],
    nodes: []
  };

  const dir = path.join(process.cwd(), CANVAS_DIR);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(canvasPath, JSON.stringify(canvas, null, 2), 'utf-8');
  generateCanvasHtml(dir);

  console.log(`
${c.green}${c.bold}✅ GraphIPO initialized!${c.reset}

  ${c.dim}Created:${c.reset} ${CANVAS_DIR}/${CANVAS_FILE}
  ${c.dim}Created:${c.reset} ${CANVAS_DIR}/canvas.html
`);

  cmdCanvas();

  console.log(`
${c.bold}Next steps:${c.reset}

  ${c.cyan}1.${c.reset} Open this folder in your IDE (with GraphIPO MCP configured)
  ${c.cyan}2.${c.reset} Tell your AI agent:

     ${c.magenta}"I want to build [your project]. Use start_discovery to begin."${c.reset}

  ${c.cyan}3.${c.reset} The agent will interview you about your project,
     and you'll see the architecture appear in real-time in the Canvas.

  ${c.dim}Tip: Run ${c.cyan}graph-ipo status${c.dim} anytime to check progress.${c.reset}
`);
}

function cmdStatus() {
  const canvas = loadCanvas();
  
  if (!canvas) {
    console.log(`${c.yellow}⚠ GraphIPO is not initialized in this directory.${c.reset}`);
    console.log(`\n  Run ${c.cyan}graph-ipo init${c.reset} to get started.`);
    return;
  }

  const nodes = canvas.nodes || [];
  const edges = canvas.edges || [];
  const total = nodes.length;
  
  const byStatus: Record<string, number> = {};
  for (const n of nodes) {
    byStatus[n.status] = (byStatus[n.status] || 0) + 1;
  }

  const implemented = byStatus['IMPLEMENTED'] || 0;
  const ready = byStatus['READY_FOR_IMPLEMENTATION'] || 0;
  const design = byStatus['DESIGN'] || 0;
  const revision = (byStatus['NEEDS_REVISION'] || 0) + (byStatus['REWORK'] || 0);
  const pct = total > 0 ? Math.round((implemented / total) * 100) : 0;
  
  const barLen = 20;
  const filled = Math.round((pct / 100) * barLen);
  const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);

  console.log(`
${c.bold}═══ GraphIPO Project Status ═══${c.reset}

  ${c.dim}Description:${c.reset}  ${canvas.project_description || '(not set)'}
  ${c.dim}Stack:${c.reset}        ${canvas.project_type || '(not detected)'}
  ${c.dim}Language:${c.reset}      ${canvas.code_language || 'EN'}
  ${c.dim}Discovery:${c.reset}    ${canvas.discovery_completed ? `${c.green}Completed${c.reset}` : `${c.yellow}Pending${c.reset}`}

  ${c.bold}Progress:${c.reset}     ${bar} ${pct}%
  ${c.dim}Nodes:${c.reset}        ${total} total | ${edges.length} edges
  ${c.green}✅ ${implemented} Implemented${c.reset} | ${c.blue}🔵 ${ready} Ready${c.reset} | ${c.dim}📝 ${design} Design${c.reset}${revision > 0 ? ` | ${c.yellow}⚠️ ${revision} Revision${c.reset}` : ''}

${c.bold}═══════════════════════════════${c.reset}
`);

  if (total === 0 && !canvas.discovery_completed) {
    console.log(`  ${c.dim}No nodes yet. Tell your AI agent:${c.reset}`);
    console.log(`  ${c.magenta}"Use start_discovery to begin designing."${c.reset}\n`);
  }
}

function cmdDiscover() {
  if (!canvasExists()) {
    console.log(`${c.yellow}⚠ GraphIPO is not initialized. Initializing now...${c.reset}\n`);
    cmdInit();
    return;
  }

  const canvas = loadCanvas();
  
  if (canvas?.discovery_completed) {
    console.log(`${c.green}✅ Discovery already completed for this project.${c.reset}`);
    console.log(`\n  ${c.dim}To redesign, run ${c.cyan}graph-ipo reset${c.dim} and start over.${c.reset}`);
    return;
  }

  console.log(`
${c.bold}🔍 Discovery Mode${c.reset}

  Your project is initialized but discovery is not complete yet.
  
  ${c.bold}Tell your AI agent:${c.reset}

  ${c.magenta}"Use start_discovery to begin. I want to build [describe your project]."${c.reset}

  The agent will:
  ${c.cyan}1.${c.reset} Ask you questions about your project (users, features, data, platform)
  ${c.cyan}2.${c.reset} Generate the architecture graph based on your answers
  ${c.cyan}3.${c.reset} Present the design for your approval

  ${c.dim}Your canvas is at: ${getCanvasPath()}${c.reset}
`);
  startServerAndOpenBrowser();
}

function cmdUpdate() {
  console.log(`${c.bold}📦 Updating GraphIPO...${c.reset}\n`);
  console.log(`  ${c.dim}Current version: v${VERSION}${c.reset}`);
  try {
    execSync('npm cache clean --force 2>&1', { stdio: 'pipe' });
    console.log(`  ${c.green}✓${c.reset} Cache cleared`);
  } catch {
    // Cache clean may fail, that's ok
  }
  try {
    // Uninstall first to avoid EEXIST conflicts on Windows/NVM
    execSync('npm uninstall -g @0xlayne/graph-ipo-harness 2>&1', { stdio: 'pipe' });
    console.log(`  ${c.green}✓${c.reset} Old version removed`);
  } catch {
    // May not be installed globally, that's fine
  }
  try {
    execSync('npm install -g @0xlayne/graph-ipo-harness@latest --force', { stdio: 'inherit' });
    console.log(`\n  ${c.green}✓${c.reset} Updated to latest version.`);
    console.log(`  ${c.dim}Run ${c.cyan}graph-ipo version${c.dim} to verify.${c.reset}`);
  } catch {
    console.log(`\n  ${c.yellow}⚠${c.reset} Global install failed. Try manually:`);
    console.log(`  ${c.cyan}npm uninstall -g @0xlayne/graph-ipo-harness${c.reset}`);
    console.log(`  ${c.cyan}npm install -g @0xlayne/graph-ipo-harness@latest --force${c.reset}`);
  }
}

async function cmdCanvas() {
  if (!canvasExists()) {
    console.log(`${c.yellow}⚠ GraphIPO is not initialized in this directory.${c.reset}`);
    console.log(`\n  Run ${c.cyan}graph-ipo init${c.reset} first.`);
    return;
  }

  const ipoDir = path.join(process.cwd(), CANVAS_DIR);
  const htmlFile = path.join(ipoDir, 'canvas.html');
  if (!fs.existsSync(htmlFile)) {
    generateCanvasHtml(ipoDir);
  }

  // Serve the .ipo/ folder on a local port so canvas.html can fetch canvas.json
  const { createServer } = await import('node:http');
  const serveHandler = (req: any, res: any) => {
    const url = new URL(req.url || '/', 'http://localhost');
    let filePath = path.join(ipoDir, url.pathname === '/' ? 'canvas.html' : url.pathname);
    // Security: don't serve files outside .ipo/
    if (!filePath.startsWith(ipoDir)) { res.writeHead(403); res.end(); return; }
    if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    const mimeTypes: Record<string,string> = { '.html': 'text/html', '.json': 'application/json', '.css': 'text/css', '.js': 'application/javascript' };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(fs.readFileSync(filePath));
  };

  const server = createServer(serveHandler);
  let port = 4170;

  const tryListen = (p: number, attempts: number) => {
    if (attempts > 20) {
      console.log(`  ${c.yellow}⚠${c.reset} Could not find an available port.`);
      return;
    }
    server.listen(p, () => {
      const url = `http://localhost:${p}`;
      console.log(`  ${c.green}✓${c.reset} Canvas UI serving at ${c.cyan}${url}${c.reset}`);
      console.log(`  ${c.dim}Serving: ${ipoDir}${c.reset}`);
      console.log(`  ${c.dim}Press Ctrl+C to stop${c.reset}`);
      openBrowser(url);
    });
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        tryListen(p + 1, attempts + 1);
      }
    });
  };

  tryListen(port, 0);
}

function cmdReset() {
  const canvasPath = getCanvasPath();
  if (!canvasExists()) {
    console.log(`${c.yellow}⚠ Nothing to reset — GraphIPO is not initialized here.${c.reset}`);
    return;
  }

  const canvas = {
    version: VERSION,
    project_type: "",
    project_description: "",
    user_experience_level: "intermediate",
    discovery_completed: false,
    code_language: "EN",
    edges: [],
    nodes: []
  };

  fs.writeFileSync(canvasPath, JSON.stringify(canvas, null, 2), 'utf-8');
  console.log(`${c.green}✅ Canvas reset to empty state.${c.reset}`);
  console.log(`  ${c.dim}All nodes and edges have been cleared.${c.reset}`);
  console.log(`\n  Run ${c.cyan}graph-ipo discover${c.reset} to start fresh.`);
}

function cmdVersion() {
  console.log(`graph-ipo v${VERSION}`);
}

function cmdHelp() {
  console.log(`
${c.bold}GraphIPO${c.reset} — Design-first, AI-assisted software engineering ${c.dim}v${VERSION}${c.reset}

${c.bold}USAGE${c.reset}
  ${c.cyan}graph-ipo${c.reset} <command>

${c.bold}COMMANDS${c.reset}
  ${c.cyan}init${c.reset}        Initialize GraphIPO in the current directory
  ${c.cyan}status${c.reset}      Show project progress and node summary
  ${c.cyan}discover${c.reset}    Start or resume the discovery interview
  ${c.cyan}canvas${c.reset}      Open the Canvas UI in your browser
  ${c.cyan}update${c.reset}      Update GraphIPO to the latest version
  ${c.cyan}reset${c.reset}       Clear all nodes and start over
  ${c.cyan}version${c.reset}     Show installed version
  ${c.cyan}help${c.reset}        Show this help message

${c.bold}MCP CONFIGURATION${c.reset}
  Add to your IDE's MCP config:

  ${c.dim}{
    "mcpServers": {
      "graph-ipo": {
        "command": "npx",
        "args": ["-y", "@0xlayne/graph-ipo-harness"]
      }
    }
  }${c.reset}

${c.bold}QUICK START${c.reset}
  ${c.cyan}$${c.reset} mkdir my-project && cd my-project
  ${c.cyan}$${c.reset} graph-ipo init
  ${c.cyan}$${c.reset} ${c.dim}# Open in IDE, then tell the agent:${c.reset}
  ${c.cyan}$${c.reset} ${c.dim}# "I want to build X. Use start_discovery to begin."${c.reset}

${c.bold}LINKS${c.reset}
  GitHub:  ${c.blue}https://github.com/LayneStyle/graph-ipo${c.reset}
  npm:     ${c.blue}https://www.npmjs.com/package/@0xlayne/graph-ipo-harness${c.reset}
`);
}

// ============================================
// MAIN
// ============================================

const command = process.argv[2]?.toLowerCase();

switch (command) {
  case 'init':
    cmdInit();
    break;
  case 'status':
    cmdStatus();
    break;
  case 'discover':
  case 'discovery':
    cmdDiscover();
    break;
  case 'canvas':
  case 'ui':
    cmdCanvas();
    break;
  case 'update':
  case 'upgrade':
    cmdUpdate();
    break;
  case 'reset':
  case 'clean':
    cmdReset();
    break;
  case 'version':
  case '-v':
  case '--version':
    cmdVersion();
    break;
  case 'help':
  case '-h':
  case '--help':
  case undefined:
    cmdHelp();
    break;
  default:
    console.log(`${c.red}Unknown command: ${command}${c.reset}`);
    console.log(`Run ${c.cyan}graph-ipo help${c.reset} for available commands.`);
    process.exit(1);
}
