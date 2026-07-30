import * as fs from "fs";
import * as path from "path";
import { IPOCanvas } from "./types.js";

const DEFAULT_CANVAS: IPOCanvas = {
  version: "1.0.0",
  project_type: "",
  project_description: "",
  user_experience_level: "intermediate",
  code_language: "EN",
  edges: [],
  nodes: []
};

export function resolveCanvasPath(overridePath?: string): string {
  if (overridePath) {
    const resolved = path.resolve(overridePath);
    const cwd = process.cwd();
    // Allow absolute paths but ensure they end in .ipo/canvas.json pattern
    // This prevents reading/writing arbitrary system files
    if (!resolved.endsWith('.ipo/canvas.json') && !resolved.endsWith('.ipo\\canvas.json')) {
      console.error(`[GraphIPO] Warning: Canvas path must end with .ipo/canvas.json. Using default.`);
      return path.join(cwd, '.ipo', 'canvas.json');
    }
    return resolved;
  }

  let currDir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(currDir, ".ipo", "canvas.json");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(currDir);
    if (parent === currDir) break;
    currDir = parent;
  }

  // Fallback to local process cwd .ipo/canvas.json
  const defaultPath = path.join(process.cwd(), ".ipo", "canvas.json");
  return defaultPath;
}

export function loadCanvas(overridePath?: string): { canvas: IPOCanvas; filePath: string } {
  const filePath = resolveCanvasPath(overridePath);

  if (!fs.existsSync(filePath)) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(DEFAULT_CANVAS, null, 2), "utf-8");
    return { canvas: JSON.parse(JSON.stringify(DEFAULT_CANVAS)), filePath };
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const canvas: IPOCanvas = JSON.parse(raw);
    if (!Array.isArray(canvas.nodes)) canvas.nodes = [];
    if (!canvas.version) canvas.version = "1.0.0";
    if (canvas.project_type === undefined) canvas.project_type = "";
    if (!canvas.code_language) canvas.code_language = "EN";

    canvas.nodes.forEach((n) => {
      if (!Array.isArray(n.target_symbols)) n.target_symbols = [];
      if (!Array.isArray(n.inputs)) n.inputs = [];
      if (!Array.isArray(n.process_execution_plan)) n.process_execution_plan = [];
      if (!Array.isArray(n.outputs)) n.outputs = [];
    });

    if (!Array.isArray(canvas.edges)) canvas.edges = [];

    return { canvas, filePath };
  } catch (err) {
    if (fs.existsSync(filePath)) {
      const backupPath = path.join(path.dirname(filePath), `canvas.backup-${Date.now()}.json`);
      fs.copyFileSync(filePath, backupPath);
    }
    fs.writeFileSync(filePath, JSON.stringify(DEFAULT_CANVAS, null, 2), "utf-8");
    return { canvas: JSON.parse(JSON.stringify(DEFAULT_CANVAS)), filePath };
  }
}

export function saveCanvas(canvas: IPOCanvas, overridePath?: string): string {
  const filePath = resolveCanvasPath(overridePath);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(canvas, null, 2), "utf-8");
  return filePath;
}
