#!/usr/bin/env python3
"""
Run Audit Demo - GraphIPO Reverse Graph Analyzer Verification Script
---------------------------------------------------------------------
Creates a sample codebase structure containing C#, TypeScript, and Python source files
with intentional implementation states, missing methods, unmapped methods, and step order
mismatches. Executes reverse_graph_analyzer.py to produce audit reports and displays results.
"""

import os
import sys
import json
import subprocess
from pathlib import Path

# Paths setup
ANALYZERS_DIR = Path(__file__).parent.resolve()
DEMO_CODEBASE = ANALYZERS_DIR / "demo_codebase"
CANVAS_FILE = ANALYZERS_DIR / "demo_canvas.json"
MD_REPORT = ANALYZERS_DIR / "demo_drift_report.md"
JSON_REPORT = ANALYZERS_DIR / "demo_drift_report.json"

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

def setup_demo_codebase():
    """Generates sample source files and sample canvas.json in demo_codebase directory."""
    print("[*] Setting up sample codebase and canvas specification for audit demonstration...")

    demo_canvas_data = {
        "version": "1.0.0",
        "active_profile": "UNITY_GAMEDEV",
        "phase": "SPECIFIED",
        "nodes": [
            {
                "id": "node-001",
                "title": "Player Authentication & Session Init",
                "category": "System Engine",
                "lifecycle_phase": "Awake / NetworkInit",
                "status": "IMPLEMENTED",
                "target_symbols": [
                    { "symbol": "NetworkManager.Initialize()", "file": "Assets/Scripts/Net/NetworkManager.cs" },
                    { "symbol": "AuthService.AuthenticateUser()", "file": "Assets/Scripts/Services/AuthService.cs" }
                ],
                "process_execution_plan": [
                    {
                        "step": 1,
                        "type": "SECURITY_CHECK",
                        "rule": "IF network_status != CONNECTED THEN ABORT('Offline mode')"
                    },
                    {
                        "step": 2,
                        "type": "PARALLEL_FETCH",
                        "actions": [
                            "Fetch user_profile from AuthService.AuthenticateUser()",
                            "Fetch player_inventory from InventoryService.loadState()"
                        ]
                    }
                ],
                "outputs": [
                    { "case": "Success", "target_symbol": "GameManager.SetState(LOBBY)" }
                ]
            },
            {
                "id": "node-002",
                "title": "Weapon Attack & Ballistic Calculation",
                "category": "Entity State",
                "lifecycle_phase": "Update / OnFireInput",
                "status": "READY_FOR_IMPLEMENTATION",
                "target_symbols": [
                    { "symbol": "PlayerController.OnFireInput()", "file": "Assets/Scripts/Player/PlayerController.cs" },
                    { "symbol": "WeaponManager.GetActiveWeapon()", "file": "Assets/Scripts/Combat/WeaponManager.cs" },
                    { "symbol": "HealthSystem.TakeDamage()", "file": "Assets/Scripts/Combat/HealthSystem.cs" }
                ],
                "process_execution_plan": [
                    {
                        "step": 1,
                        "type": "SECURITY_CHECK",
                        "rule": "IF player_ammo_count <= 0 THEN PlayEmptyClick() AND RETURN"
                    },
                    {
                        "step": 2,
                        "type": "PARALLEL_FETCH",
                        "actions": [
                            "Fetch weapon_data from WeaponManager.GetActiveWeapon()"
                        ]
                    },
                    {
                        "step": 3,
                        "type": "FAN_OUT_DISPATCH",
                        "targets": [
                            "HealthSystem.TakeDamage(total_damage) on Target.cs"
                        ]
                    }
                ],
                "outputs": [
                    { "case": "Hit", "target_symbol": "HealthSystem.TakeDamage()" }
                ]
            },
            {
                "id": "node-003",
                "title": "Cloud Inventory Sync",
                "category": "Data Engine",
                "lifecycle_phase": "Async Background",
                "status": "DESIGN",
                "target_symbols": [
                    { "symbol": "CloudInventoryService.SyncState()", "file": "Assets/Scripts/Services/CloudInventoryService.cs" }
                ],
                "process_execution_plan": [
                    { "step": 1, "rule": "Verify network connection" }
                ],
                "outputs": []
            }
        ]
    }

    with open(CANVAS_FILE, "w", encoding="utf-8") as f:
        json.dump(demo_canvas_data, f, indent=2)

    # 1. NetworkManager.cs (C#)
    net_dir = DEMO_CODEBASE / "Assets" / "Scripts" / "Net"
    net_dir.mkdir(parents=True, exist_ok=True)
    with open(net_dir / "NetworkManager.cs", "w", encoding="utf-8") as f:
        f.write('''using System;

namespace Game.Net {
    public class NetworkManager {
        public void Initialize() {
            Console.WriteLine("Initializing Network Manager...");
            // Calls AuthService
            AuthService.AuthenticateUser();
        }

        // Unmapped helper method not in design
        public void PingServer() {
            Console.WriteLine("Pinging server...");
        }
    }
}
''')

    # 2. AuthService.cs (C#)
    svc_dir = DEMO_CODEBASE / "Assets" / "Scripts" / "Services"
    svc_dir.mkdir(parents=True, exist_ok=True)
    with open(svc_dir / "AuthService.cs", "w", encoding="utf-8") as f:
        f.write('''using System;

namespace Game.Services {
    public class AuthService {
        public static void AuthenticateUser() {
            Console.WriteLine("User Authenticated successfully.");
        }
    }
}
''')

    # 3. PlayerController.cs (C#) - Contains an ORDER MISMATCH!
    player_dir = DEMO_CODEBASE / "Assets" / "Scripts" / "Player"
    player_dir.mkdir(parents=True, exist_ok=True)
    with open(player_dir / "PlayerController.cs", "w", encoding="utf-8") as f:
        f.write('''using System;

namespace Game.Player {
    public class PlayerController {
        public void OnFireInput() {
            // ORDER MISMATCH: TakeDamage (Step 4) called BEFORE PlayEmptyClick (Step 1 Security Check)!
            HealthSystem.TakeDamage();
            WeaponManager.GetActiveWeapon();
            PlayEmptyClick();
        }

        private void PlayEmptyClick() {
            Console.WriteLine("Click!");
        }
    }
}
''')

    # 4. InventoryService.ts (TypeScript)
    ts_dir = DEMO_CODEBASE / "src" / "services"
    ts_dir.mkdir(parents=True, exist_ok=True)
    with open(ts_dir / "InventoryService.ts", "w", encoding="utf-8") as f:
        f.write('''export class InventoryService {
    public static loadState(): void {
        console.log("Loading inventory state...");
    }

    public syncCloudStorage(): void {
        console.log("Syncing cloud storage...");
    }
}
''')

    # 5. analytics.py (Python)
    py_dir = DEMO_CODEBASE / "services"
    py_dir.mkdir(parents=True, exist_ok=True)
    with open(py_dir / "analytics.py", "w", encoding="utf-8") as f:
        f.write('''class AnalyticsTracker:
    def track_event(self, event_name):
        print(f"Tracking event: {event_name}")

    def export_telemetry(self):
        print("Exporting telemetry logs...")
''')

    print(f"[*] Demo codebase created at: {DEMO_CODEBASE}")


