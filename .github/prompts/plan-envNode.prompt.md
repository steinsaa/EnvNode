## Plan: Separate workspaces + TS/ESM build

You want two separate folders and workspace files, with TypeScript + ESLint from the start and a build-to-dist ESM Node setup. The plan below keeps ESP-IDF and Node tooling isolated while aligning the Node project to your preferred workflow.

### Steps 4
1. Create two workspace files: one for this Node project, one for the ESP-IDF folder.
2. Update package.json to ESM (type: "module"), set main to dist, add build/run scripts.
3. Add TypeScript config and ESLint + @typescript-eslint setup for correctness checks.
4. Add per-workspace VS Code settings to isolate formatter, language servers, and terminals.

### Further Considerations
1. Should the ESP-IDF workspace include only its root folder or extra shared tooling folders?
2. Do you want strict TS rules from day one (e.g., no-explicit-any) or a gradual ramp-up?
