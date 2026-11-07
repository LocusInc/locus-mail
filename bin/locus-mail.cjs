#!/usr/bin/env node
const { resolve } = require("node:path");
const { pathToFileURL } = require("node:url");
const { existsSync } = require("node:fs");
const { spawn } = require("node:child_process");

async function main() {
  const [major, minor] = process.versions.node.split(".").map(Number);

  if (!((major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major > 22)) {
    throw new Error("Locus Mail requires Node.js 20.19+ (20.x) or 22.12+. Use a supported Node.js version to load preview dependencies.");
  }

  const args = process.argv.slice(2);

  if (args.includes("--help")) {
    console.log(
      "Usage: locus-mail [--path glob] [--root directory] [--port number] [--config file]\nDefaults: current directory, **/*.email.tsx, port 4000.\n--path replaces the discovery glob relative to the project root.\n--root selects another project directory.\n--port changes the preview server port.\n--config selects a config module (default: locus-mail.config.mjs).\n--help shows this help. Config supports root, path, and port; CLI flags take precedence.\nThe optional dev command is supported as an alias.",
    );

    return;
  }

  if (args[0] === "dev") {
    args.shift();
  }

  const options = {};

  while (args.length) {
    const flag = args.shift();

    if (
      !["--config", "--root", "--port", "--path"].includes(flag) ||
      !args.length ||
      args[0].startsWith("--")
    ) {
      throw new Error(`Invalid option: ${flag}`);
    }

    const value = args.shift();
    options[flag.slice(2)] = value;
  }

  const configPath = resolve(options.config ?? "locus-mail.config.mjs");

  if (options.config && !existsSync(configPath)) {
    throw new Error(`Missing config: ${configPath}`);
  }

  const config = existsSync(configPath)
    ? (await import(pathToFileURL(configPath).href)).default
    : {};

  if (!config || typeof config !== "object") {
    throw new Error("Config must export an object.");
  }

  const root = resolve(options.root ?? config.root ?? process.cwd());
  const path = options.path ?? config.path ?? "**/*.email.tsx";

  if (typeof path !== "string" || !path.trim()) {
    throw new Error("path must be a nonempty glob string.");
  }

  const paths = [path];
  const port = Number(options.port ?? config.port ?? 4000);

  if (!existsSync(root)) {
    throw new Error(`Missing project root: ${root}`);
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("port must be between 1 and 65535.");
  }

  const appRoot = resolve(__dirname, "..");
  const registry = await require("./template-registry.cjs").startRegistry({
    root,
    paths,
  });

  console.log(
    `Locus Mail preview: http://localhost:${port}\nProject: ${root}\nPaths: ${paths.join(", ")}`,
  );

  const child = spawn(
    process.execPath,
    [
      require.resolve("next/dist/bin/next"),
      "dev",
      appRoot,
      "--webpack",
      "--port",
      String(port),
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        LOCUS_MAIL_ROOT: root,
        LOCUS_MAIL_PATHS: JSON.stringify(paths),
        LOCUS_MAIL_REGISTRY_URL: registry.url,
      },
    },
  );

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => child.kill(signal));
  }

  child.on("error", (error) => {
    registry.close();
    console.error(error.message);
    process.exitCode = 1;
  });

  child.on("exit", (code) => {
    registry.close();
    process.exitCode = code ?? 1;
  });
}

main().catch((error) => {
  console.error(`locus-mail: ${error.message}`);
  process.exitCode = 1;
});
