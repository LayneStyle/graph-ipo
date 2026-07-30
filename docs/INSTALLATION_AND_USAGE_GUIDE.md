# Manual de Instalacion y Uso — GraphIPO

## Paso 1: Configurar el servidor MCP en tu agente de IA

Agrega esta entrada a la configuracion MCP de tu IDE (Antigravity, Cursor, Claude, etc.):

```json
{
  "mcpServers": {
    "graph-ipo": {
      "command": "npx",
      "args": ["-y", "@0xlayne/graph-ipo-harness"]
    }
  }
}
```

**Eso es todo.** No necesitas clonar, compilar ni instalar nada manualmente.
`npx` descarga y ejecuta el servidor automaticamente cada vez que tu agente se conecta.

### Donde va este archivo segun tu IDE:

| IDE | Archivo de configuracion |
|-----|--------------------------|
| **Antigravity** | `~/.gemini/config/mcp_config.json` |
| **Cursor** | `.cursor/mcp.json` en la raiz del proyecto |
| **Claude Desktop** | Settings > Developer > MCP Servers |
| **Claude Code (CLI)** | `claude mcp add graph-ipo npx -y @0xlayne/graph-ipo-harness` |

---

## Paso 2 (Opcional): Instalar el Canvas UI visual

Si quieres ver el grafo de arquitectura en tu navegador:

```bash
npx degit LayneStyle/graph-ipo/canvas-ui graph-ipo-canvas
cd graph-ipo-canvas
npm install
npm run dev
```

Abre `http://localhost:5173` en tu navegador.

---

## Paso 3: Indicarle a tu agente que inicie

### Para un proyecto NUEVO:

Dile a tu agente de IA:

> "Quiero construir [describe tu idea]. Usa `start_discovery` para comenzar."

El agente:
1. Te hara preguntas sobre tu proyecto (usuarios, funcionalidades, plataforma)
2. Generara un grafo de arquitectura inicial con nodos comprensibles
3. Te mostrara el resultado para que lo valides

### Para un proyecto EXISTENTE:

Dile a tu agente:

> "Escanea mi proyecto existente e importalo a GraphIPO. Usa `onboard_existing_project`."

El agente:
1. Escaneara tu codigo fuente (TypeScript, Python, C#, etc.)
2. Creara nodos por cada modulo/directorio encontrado
3. Te preguntara que quieres cambiar o mejorar
4. Recomendara si adaptar el diseno al codigo existente o refactorizar

---

## Paso 4: Trabajar con el grafo

1. **Ver y editar nodos** en el Canvas UI (doble clic para abrir el inspector)
2. **Modo Simple**: Etiquetas en lenguaje natural con terminos tecnicos visibles para aprender
3. **Agregar notas** directamente en cada nodo
4. **Marcar nodos** como "Ready to Code" cuando el diseno este completo
5. **Ejecutar auditoria** pidiendo al agente que use `run_audit`

---

## Instalacion alternativa (desarrollo local)

Si quieres contribuir o modificar GraphIPO:

```bash
git clone https://github.com/LayneStyle/graph-ipo.git
cd graph-ipo/harness
npm install
npm run build
npm link
```

Esto registra `graph-ipo-harness` como comando global. La config MCP seria:

```json
{
  "mcpServers": {
    "graph-ipo": {
      "command": "graph-ipo-harness"
    }
  }
}
```