import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { getIconData, type IconifyJSON } from "@iconify/utils";
import Unimport from "unimport/unplugin";
import { defineConfig, loadEnv, type Plugin } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));
const virtualIcons = "virtual:app-icons";
const resolvedVirtualIcons = `\0${virtualIcons}`;

const mediaMimeTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".epub": "application/epub+zip",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webm": "video/webm",
  ".webp": "image/webp",
};

function devUploadsPlugin(fallbackOrigin: string): Plugin {
  const uploadsRoot = resolve(root, "../backend/uploads");
  const normalizedFallback = fallbackOrigin.replace(/\/$/, "");
  return {
    name: "corner-dev-uploads",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!request.url || !["GET", "HEAD"].includes(request.method || "")) return next();
        const url = new URL(request.url, "http://localhost");
        if (!url.pathname.startsWith("/uploads/")) return next();

        let relativePath = "";
        try {
          relativePath = decodeURIComponent(url.pathname.slice("/uploads/".length));
        } catch {
          response.statusCode = 400;
          response.end("Invalid media path");
          return;
        }
        const localPath = resolve(uploadsRoot, relativePath);
        if (localPath.startsWith(`${uploadsRoot}${sep}`) && existsSync(localPath) && statSync(localPath).isFile()) {
          const extension = extname(localPath).toLowerCase();
          response.statusCode = 200;
          response.setHeader("Content-Type", mediaMimeTypes[extension] || "application/octet-stream");
          response.setHeader("Content-Length", statSync(localPath).size);
          response.setHeader("Cache-Control", "no-cache");
          if (request.method === "HEAD") response.end();
          else createReadStream(localPath).pipe(response);
          return;
        }

        try {
          const upstream = await fetch(`${normalizedFallback}${url.pathname}${url.search}`, {
            method: request.method,
            signal: AbortSignal.timeout(15_000),
          });
          response.statusCode = upstream.status;
          for (const header of ["accept-ranges", "cache-control", "content-length", "content-range", "content-type", "etag", "last-modified"]) {
            const value = upstream.headers.get(header);
            if (value) response.setHeader(header, value);
          }
          if (request.method === "HEAD" || !upstream.body) response.end();
          else Readable.fromWeb(upstream.body as never).pipe(response);
        } catch {
          response.statusCode = 502;
          response.end("Media fallback unavailable");
        }
      });
    },
  };
}

function sourceFiles(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = resolve(path, entry.name);
    if (entry.isDirectory()) return sourceFiles(child);
    return /\.(vue|ts)$/.test(entry.name) ? [child] : [];
  });
}

function appIconsPlugin(): Plugin {
  return {
    name: "corner-used-icons",
    resolveId(id) {
      return id === virtualIcons ? resolvedVirtualIcons : undefined;
    },
    load(id) {
      if (id !== resolvedVirtualIcons) return undefined;
      const files = [
        resolve(root, "app.vue"),
        ...sourceFiles(resolve(root, "components")),
        ...sourceFiles(resolve(root, "layouts")),
        ...sourceFiles(resolve(root, "pages")),
        ...sourceFiles(resolve(root, "composables")),
        ...sourceFiles(resolve(root, "utils")),
      ];
      const names = new Set<string>();
      for (const file of files) {
        const source = readFileSync(file, "utf8");
        for (const match of source.matchAll(/(?:ph|solar):[a-z0-9-]+/g))
          names.add(match[0]);
      }

      const collections: Record<string, IconifyJSON> = {
        ph: JSON.parse(
          readFileSync(
            resolve(root, "node_modules/@iconify-json/ph/icons.json"),
            "utf8",
          ),
        ),
        solar: JSON.parse(
          readFileSync(
            resolve(root, "node_modules/@iconify-json/solar/icons.json"),
            "utf8",
          ),
        ),
      };
      const selected: Record<
        string,
        NonNullable<ReturnType<typeof getIconData>>
      > = {};
      for (const fullName of names) {
        const [prefix, name] = fullName.split(":");
        const collection = collections[prefix];
        if (!collection) continue;
        const data = getIconData(collection, name);
        if (data) selected[fullName] = data;
        const fillName = `${name}-fill`;
        const fillData = getIconData(collection, fillName);
        if (fillData) selected[`${prefix}:${fillName}`] = fillData;
      }
      return `export default ${JSON.stringify(selected)}`;
    },
  };
}

function pascalCase(value: string) {
  return value
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join("");
}