def run_audit():
    """Invokes reverse_graph_analyzer.py using python."""
    script_path = ANALYZERS_DIR / "reverse_graph_analyzer.py"

    cmd = [
        sys.executable,
        str(script_path),
        "--code-dir", str(DEMO_CODEBASE),
        "--canvas-json", str(CANVAS_FILE),
        "--output-report", str(MD_REPORT),
        "--output-json", str(JSON_REPORT)
    ]

    print(f"\n[>] Running reverse_graph_analyzer command:")
    print(" ".join(cmd))
    print("=" * 60)

    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print(result.stdout)

    if result.stderr:
        print("Standard Error Output:")
        print(result.stderr)

    if result.returncode == 0:
        print("[+] Audit completed successfully!\n")
        display_summary()
    else:
        print(f"[-] Audit failed with exit code: {result.returncode}")


def display_summary():
    """Displays generated JSON audit summary and Markdown report location."""
    if JSON_REPORT.exists():
        with open(JSON_REPORT, 'r', encoding='utf-8') as f:
            data = json.load(f)

        summary = data.get("summary", {})
        print("[=] AUDIT SUMMARY METRICS:")
        print(f"  - Total Nodes Evaluated : {summary.get('total_nodes')}")
        print(f"  - Files Scanned         : {summary.get('files_scanned')}")
        print(f"  - Compliance Score      : {summary.get('compliance_score')}%")
        print(f"  - Missing Symbols       : {summary.get('missing_in_code_count')}")
        print(f"  - Order Mismatches      : {summary.get('order_mismatch_count')}")
        print(f"  - Unmapped Methods      : {summary.get('unmapped_in_design_count')}")
        print(f"\nDetailed Markdown Report written to:\n  file:///{MD_REPORT.as_posix()}")


if __name__ == "__main__":
    setup_demo_codebase()
    run_audit()
