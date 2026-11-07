const { build } = require("esbuild");
const glob = require("fast-glob");
const { resolve, relative, dirname } = require("node:path");
const { createRequire } = require("node:module");
const { createElement } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { createHash } = require("node:crypto");
const { createServer } = require("node:http");

const ignored = ["node_modules", ".git", ".next", "dist", "build", "out", "coverage", "generated", "__generated__", ".turbo"];

function propsObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function createRegistry({ root, paths = ["**/*.email.tsx"] }) {
  root = resolve(root);
  let entries = [];
  let revision = "";
  let pending;
  const modules = new Map();
  async function refresh() {
    const next = [];

    try {
      const files = await glob(paths, { cwd: root, absolute: true, unique: true, followSymbolicLinks: false, ignore: ignored.map((directory) => `**/${directory}/**`) });
      const identities = new Set();

      for (const file of files.sort()) {
        if (!/\.email\.(ts|tsx)$/.test(file) || file.endsWith(".d.ts")) {
          continue;
        }

        const source = relative(root, file).split(require("node:path").sep).join("/");
        const id = `template:${source.replace(/\.(tsx|ts)$/, "")}`;
        const entry = { id, source, status: "ready" };

        try {
          if (identities.has(id)) {
            throw new Error(`Duplicate template identity ${id}; keep only one .ts or .tsx module at this location.`);
          }

          identities.add(id);
          const result = await build({ entryPoints: [file], bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic", packages: "external", logLevel: "silent" });
          const code = result.outputFiles[0].text;
          entry.fingerprint = createHash("sha256").update(code).digest("hex");
          const localRequire = createRequire(file);
          const packageRequire = createRequire(__filename);
          const load = (name) => /^react(?:-dom)?(?:\/|$)/.test(name) ? packageRequire(name) : localRequire(name);
          let loaded = modules.get(file);

          if (!loaded || loaded.fingerprint !== entry.fingerprint) {
            loaded = { exports: {}, fingerprint: entry.fingerprint };
            new Function("require", "module", "exports", "__filename", "__dirname", code)(load, loaded, loaded.exports, file, dirname(file));
            modules.set(file, loaded);
          }

          const component = loaded.exports.default;

          if (typeof component !== "function" && !(component && [Symbol.for("react.memo"), Symbol.for("react.forward_ref")].includes(component.$$typeof))) {
            throw new Error("Export a React component as default from this email module.");
          }

          entry.component = component;

          if (loaded.exports.previewData === undefined) {
            entry.status = "missing-preview-data";
            entry.error = "Add export const previewData = { ... } with fully loaded component props to preview this template.";
          } else {
            const data = loaded.exports.previewData;

            if (!propsObject(data)) {
              throw new Error("previewData must be a JSON props object.");
            }

            const serialized = JSON.stringify(data, (_key, value) => {
              if (typeof value === "function" || typeof value === "symbol" || typeof value === "bigint" || value === undefined) {
                throw new Error("previewData must contain JSON values only.");
              }

              return value;
            });
            entry.previewData = JSON.parse(serialized);
          }
        } catch (error) {
          entry.status = "error";
          entry.error = `${source}: ${error.message}`;
        }

        next.push(entry);
      }

      const duplicates = new Set(next.filter((entry, index) => next.findIndex((other) => other.id === entry.id) !== index).map((entry) => entry.id));

      for (const entry of next) {
        if (duplicates.has(entry.id)) {
          entry.status = "error";
          entry.error = `${entry.source}: Duplicate template identity ${entry.id}; keep only one .ts or .tsx module at this location.`;
        }
      }
    } catch (error) {
      next.push({ id: "registry:error", status: "error", error: `Check project root and discovery paths: ${error.message}` });
    }

    entries = next;

    for (const file of modules.keys()) {
      if (!next.some((entry) => entry.source === relative(root, file).split(require("node:path").sep).join("/"))) {
        modules.delete(file);
      }
    }

    revision = createHash("sha256").update(JSON.stringify(snapshot().templates)).digest("hex");

    return snapshot();
  }

  function snapshot() {
    return { revision, templates: entries.map((entry) => Object.fromEntries(Object.entries(entry).filter(([key]) => key !== "component"))) };
  }

  return {
    snapshot,
    refresh() {
      if (!pending) {
        pending = refresh().finally(() => {
          pending = undefined;
        });
      }

      return pending;
    },
    render(id, props) {
      const entry = entries.find((candidate) => candidate.id === id);

      if (!entry) {
        throw new Error(`Unknown template: ${id}. Refresh the registry.`);
      }

      if (entry.status === "error") {
        throw new Error(entry.error);
      }

      const data = props === undefined ? entry.previewData : props;

      if (!propsObject(data)) {
        throw new Error(entry.error || "Provide a JSON props object.");
      }

      const html = renderToStaticMarkup(createElement(entry.component, data));

      if (!html.trim()) {
        throw new Error(`${entry.source}: Template produced empty HTML.`);
      }

      return { html };
    },
  };
}

async function startRegistry(options) {
  const registry = createRegistry(options);
  await registry.refresh();
  const server = createServer(async (request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.setHeader("Cache-Control", "no-store");

    try {
      await registry.refresh();

      if (request.method === "GET") {
        response.end(JSON.stringify(registry.snapshot()));
      } else if (request.method === "POST") {
        let body = "";

        for await (const chunk of request) {
          body += chunk;

          if (body.length > 1024 * 1024) {
            throw new Error("Preview props exceed 1 MB.");
          }
        }

        const { id, props } = JSON.parse(body);
        response.end(JSON.stringify(registry.render(id, props)));
      } else {
        response.statusCode = 405; response.end();
      }
    } catch (error) {
      response.statusCode = 400;
      response.end(JSON.stringify({ error: error.message }));
    }
  });
  await new Promise((resolveReady, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveReady);
  });
  const timer = setInterval(() => registry.refresh(), 1000);
  timer.unref();

  return { url: `http://127.0.0.1:${server.address().port}`, close() {
    clearInterval(timer); server.close();
  } };
}

module.exports = { createRegistry, startRegistry };