function autoComponentsPlugin(): Plugin {
  const readLocalComponents = () =>
    new Map(
      sourceFiles(resolve(root, "components")).map((file) => [
        file
          .split(/[\\/]/)
          .pop()!
          .replace(/\.vue$/, ""),
        file,
      ]),
    );
  return {
    name: "corner-auto-components",
    enforce: "pre",
    transform(source, id) {
      if (!id.endsWith(".vue")) return undefined;
      const setupTag = source.match(/<script\s+setup(?:\s[^>]*)?>/);
      if (!setupTag?.index) return undefined;
      const localComponents = readLocalComponents();

      const script = source.slice(
        setupTag.index + setupTag[0].length,
        source.indexOf("</script>", setupTag.index),
      );
      const imports: string[] = [];
      const seen = new Set<string>();
      // Scan the whole SFC: a regex bounded by the first </template> breaks as
      // soon as the template contains Vue's nested <template v-if/v-for> blocks.
      for (const match of source.matchAll(
        /<([A-Z][A-Za-z0-9]*|[a-z][a-z0-9]*(?:-[a-z0-9]+)+)\b/g,
      )) {
        const tag = match[1];
        let localName = tag.includes("-") ? pascalCase(tag) : tag;
        let statement = "";
        if (tag.startsWith("a-")) {
          const exported = pascalCase(tag.slice(2));
          localName = `A${exported}`;
          statement = `import { ${exported} as ${localName} } from 'ant-design-vue'`;
        } else if (/(?:Outlined|Filled|TwoTone)$/.test(tag)) {
          statement = `import { ${tag} } from '@ant-design/icons-vue'`;
        } else {
          const file = localComponents.get(localName);
          if (!file) continue;
          const projectPath = file.slice(root.length).replace(/\\/g, "/");
          statement = `import ${localName} from '@/${projectPath}'`;
        }
        const hasBinding = [
          new RegExp(`\\bimport\\s+${localName}\\b`),
          new RegExp(
            `\\bimport\\s*\\{[^}]*\\b(?:${localName}|\\w+\\s+as\\s+${localName})\\b[^}]*\\}`,
            "s",
          ),
          new RegExp(`\\b(?:const|let|var|function|class)\\s+${localName}\\b`),
          new RegExp(
            `\\b(?:const|let|var)\\s*\\{[^}]*\\b${localName}\\b[^}]*\\}`,
            "s",
          ),
        ].some((pattern) => pattern.test(script));
        if (seen.has(localName) || hasBinding) continue;
        seen.add(localName);
        imports.push(statement);
      }
      if (!imports.length) return undefined;
      const position = setupTag.index + setupTag[0].length;
      return `${source.slice(0, position)}\n${imports.join("\n")}\n${source.slice(position)}`;
    },
  };
}

export default defineConfig(({ mode }) => {
  const envRoot = resolve(root, "..");
  const env = loadEnv(mode, envRoot, "");
  return {
    envDir: envRoot,
    plugins: [
      devUploadsPlugin(env.VITE_MEDIA_FALLBACK_ORIGIN || "https://corner.ink"),
      appIconsPlugin(),
      autoComponentsPlugin(),
      vue(),
      Unimport.vite({
        imports: [
          ...[
            "computed",
            "defineAsyncComponent",
            "effectScope",
            "nextTick",
            "onBeforeUnmount",
            "onMounted",
            "onUnmounted",
            "onActivated",
            "onDeactivated",
            "reactive",
            "readonly",
            "ref",
            "shallowRef",
            "toRef",
            "toValue",
            "unref",
            "useAttrs",
            "useId",
            "useSlots",
            "watch",
            "watchEffect",
            "watchPostEffect",
          ].map((name) => ({ name, from: "vue" })),
          ...["useRoute", "useRouter"].map((name) => ({
            name,
            from: "vue-router",
          })),
          { name: "useHead", from: "@unhead/vue" },
          ...[
            "useSharedState",
            "useAppConfig",
            "routerNavigate",
          ].map((name) => ({ name, from: "@/runtime/spaRuntime" })),
        ],
        dirs: ["./composables", "./utils"],
        dts: false,
        include: [/\.[tj]sx?$/, /\.vue$/, /\.vue\?vue/],
      }),
    ],
    resolve: {
      alias: {
        "@": root,
      },
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY_TARGET || "http://localhost:4000",
          changeOrigin: true,
        },
        "/uploads": {
          target: env.VITE_API_PROXY_TARGET || "http://localhost:4000",
          changeOrigin: true,
        },
        "/rss.xml": {
          target: env.VITE_API_PROXY_TARGET || "http://localhost:4000",
          changeOrigin: true,
        },
      },
    },
    preview: { host: "0.0.0.0", port: 3000, strictPort: true },
    build: {
      target: "es2022",
      cssCodeSplit: true,
      sourcemap: false,
      reportCompressedSize: true,
      chunkSizeWarningLimit: 700,
    },
  };
});
