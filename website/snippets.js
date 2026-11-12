"use strict";

const snippets = [
  {
    id: "js-fetch-json",
    title: "Fetch JSON with error handling",
    language: "JavaScript",
    tags: ["fetch", "http", "api", "async"],
    description: "Request JSON and handle non-success HTTP responses.",
    code: `async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}`
  },
  {
    id: "python-json",
    title: "Read a JSON file",
    language: "Python",
    tags: ["json", "file", "data"],
    description: "Load UTF-8 JSON data using Python's standard library.",
    code: `import json
from pathlib import Path

data = json.loads(Path("config.json").read_text(encoding="utf-8"))
print(data)`
  },
  {
    id: "lua-table",
    title: "Loop through a Lua table",
    language: "Lua",
    tags: ["table", "loop", "basics"],
    description: "Iterate over key/value pairs in a Lua table.",
    code: `local settings = {
    volume = 0.8,
    enabled = true
}

for key, value in pairs(settings) do
    print(key, value)
end`
  },
  {
    id: "roblox-server-event",
    title: "Validate a RemoteEvent on the server",
    language: "Roblox Lua",
    tags: ["roblox", "remoteevent", "server", "security"],
    description: "Keep important checks on the server and validate incoming arguments.",
    code: `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local remote = ReplicatedStorage:WaitForChild("RequestAction")

remote.OnServerEvent:Connect(function(player, action)
    if typeof(action) ~= "string" then
        return
    end

    if action ~= "OpenMenu" then
        return
    end

    print(("Accepted request from %s"):format(player.Name))
end)`
  },
  {
    id: "html-landmark",
    title: "Accessible page structure",
    language: "HTML",
    tags: ["html", "accessibility", "semantic"],
    description: "Use semantic landmarks and a clear page heading.",
    code: `<main id="main">
  <section aria-labelledby="page-title">
    <h1 id="page-title">Page title</h1>
    <p>Describe the page content here.</p>
  </section>
</main>`
  },
  {
    id: "css-card",
    title: "Responsive card grid",
    language: "CSS",
    tags: ["css", "grid", "responsive", "layout"],
    description: "Create a grid that adapts to the available width.",
    code: `.card-grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(100%, 240px), 1fr)
  );
  gap: 1rem;
}`
  },
  {
    id: "discordjs-command",
    title: "Discord.js slash command reply",
    language: "Discord.js",
    tags: ["discord", "bot", "slash command"],
    description: "Reply privately to a slash command interaction.",
    code: `client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "ping") return;

  await interaction.reply({
    content: "Pong!",
    ephemeral: true
  });
});`
  }
];

const grid = document.querySelector("#snippet-grid");
const searchInput = document.querySelector("#snippet-search");
const languageSelect = document.querySelector("#snippet-language");
const count = document.querySelector("#snippet-count");
const status = document.querySelector("#copy-status");

function createSnippetCard(snippet) {
  const article = document.createElement("article");
  article.className = "snippet-card";

  const header = document.createElement("div");
  header.className = "snippet-card-header";

  const meta = document.createElement("div");
  const language = document.createElement("span");
  language.className = "snippet-language";
  language.textContent = snippet.language;
  const title = document.createElement("h2");
  title.textContent = snippet.title;
  meta.append(language, title);

  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "button button-small button-outline";
  copy.textContent = "Copy code";
  copy.setAttribute("aria-label", `Copy ${snippet.title} code`);
  copy.addEventListener("click", () => copySnippet(snippet, copy));
  header.append(meta, copy);

  const description = document.createElement("p");
  description.className = "snippet-description";
  description.textContent = snippet.description;

  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.textContent = snippet.code;
  pre.append(code);

  const tags = document.createElement("p");
  tags.className = "snippet-tags";
  tags.textContent = snippet.tags.map(tag => `#${tag}`).join("  ");

  article.append(header, description, pre, tags);
  return article;
}

async function copySnippet(snippet, button) {
  try {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
      throw new Error("Clipboard access is unavailable in this browser context.");
    }
    await navigator.clipboard.writeText(snippet.code);
    status.textContent = `Copied: ${snippet.title}`;
    button.textContent = "Copied";
    window.setTimeout(() => { button.textContent = "Copy code"; }, 1400);
  } catch {
    status.textContent = "Could not access the clipboard. Select the code and copy it manually.";
  }
}

function renderSnippets() {
  const query = searchInput.value.trim().toLowerCase();
  const language = languageSelect.value;
  const filtered = snippets.filter(snippet => {
    const matchesLanguage = language === "all" || snippet.language === language;
    const searchable = [
      snippet.title,
      snippet.language,
      snippet.description,
      ...snippet.tags,
      snippet.code
    ].join(" ").toLowerCase();
    return matchesLanguage && searchable.includes(query);
  });

  grid.replaceChildren();
  if (filtered.length === 0) {
    const empty = document.createElement("p");
    empty.className = "studio-empty";
    empty.textContent = "No snippets match those filters. Try another search.";
    grid.append(empty);
  } else {
    for (const snippet of filtered) grid.append(createSnippetCard(snippet));
  }
  count.textContent = `${filtered.length} of ${snippets.length} snippets`;
}

searchInput.addEventListener("input", renderSnippets);
languageSelect.addEventListener("change", renderSnippets);
renderSnippets();
