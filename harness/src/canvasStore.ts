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
  nodes: [
    {
      id: "node_shooter_weapon_fire",
      title: "Unity Shooter: Weapon Firing System",
      category: "System Engine",
      lifecycle_phase: "IMPLEMENTATION",
      target_symbols: [
        "PlayerWeaponController.cs",
        "BulletPoolManager.cs",
        "AudioEventChannel.cs"
      ],
      inputs: [
        "PlayerInput.Fire (InputAction)",
        "WeaponData ScriptableObject (FireRate, Damage, BulletPrefab)",
        "Transform MuzzlePoint"
      ],
      process_execution_plan: [
        "1. Receive Fire input trigger in Update()",
        "2. Check fire cooldown timer against WeaponData.FireRate",
        "3. Request active bullet instance from BulletPoolManager",
        "4. Set bullet trajectory, damage payload, and velocity",
        "5. Raise AudioEventChannel.PlaySound(FireSFX)"
      ],
      outputs: [
        "Bullet GameObject instantiated / activated",
        "MuzzleFlash VFX played",
        "OnWeaponFired C# Action event dispatched"
      ],
      status: "READY_FOR_IMPLEMENTATION"
    },
    {
      "id": "node_web_auth_login",
      "title": "Web Auth: User Login Route Handler",
      "category": "API Route Handler",
      "lifecycle_phase": "IMPLEMENTATION",
      "target_symbols": [
        "src/routes/auth.ts",
        "src/services/userService.ts",
        "src/utils/jwt.ts"
      ],
      "inputs": [
        "Req body: { email: string, password_hash: string }",
        "Supabase Client / PostgreSQL DB connection"
      ],
      "process_execution_plan": [
        "1. Validate email format and request schema using Zod",
        "2. Query database for user record matching email",
        "3. Verify password hash using bcrypt/argon2",
        "4. Generate JWT access_token and refresh_token",
        "5. Set HttpOnly auth cookie and return user profile DTO"
      ],
      "outputs": [
        "HTTP 200 OK with UserProfile object",
        "Set-Cookie header with HTTPOnly JWT",
        "HTTP 401 Unauthorized error fallback"
      ],
      "status": "IMPLEMENTED"
    }
  ]
};

export function resolveCanvasPath(overridePath?: string): string {
  if (overridePath) {
    return path.resolve(overridePath);
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
