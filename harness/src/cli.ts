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

// ============================================
// COMMANDS
// ============================================

function cmdInit() {
  const canvasPath = getCanvasPath();
  
  if (canvasExists()) {
    console.log(`${c.yellow}⚠ GraphIPO is already initialized in this directory.${c.reset}`);
    console.log(`  Canvas: ${c.dim}${canvasPath}${c.reset}`);
    console.log(`\n  Starting Canvas UI...`);
    startServerAndOpenBrowser();
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

  console.log(`
${c.green}${c.bold}✅ GraphIPO initialized!${c.reset}

  ${c.dim}Created:${c.reset} ${CANVAS_DIR}/${CANVAS_FILE}
`);

  startServerAndOpenBrowser();

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

function cmdCanvas() {
  if (!canvasExists()) {
    console.log(`${c.yellow}⚠ GraphIPO is not initialized in this directory.${c.reset}`);
    console.log(`\n  Run ${c.cyan}graph-ipo init${c.reset} first.`);
    return;
  }
  console.log(`${c.bold}🎨 Opening Canvas UI...${c.reset}\n`);
  startServerAndOpenBrowser();
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
