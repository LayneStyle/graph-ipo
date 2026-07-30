# GraphIPO Reverse Code-to-Graph Drift Report 🔍

**Audit Status:** 🟥 **CRITICAL DRIFT DETECTED**  |  **Compliance Score:** `0%`
**Generated:** `2026-07-29 23:24:32`
**Canvas Spec:** `D:\Github Repos\IO-Workflow\graph-ipo\analyzers\demo_canvas.json`  |  **Code Base:** `D:\Github Repos\IO-Workflow\graph-ipo\analyzers\demo_codebase`

---

## 📊 Executive Summary Metrics

| Metric | Count / Value | Description |
| :--- | :---: | :--- |
| **Design Nodes** | `3` | Total IPO Canvas design nodes evaluated |
| **Files Scanned** | `5` | Source code files (.cs, .ts, .py) parsed |
| **Compliance Score** | `0%` | Design adherence rating (0 - 100%) |
| **Missing in Code** | `5` | Design symbols not found in codebase |
| **Order Mismatches** | `2` | Execution step sequence violations |
| **Unmapped Methods** | `5` | Code methods absent in design nodes |

---

## ⚠️ Architectural Discrepancies Breakdown

| Severity | Discrepancy Type | Node ID | Symbol / Target | Description |
| :---: | :--- | :---: | :--- | :--- |
| 🟠 MED | `MISSING_IN_CODE` | `node-001` | `GameManager.SetState(LOBBY)` | Node output target symbol 'GameManager.SetState(LOBBY)' is missing in codebase. |
| 🔴 HIGH | `MISSING_IN_CODE` | `node-002` | `WeaponManager.GetActiveWeapon()` | Design target symbol 'WeaponManager.GetActiveWeapon()' is missing in the codebase. |
| 🔴 HIGH | `MISSING_IN_CODE` | `node-002` | `HealthSystem.TakeDamage()` | Design target symbol 'HealthSystem.TakeDamage()' is missing in the codebase. |
| 🟠 MED | `MISSING_IN_CODE` | `node-002` | `HealthSystem.TakeDamage()` | Node output target symbol 'HealthSystem.TakeDamage()' is missing in codebase. |
| 🔴 HIGH | `ORDER_MISMATCH` | `node-002` | `PlayerController.OnFireInput` | Step sequence violation in 'PlayerController.OnFireInput': Call to 'WeaponManager.GetActiveWeapon' (Step 2) occurred after Step 3 execution. |
| 🔴 HIGH | `ORDER_MISMATCH` | `node-002` | `PlayerController.OnFireInput` | Step sequence violation in 'PlayerController.OnFireInput': Call to 'PlayEmptyClick' (Step 1) occurred after Step 3 execution. |
| 🔴 HIGH | `MISSING_IN_CODE` | `node-003` | `CloudInventoryService.SyncState()` | Design target symbol 'CloudInventoryService.SyncState()' is missing in the codebase. |
| 🟡 LOW | `UNMAPPED_IN_DESIGN` | `N/A` | `NetworkManager.PingServer` | Codebase method 'NetworkManager.PingServer' (Assets\Scripts\Net\NetworkManager.cs:12) is not mapped to any GraphIPO design node. |
| 🟡 LOW | `UNMAPPED_IN_DESIGN` | `N/A` | `AnalyticsTracker.track_event` | Codebase method 'AnalyticsTracker.track_event' (services\analytics.py:2) is not mapped to any GraphIPO design node. |
| 🟡 LOW | `UNMAPPED_IN_DESIGN` | `N/A` | `AnalyticsTracker.export_telemetry` | Codebase method 'AnalyticsTracker.export_telemetry' (services\analytics.py:5) is not mapped to any GraphIPO design node. |
| 🟡 LOW | `UNMAPPED_IN_DESIGN` | `N/A` | `InventoryService.loadState` | Codebase method 'InventoryService.loadState' (src\services\InventoryService.ts:2) is not mapped to any GraphIPO design node. |
| 🟡 LOW | `UNMAPPED_IN_DESIGN` | `N/A` | `InventoryService.syncCloudStorage` | Codebase method 'InventoryService.syncCloudStorage' (src\services\InventoryService.ts:6) is not mapped to any GraphIPO design node. |

---

## 🧩 Node-by-Node Audit Details

### ✅ Node [node-001]: Player Authentication & Session Init
- **Lifecycle Phase:** `Awake / NetworkInit`
- **Design Status:** `IMPLEMENTED`
- **Matched Code Symbols:** `NetworkManager.Initialize()`, `AuthService.AuthenticateUser()`
- **Missing Code Symbols:** None 🎉
- **Order Violation Count:** `0`

### ⚠️ Node [node-002]: Weapon Attack & Ballistic Calculation
- **Lifecycle Phase:** `Update / OnFireInput`
- **Design Status:** `READY_FOR_IMPLEMENTATION`
- **Matched Code Symbols:** `PlayerController.OnFireInput()`
- **Missing Code Symbols:** `WeaponManager.GetActiveWeapon()`, `HealthSystem.TakeDamage()`
- **Order Violation Count:** `2`

### ⚠️ Node [node-003]: Cloud Inventory Sync
- **Lifecycle Phase:** `Async Background`
- **Design Status:** `DESIGN`
- **Matched Code Symbols:** _None_
- **Missing Code Symbols:** `CloudInventoryService.SyncState()`
- **Order Violation Count:** `0`

---

## 🚀 Actionable Recommendations

1. **Fix Missing Symbols:** Implement design target symbols flagged with `MISSING_IN_CODE` in their respective code modules.
2. **Correct Call Sequence:** Ensure caller methods execute steps strictly according to the `process_execution_plan` sequence defined in `.ipo/canvas.json`.
3. **Update Canvas Spec:** If newly added codebase methods are valid architectural additions, append them into `.ipo/canvas.json` nodes to resolve `UNMAPPED_IN_DESIGN` warnings.
