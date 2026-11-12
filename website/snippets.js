"use strict";

const starterSnippets = [
  { id: "js-fetch-json", title: "Fetch JSON with error handling", language: "JavaScript", tags: ["fetch", "http", "api", "async"], description: "Request JSON and handle non-success HTTP responses.", code: `async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("HTTP " + response.status);
  return response.json();
}` },
  { id: "python-json", title: "Read a JSON file", language: "Python", tags: ["json", "file", "data"], description: "Load UTF-8 JSON data using Python's standard library.", code: `import json
from pathlib import Path

data = json.loads(Path("config.json").read_text(encoding="utf-8"))
print(data)` },
  { id: "lua-table", title: "Loop through a Lua table", language: "Lua", tags: ["table", "loop", "basics"], description: "Iterate over key/value pairs in a Lua table.", code: `local settings = {
    volume = 0.8,
    enabled = true
}

for key, value in pairs(settings) do
    print(key, value)
end` },
  { id: "roblox-server-event", title: "Validate a RemoteEvent on the server", language: "Roblox Lua", tags: ["roblox", "remoteevent", "server", "security"], description: "Keep important checks on the server and validate incoming arguments.", code: `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local remote = ReplicatedStorage:WaitForChild("RequestAction")

remote.OnServerEvent:Connect(function(player, action)
    if typeof(action) ~= "string" then return end
    if action ~= "OpenMenu" then return end
    print(("Accepted request from %s"):format(player.Name))
end)` },
  { id: "html-landmark", title: "Accessible page structure", language: "HTML", tags: ["html", "accessibility", "semantic"], description: "Use semantic landmarks and a clear page heading.", code: `<main id="main">
  <section aria-labelledby="page-title">
    <h1 id="page-title">Page title</h1>
    <p>Describe the page content here.</p>
  </section>
</main>` },
  { id: "css-card", title: "Responsive card grid", language: "CSS", tags: ["css", "grid", "responsive", "layout"], description: "Create a grid that adapts to the available width.", code: `.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 1rem;
}` },
  { id: "discordjs-command", title: "Discord.js slash command reply", language: "Discord.js", tags: ["discord", "bot", "slash command"], description: "Reply privately to a slash command interaction.", code: `client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "ping") return;
  await interaction.reply({ content: "Pong!", ephemeral: true });
});` }
];

const STORAGE_KEY = "zervxhub.studio.workspace.v1";
const MAX_CODE_LENGTH = 100000;
const MAX_LIBRARY_SIZE = 1000000;
const $ = selector => document.querySelector(selector);
const grid = $("#snippet-grid");
const status = $("#copy-status");
const editorStatus = $("#editor-status");
const output = $("#run-output");
const savedList = $("#saved-code-list");
const state = { files: [], games: [], selectedId: null, activeWorker: null, runTimer: null };

