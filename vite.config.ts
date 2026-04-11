import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// In dev: handle /api/presign and POST /api/chat inside Vite first (before proxy).
// OpenRouter key (sk-or-*) is used in server/chat.mjs.
function devApiPlugin() {
  return {
    name: "dev-api",
    enforce: "pre",
    configureServer(server) {
      const handleApi = (req, res, next) => {
        const pathname = (() => {
          const u = req.url || "/";
          try {
            return new URL(u, "http://localhost").pathname;
          } catch {
            return u.split("?")[0] || "/";
          }
        })();
        const isApi = pathname.startsWith("/api/");

        if (!isApi) {
          next();
          return;
        }

        // POST /api/upload-presign – must be before GET presign (both contain "presign")
        if ((req.method || "").toUpperCase() === "POST" && pathname === "/api/upload-presign") {
          const chunks = [];
          req.on("data", (chunk) => chunks.push(chunk));
          req.on("error", () => {
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Request body error" }));
            }
          });
          req.on("end", () => {
            let body = "";
            try {
              body = Buffer.concat(chunks).toString("utf8") || "{}";
            } catch {
              body = "{}";
            }
            (async () => {
              try {
                const { getUploadPresignedUrl } = await import("./server/presign.mjs");
                const data = JSON.parse(body);
                const { uploadUrl, fileUrl } = await getUploadPresignedUrl({
                  branchCode: data.branchCode,
                  category: data.category,
                  fileName: data.fileName,
                  contentType: data.contentType,
                });
                if (!res.headersSent) {
                  res.statusCode = 200;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ uploadUrl, fileUrl }));
                }
              } catch (e) {
                console.error("[api/upload-presign]", e);
                if (!res.headersSent) {
                  res.statusCode = 500;
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      error: (e && (e.message || e.code)) || "Upload presign failed.",
                    })
                  );
                }
              }
            })();
          });
          return;
        }

        // POST /api/book-session – handle first so proxy doesn't get it
        if ((req.method || "").toUpperCase() === "POST" && pathname.includes("book-session")) {
          const chunks = [];
          req.on("data", (chunk) => chunks.push(chunk));
          req.on("error", () => {
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Request body error" }));
            }
          });
          req.on("end", () => {
            let body = "";
            try {
              body = Buffer.concat(chunks).toString("utf8") || "{}";
            } catch {
              body = "{}";
            }
            (async () => {
              try {
                const { handleBookSession } = await import("./server/book-session.mjs");
                const out = await handleBookSession(body);
                if (!res.headersSent) {
                  res.statusCode = out.statusCode;
                  res.setHeader("Content-Type", "application/json");
                  res.end(out.body);
                }
              } catch (e) {
                console.error("[api/book-session]", e);
                if (!res.headersSent) {
                  res.statusCode = 500;
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({ error: (e && (e.message || e.code)) || "Could not send request." })
                  );
                }
              }
            })();
          });
          return;
        }

        // GET /api/presign?url=... (exact path so upload-presign is not matched)
        if (req.method === "GET" && (pathname === "/api/presign" || pathname.startsWith("/api/presign?"))) {
          const rawUrl = new URL(req.url || "", "http://localhost").searchParams.get("url");
          if (!rawUrl) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Missing url query" }));
            return;
          }
          (async () => {
            try {
              const { getPresignedUrl } = await import("./server/presign.mjs");
              const { url } = await getPresignedUrl(rawUrl);
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ url }));
            } catch (e) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: String(e?.message || e) }));
            }
          })();
          return;
        }

        // POST /api/chat – never throw; always send JSON so server never crashes
        if (req.method === "POST" && pathname.includes("chat")) {
          const chunks = [];
          req.on("data", (chunk) => chunks.push(chunk));
          req.on("error", () => {
            if (!res.headersSent) {
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ content: null, error: "Request body error" }));
            }
          });
          req.on("end", () => {
            let body = "";
            try {
              body = Buffer.concat(chunks).toString("utf8") || "{}";
            } catch {
              body = "{}";
            }
            (async () => {
              try {
                const { handleChat } = await import("./server/chat.mjs");
                const out = await handleChat(body);
                if (!res.headersSent) {
                  res.statusCode = out.statusCode;
                  res.setHeader("Content-Type", "application/json");
                  res.end(out.body);
                }
              } catch (e) {
                console.error("[api/chat]", e);
                if (!res.headersSent) {
                  res.statusCode = 200;
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      content: null,
                      error: (e && (e.message || e.code)) || "Chat failed. Try again.",
                    })
                  );
                }
              }
            })();
          });
          return;
        }

        // POST /api/run-code – run Python on server (also handled by api.mjs when dev:api runs)
        if (req.method === "POST" && pathname.includes("run-code")) {
          const chunks = [];
          req.on("data", (chunk) => chunks.push(chunk));
          req.on("error", () => {
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Request body error" }));
            }
          });
          req.on("end", () => {
            let body = "";
            try {
              body = Buffer.concat(chunks).toString("utf8") || "{}";
            } catch {
              body = "{}";
            }
            (async () => {
              try {
                const { handleRunCode } = await import("./server/run-code.mjs");
                const out = await handleRunCode(body);
                if (!res.headersSent) {
                  res.statusCode = out.statusCode;
                  res.setHeader("Content-Type", "application/json");
                  res.end(out.body);
                }
              } catch (e) {
                console.error("[api/run-code]", e);
                if (!res.headersSent) {
                  res.statusCode = 500;
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      error: (e && (e.message || e.code)) || "Run code failed.",
                    })
                  );
                }
              }
            })();
          });
          return;
        }

        next();
      };
      // Run after other middlewares so we can prepend and run before proxy
      return () => {
        server.middlewares.stack.unshift({ route: "/", handle: handleApi });
      };
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "localhost",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  plugins: [devApiPlugin(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