function makeId() {
  return globalThis.crypto?.randomUUID?.() || "code-" + Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function setStatus(message, error = false) {
  editorStatus.textContent = message;
  editorStatus.dataset.state = error ? "error" : "ok";
}
function loadWorkspace() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    if (raw.length > MAX_LIBRARY_SIZE) throw new Error("Workspace is too large.");
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.files) || !Array.isArray(data.games)) throw new Error("Invalid workspace format.");
    state.games = data.games.filter(game => typeof game === "string" && game.length <= 60).slice(0, 100);
    state.files = data.files.filter(file => isValidFile(file)).slice(0, 200);
  } catch {
    setStatus("Could not read the saved workspace. Export/import backups are recommended.", true);
  }
}
function isValidFile(file) {
  return file && typeof file.id === "string" && typeof file.title === "string" &&
    typeof file.language === "string" && typeof file.code === "string" &&
    file.title.length <= 80 && file.code.length <= MAX_CODE_LENGTH &&
    (file.game === "" || (typeof file.game === "string" && file.game.length <= 60)) &&
    Array.isArray(file.versions);
}
function persistWorkspace() {
  try {
    const serialized = JSON.stringify({ version: 1, games: state.games, files: state.files });
    if (serialized.length > MAX_LIBRARY_SIZE) throw new Error("Workspace reached its 1 MB safety limit. Export a backup and remove unused files.");
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (error) {
    setStatus(error.message || "Browser storage is unavailable. Export your code before leaving.", true);
    return false;
  }
}
function renderGameOptions() {
  const editorValue = $("#code-game").value;
  const filterValue = $("#saved-game-filter").value || "all";
  $("#code-game").replaceChildren(new Option("Unassigned", ""));
  $("#saved-game-filter").replaceChildren(new Option("All games and projects", "all"));
  for (const game of state.games) {
    $("#code-game").add(new Option(game, game));
    $("#saved-game-filter").add(new Option(game, game));
  }
  $("#code-game").value = state.games.includes(editorValue) ? editorValue : "";
  $("#saved-game-filter").value = state.games.includes(filterValue) ? filterValue : "all";
}
function clearEditor() {
  state.selectedId = null;
  $("#code-title").value = "";
  $("#code-language").value = "JavaScript";
  $("#code-game").value = "";
  $("#code-editor").value = "";
  $("#delete-code").disabled = true;
  renderVersionHistory(null);
}
function selectFile(file) {
  state.selectedId = file.id;
  $("#code-title").value = file.title;
  $("#code-language").value = file.language;
  $("#code-game").value = file.game || "";
  $("#code-editor").value = file.code;
  $("#delete-code").disabled = false;
  renderVersionHistory(file);
  renderSavedFiles();
  setStatus("Loaded " + file.title + ".");
}
function renderVersionHistory(file) {
  const select = $("#version-select");
  select.replaceChildren(new Option(file?.versions?.length ? "Choose a saved version" : "No previous versions", ""));
  for (let index = 0; index < (file?.versions?.length || 0); index++) {
    const version = file.versions[index];
    select.add(new Option(new Date(version.savedAt).toLocaleString(), String(index)));
  }
  select.disabled = !file?.versions?.length;
  $("#restore-version").disabled = !file?.versions?.length;
}
function renderSavedFiles() {
  const query = $("#saved-search").value.trim().toLowerCase();
  const game = $("#saved-game-filter").value;
  const files = state.files.filter(file => (game === "all" || file.game === game) &&
    [file.title, file.language, file.game, file.code].join(" ").toLowerCase().includes(query));
  savedList.replaceChildren();
  if (!files.length) {
    const empty = document.createElement("p");
    empty.className = "studio-empty";
    empty.textContent = state.files.length ? "No saved files match this filter." : "No saved files yet. Start a new file or save a starter snippet.";
    savedList.append(empty);
  }
  for (const file of files) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "saved-code-item" + (file.id === state.selectedId ? " is-active" : "");
    const title = document.createElement("strong");
    title.textContent = file.title;
    const meta = document.createElement("span");
    meta.textContent = file.language + " · " + (file.game || "Unassigned");
    button.append(title, meta);
    button.addEventListener("click", () => selectFile(file));
    savedList.append(button);
  }
  $("#saved-count").textContent = files.length + " of " + state.files.length + " saved files";
}
function saveCurrentFile() {
  const title = $("#code-title").value.trim();
  const language = $("#code-language").value;
  const game = $("#code-game").value;
  const code = $("#code-editor").value;
  if (!title) return setStatus("Give this file a name before saving.", true);
  if (!code.trim()) return setStatus("Add some code before saving.", true);
  if (code.length > MAX_CODE_LENGTH) return setStatus("This file is too large (100,000 characters max).", true);
  const existing = state.files.find(file => file.id === state.selectedId);
  if (!existing && state.files.length >= 200) return setStatus("Workspace file limit reached. Export a backup first.", true);
  const versions = existing ? [{ title: existing.title, language: existing.language, game: existing.game, code: existing.code, savedAt: new Date().toISOString() }, ...existing.versions].slice(0, 10) : [];
  const file = { id: existing?.id || makeId(), title, language, game, code, updatedAt: new Date().toISOString(), versions };
  if (existing) state.files = state.files.map(item => item.id === existing.id ? file : item);
  else state.files.unshift(file);
  state.selectedId = file.id;
  if (!persistWorkspace()) return;
  renderSavedFiles();
  renderVersionHistory(file);
  $("#delete-code").disabled = false;
  setStatus("Saved locally: " + title + ". Export a backup to move it to another device.");
}
function deleteCurrentFile() {
  const file = state.files.find(item => item.id === state.selectedId);
  if (!file || !window.confirm("Delete " + file.title + " and its saved versions?")) return;
  state.files = state.files.filter(item => item.id !== file.id);
  persistWorkspace();
  clearEditor();
  renderSavedFiles();
  setStatus("Deleted " + file.title + ".");
}
function addGame() {
  const input = $("#new-game");
  const game = input.value.trim();
  if (!game) return setStatus("Enter a game or project name first.", true);
  if (state.games.some(item => item.toLowerCase() === game.toLowerCase())) return setStatus("That game or project already exists.", true);
  if (state.games.length >= 100) return setStatus("Game/project limit reached.", true);
  state.games.push(game);
  if (!persistWorkspace()) return;
  renderGameOptions();
  $("#code-game").value = game;
  input.value = "";
  setStatus("Added project: " + game + ".");
}
function loadSnippet(snippet) {
  clearEditor();
  $("#code-title").value = snippet.title;
  $("#code-language").value = snippet.language;
  $("#code-editor").value = snippet.code;
  $("#code-editor").focus();
  setStatus("Template loaded. Choose a game and save your own copy.");
  document.querySelector(".studio-editor").scrollIntoView({ behavior: "smooth", block: "start" });
}
function createSnippetCard(snippet) {
  const article = document.createElement("article");
  article.className = "snippet-card";
  const header = document.createElement("div");
  header.className = "snippet-card-header";
  const meta = document.createElement("div");
  const language = document.createElement("span");
  language.className = "snippet-language";
  language.textContent = snippet.language;
  const title = document.createElement("h3");
  title.textContent = snippet.title;
  meta.append(language, title);
  const load = document.createElement("button");
  load.type = "button";
  load.className = "button button-small button-outline";
  load.textContent = "Use template";
  load.addEventListener("click", () => loadSnippet(snippet));
  header.append(meta, load);
  const description = document.createElement("p");
  description.className = "snippet-description";
  description.textContent = snippet.description;
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.textContent = snippet.code;
  pre.append(code);
  const tags = document.createElement("p");
  tags.className = "snippet-tags";
  tags.textContent = snippet.tags.map(tag => "#" + tag).join("  ");
  article.append(header, description, pre, tags);
  return article;
}
function renderSnippets() {
  const query = $("#snippet-search").value.trim().toLowerCase();
  const language = $("#snippet-language").value;
  const filtered = starterSnippets.filter(snippet => (language === "all" || snippet.language === language) &&
    [snippet.title, snippet.language, snippet.description, ...snippet.tags, snippet.code].join(" ").toLowerCase().includes(query));
  grid.replaceChildren();
  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "studio-empty";
    empty.textContent = "No examples match those filters.";
    grid.append(empty);
  } else {
    filtered.forEach(snippet => grid.append(createSnippetCard(snippet)));
  }
  $("#snippet-count").textContent = filtered.length + " of " + starterSnippets.length + " examples";
}
async function copyText(text, label) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(text);
    status.textContent = "Copied " + label + ".";
  } catch {
    status.textContent = "Clipboard unavailable here. Select the code in the editor and copy it manually.";
  }
}
function exportWorkspace() {
  const backup = JSON.stringify({ app: "ZervxHub Developer Studio", version: 1, exportedAt: new Date().toISOString(), games: state.games, files: state.files }, null, 2);
  const url = URL.createObjectURL(new Blob([backup], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "zervxhub-studio-backup.json";
  link.click();
  URL.revokeObjectURL(url);
  setStatus("Workspace backup exported.");
}
async function importWorkspace(file) {
  if (!file || file.size > MAX_LIBRARY_SIZE) return setStatus("Backup must be smaller than 1 MB.", true);
  try {
    const data = JSON.parse(await file.text());
    if (!data || !Array.isArray(data.files) || !Array.isArray(data.games)) throw new Error("This is not a ZervxHub workspace backup.");
    const importedFiles = data.files.filter(isValidFile).slice(0, 200);
    const importedGames = data.games.filter(game => typeof game === "string" && game.length <= 60).slice(0, 100);
    const combined = new Map(state.files.map(item => [item.id, item]));
    for (const item of importedFiles) combined.set(item.id, item);
    state.files = Array.from(combined.values()).slice(0, 200);
    state.games = Array.from(new Set([...state.games, ...importedGames])).slice(0, 100);
    if (!persistWorkspace()) return;
    renderGameOptions();
    renderSavedFiles();
    setStatus("Imported " + importedFiles.length + " code files. Review imported code before running it.");
  } catch (error) {
    setStatus(error.message || "Could not import this backup.", true);
  }
}
function stopRun(message = "Execution stopped.") {
  if (state.runTimer) window.clearTimeout(state.runTimer);
  state.runTimer = null;
  if (state.activeWorker) state.activeWorker.terminate();
  state.activeWorker = null;
  $("#stop-code").disabled = true;
  setStatus(message);
}
function runJavaScript() {
  if ($("#code-language").value !== "JavaScript") {
    return setStatus("The built-in runner supports plain JavaScript only. Use Python/Lua runtimes or Roblox Studio for those languages.", true);
  }
  const source = $("#code-editor").value;
  if (!source.trim()) return setStatus("Write or load JavaScript before running it.", true);
  if (source.length > MAX_CODE_LENGTH) return setStatus("Code is too large to run.", true);
  stopRun("Starting isolated JavaScript worker…");
  output.textContent = "";
  let outputLineCount = 0;
  const workerSource = `
    const send = (type, value) => self.postMessage({ type, value: String(value).slice(0, 4000) });
    const format = value => {
      try { return typeof value === "string" ? value : JSON.stringify(value); }
      catch { return String(value); }
    };
    for (const method of ["log", "info", "warn", "error"]) {
      console[method] = (...args) => send("console-" + method, args.map(format).join(" "));
    }
    self.onerror = event => send("fatal", event.message || "Script error");
    (async () => {
      try {
        await (async () => { ${source.replace(/<\/script/gi, "<\\/script")} })();
        send("done", "Execution finished.");
      } catch (error) {
        send("fatal", error && error.stack ? error.stack : String(error));
      }
    })();
  `;
  try {
    const blobUrl = URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));
    const worker = new Worker(blobUrl);
    state.activeWorker = worker;
    $("#stop-code").disabled = false;
    setStatus("Running in a temporary worker (2.5 second limit).");
    worker.onmessage = event => {
      if (outputLineCount >= 200) {
        if (outputLineCount === 200) {
          const limit = document.createElement("div");
          limit.textContent = "Output limit reached (200 lines).";
          output.append(limit);
          outputLineCount++;
        }
        return;
      }
      outputLineCount++;
      const line = document.createElement("div");
      line.textContent = event.data.value;
      line.className = event.data.type === "fatal" ? "console-error" : event.data.type;
      output.append(line);
      if (event.data.type === "done") stopRun("Execution completed.");
      if (event.data.type === "fatal") stopRun("Execution failed.");
    };
    worker.onerror = event => {
      const line = document.createElement("div");
      line.textContent = event.message || "Worker failed.";
      line.className = "console-error";
      output.append(line);
      stopRun("Execution failed.");
    };
    state.runTimer = window.setTimeout(() => stopRun("Stopped: execution exceeded 2.5 seconds."), 2500);
    worker.addEventListener("message", () => {
      if (state.activeWorker === worker && state.runTimer) {
        // The timer is intentionally retained until completion or timeout.
      }
    });
    worker.addEventListener("messageerror", () => stopRun("Could not read worker output."));
    URL.revokeObjectURL(blobUrl);
  } catch {
    stopRun("This browser does not support the isolated JavaScript runner.");
  }
}
function restoreVersion() {
  const file = state.files.find(item => item.id === state.selectedId);
  const version = file?.versions?.[Number($("#version-select").value)];
  if (!version) return;
  if (!window.confirm("Load this older version into the editor? Save it to keep it as the current version.")) return;
  $("#code-title").value = version.title;
  $("#code-language").value = version.language;
  $("#code-game").value = version.game || "";
  $("#code-editor").value = version.code;
  setStatus("Older version loaded into the editor. Save to make it current.");
}
function init() {
  loadWorkspace();
  renderGameOptions();
  renderSavedFiles();
  renderSnippets();
  $("#new-code").addEventListener("click", () => { clearEditor(); $("#code-title").focus(); });
  $("#save-code").addEventListener("click", saveCurrentFile);
  $("#delete-code").addEventListener("click", deleteCurrentFile);
  $("#add-game").addEventListener("click", addGame);
  $("#saved-search").addEventListener("input", renderSavedFiles);
  $("#saved-game-filter").addEventListener("change", renderSavedFiles);
  $("#snippet-search").addEventListener("input", renderSnippets);
  $("#snippet-language").addEventListener("change", renderSnippets);
  $("#export-library").addEventListener("click", exportWorkspace);
  $("#import-library").addEventListener("click", () => $("#import-file").click());
  $("#import-file").addEventListener("change", event => { importWorkspace(event.target.files[0]); event.target.value = ""; });
  $("#run-code").addEventListener("click", runJavaScript);
  $("#stop-code").addEventListener("click", () => stopRun());
  $("#clear-output").addEventListener("click", () => { output.textContent = ""; });
  $("#restore-version").addEventListener("click", restoreVersion);
  window.addEventListener("beforeunload", () => { if (state.activeWorker) state.activeWorker.terminate(); });
}
init();
