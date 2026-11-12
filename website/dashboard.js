const signInPanel = document.querySelector("#sign-in-panel");
const dashboard = document.querySelector("#dashboard-app");
const signInLink = document.querySelector("#sign-in-link");
const authMessage = document.querySelector("#auth-message");
const authSetupHelp = document.querySelector("#auth-setup-help");
const dashboardStatus = document.querySelector("#dashboard-status");

const request = async (path, options = {}) => {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The service returned an unreadable response.");
  }
  if (!response.ok) throw new Error(data.error || "The request could not be completed.");
  return data;
};

const showStatus = (message, isError = false) => {
  dashboardStatus.textContent = message;
  dashboardStatus.dataset.state = isError ? "error" : "success";
};

const cell = (value) => {
  const element = document.createElement("td");
  element.textContent = value == null ? "—" : String(value);
  return element;
};

const formatDate = (timestamp) => {
  if (!timestamp) return "—";
  return new Date(timestamp * 1000).toLocaleString();
};

const activityDescription = (item) => {
  const descriptions = {
    issued: "License created",
    revoked: "License revoked",
    expired: "License expired",
    game_registered: "Game registered",
    api_key_created: "Developer API key created",
    subscription_request: "Plan change requested",
  };
  return `${descriptions[item.type] || "Account activity"}${item.subject ? ` · ${item.subject}` : ""}`;
};

const loadDashboard = async () => {
  const [overview, games, licenses, apiKeys, subscription] = await Promise.all([
    request("/v2/dashboard/overview"),
    request("/v2/dashboard/games"),
    request("/v2/dashboard/licenses"),
    request("/v2/dashboard/api-keys"),
    request("/v2/dashboard/subscription"),
  ]);
  return { overview, games: games.games, licenses: licenses.licenses, apiKeys: apiKeys.apiKeys, subscription };
};

const renderAccount = (data) => {
  document.querySelector("#developer-greeting").textContent = `Welcome, ${data.overview.developer.displayName}`;
  document.querySelector("#account-name").textContent = data.overview.developer.displayName;
  document.querySelector("#account-discord").textContent = data.overview.developer.discordUserId;
  document.querySelector("#account-id").textContent = data.overview.developer.developerId;

  const usage = data.overview.usage;
  document.querySelector("#metric-plan").textContent = data.overview.subscription.plan;
  document.querySelector("#metric-subscription-status").textContent = data.overview.subscription.status;
  document.querySelector("#metric-games").textContent = String(usage.games);
  document.querySelector("#metric-games-detail").textContent = `${usage.approvedGames} approved · ${usage.pendingGames} pending`;
  document.querySelector("#metric-licenses").textContent = String(usage.activeLicenses);
  document.querySelector("#metric-licenses-detail").textContent = `${usage.licenses} total`;
  document.querySelector("#metric-validations").textContent = String(usage.validationsLast30Days);

  const activityList = document.querySelector("#activity-list");
  activityList.replaceChildren();
  for (const activity of data.overview.recentActivity) {
    const item = document.createElement("li");
    const description = document.createElement("span");
    const date = document.createElement("time");
    description.textContent = activityDescription(activity);
    date.textContent = formatDate(activity.occurredAt);
    item.append(description, date);
    activityList.append(item);
  }
  if (!data.overview.recentActivity.length) {
    const item = document.createElement("li");
    item.textContent = "No activity yet.";
    activityList.append(item);
  }
};

const renderApiKeys = (apiKeys) => {
  const list = document.querySelector("#api-key-list");
  list.replaceChildren();
  for (const key of apiKeys) {
    const item = document.createElement("li");
    item.textContent = `${key.id.slice(0, 8)} · created ${formatDate(key.createdAt)} · ${key.revokedAt ? "revoked" : "active"}`;
    list.append(item);
  }
  if (!apiKeys.length) {
    const item = document.createElement("li");
    item.textContent = "No developer API key has been issued from the dashboard yet.";
    list.append(item);
  }
};

const renderGames = (games) => {
  const list = document.querySelector("#game-list");
  const gameSelect = document.querySelector("#license-game-select");
  list.replaceChildren();
  gameSelect.replaceChildren(new Option("Select a game", ""));
  for (const game of games) {
    const row = document.createElement("tr");
    row.append(cell(game.name), cell(game.universeId), cell(game.status));
    list.append(row);
    if (game.status === "approved") gameSelect.add(new Option(`${game.name} (${game.universeId})`, game.universeId));
  }
  if (!games.length) {
    const row = document.createElement("tr");
    const empty = cell("No games registered.");
    empty.colSpan = 3;
    row.append(empty);
    list.append(row);
  }
};

const renderLicenses = (licenses) => {
  const list = document.querySelector("#license-list");
  const gameNames = new Map(
    [...document.querySelectorAll("#license-game-select option")]
      .filter((option) => option.value)
      .map((option) => [option.value, option.textContent])
  );
  list.replaceChildren();
  for (const license of licenses) {
    const row = document.createElement("tr");
    const status = license.status === "active" && license.expiresAt * 1000 <= Date.now()
      ? "expired"
      : license.status;
    row.append(
      cell(license.discordUserId),
      cell(gameNames.get(license.universeIds) || license.universeIds),
      cell(status),
      cell(formatDate(license.expiresAt)),
      cell(`${license.validationCount} · ${formatDate(license.lastUsedAt)}`)
    );
    const actions = document.createElement("td");
    if (status === "active") {
      const revoke = document.createElement("button");
      revoke.type = "button";
      revoke.className = "table-action";
      revoke.dataset.revokeLicense = license.id;
      revoke.textContent = "Revoke";
      actions.append(revoke);
    }
    const history = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "History";
    const historyList = document.createElement("ul");
    historyList.className = "history-list";
    history.append(summary, historyList);
    history.addEventListener("toggle", async () => {
      if (!history.open || history.dataset.loaded) return;
      try {
        const data = await request(`/v2/dashboard/licenses/${encodeURIComponent(license.id)}/history`);
        historyList.replaceChildren();
        const entries = [
          ...data.events.map((entry) => ({
            timestamp: entry.occurredAt,
            text: `${activityDescription(entry)} · ${formatDate(entry.occurredAt)}`,
          })),
          ...data.history.map((entry) => ({
            timestamp: entry.lastValidatedAt,
            text: `${entry.date} · ${entry.validationCount} validations · last ${formatDate(entry.lastValidatedAt)}`,
          })),
        ].sort((first, second) => second.timestamp - first.timestamp);
        for (const entry of entries) {
          const item = document.createElement("li");
          item.textContent = entry.text;
          historyList.append(item);
        }
        if (!entries.length) {
          const item = document.createElement("li");
          item.textContent = "No successful validations recorded.";
          historyList.append(item);
        }
        history.dataset.loaded = "true";
      } catch (error) {
        showStatus(error.message, true);
      }
    });
    actions.append(history);
    row.append(actions);
    list.append(row);
  }
  if (!licenses.length) {
    const row = document.createElement("tr");
    const empty = cell("No licenses issued yet.");
    empty.colSpan = 6;
    row.append(empty);
    list.append(row);
  }
};

const renderSubscription = (data) => {
  const current = data.subscription;
  const planSelect = document.querySelector("#plan-select");
  const billingPeriodSelect = document.querySelector("#billing-period");
  const cancelSubscriptionButton = document.querySelector("#request-subscription-cancel");
  document.querySelector("#subscription-summary").textContent =
    `${current.plan} plan · ${current.status} · ${current.billingPeriod} billing. Paid plans are not available for purchase.`;
  planSelect.value = current.plan;
  billingPeriodSelect.value = current.billingPeriod;
  billingPeriodSelect.disabled = current.plan === "free";
  cancelSubscriptionButton.hidden = current.plan === "free" || current.status !== "active";
  const request = data.pendingRequest;
  const pendingText = document.querySelector("#pending-subscription-request");
  const cancelButton = document.querySelector("#cancel-subscription-request");
  pendingText.hidden = !request;
  cancelButton.hidden = !request;
  if (request) {
    pendingText.textContent = `Pending request: ${request.requestedPlan} (${request.billingPeriod}). Your current plan remains ${current.plan}.`;
    cancelButton.dataset.requestId = request.id;
  }
};

const refresh = async () => {
  const data = await loadDashboard();
  renderAccount(data);
  renderApiKeys(data.apiKeys);
  renderGames(data.games);
  renderLicenses(data.licenses);
  renderSubscription(data.subscription);
};

const showOneTimeSecret = (element, label, secret) => {
  element.replaceChildren();
  const warning = document.createElement("strong");
  warning.textContent = `${label} (shown once): `;
  const value = document.createElement("code");
  value.textContent = secret;
  element.append(warning, value);
  element.hidden = false;
};

const initialize = async () => {
  const result = new URLSearchParams(window.location.search).get("auth");
  if (result === "failed" || result === "cancelled" || result === "unavailable") {
    authMessage.textContent = result === "cancelled"
      ? "Discord sign-in was cancelled."
      : "Sign-in could not be completed. Try again or contact support.";
    window.history.replaceState({}, "", window.location.pathname);
  }
  try {
    const status = await request("/v2/auth/status");
    if (status.discordSignInAvailable) {
      signInLink.hidden = false;
      authMessage.textContent = "Sign in with Discord to open your developer workspace.";
    } else {
      authSetupHelp.hidden = false;
      authMessage.textContent = "Sign-in is not configured for this deployment.";
    }
    const session = await request("/v2/auth/session");
    signInPanel.hidden = true;
    dashboard.hidden = false;
    document.querySelector("#developer-greeting").textContent = `Welcome, ${session.developer.displayName}`;
    await refresh();
  } catch (error) {
    if (error.message !== "Authentication required") authMessage.textContent = error.message;
    signInPanel.hidden = false;
  }
};

document.querySelector("#logout-button").addEventListener("click", async () => {
  try {
    await request("/v2/auth/logout", { method: "POST" });
    window.location.reload();
  } catch (error) {
    showStatus(error.message, true);
  }
});

document.querySelector("#rotate-api-key").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    const data = await request("/v2/dashboard/api-keys/rotate", { method: "POST", body: "{}" });
    showOneTimeSecret(document.querySelector("#api-key-result"), "New developer API key", data.apiKey);
    showStatus("The previous developer API keys were revoked.");
    await refresh();
  } catch (error) {
    showStatus(error.message, true);
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#game-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = new FormData(form);
  try {
    await request("/v2/dashboard/games", {
      method: "POST",
      body: JSON.stringify({ name: values.get("name"), universeId: values.get("universeId") }),
    });
    form.reset();
    showStatus("Game registered. It remains pending until approved.");
    await refresh();
  } catch (error) {
    showStatus(error.message, true);
  }
});

document.querySelector("#license-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = new FormData(form);
  try {
    const data = await request("/v2/dashboard/licenses", {
      method: "POST",
      body: JSON.stringify({
        discordUserId: values.get("discordUserId"),
        universeId: values.get("universeId"),
        expiresInHours: Number(values.get("expiresInHours")),
      }),
    });
    showOneTimeSecret(document.querySelector("#license-result"), "New license key", data.key);
    showStatus("License created. Save the key now; it cannot be retrieved again.");
    form.reset();
    await refresh();
  } catch (error) {
    showStatus(error.message, true);
  }
});

document.querySelector("#license-list").addEventListener("click", async (event) => {
  const licenseId = event.target.dataset.revokeLicense;
  if (!licenseId) return;
  event.target.disabled = true;
  try {
    const data = await request(`/v2/dashboard/licenses/${encodeURIComponent(licenseId)}/revoke`, {
      method: "POST",
      body: "{}",
    });
    showStatus(data.revoked ? "License revoked." : "License was already inactive.");
    await refresh();
  } catch (error) {
    showStatus(error.message, true);
    event.target.disabled = false;
  }
});

document.querySelector("#subscription-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const values = new FormData(event.currentTarget);
  try {
    const data = await request("/v2/dashboard/subscription/change", {
      method: "POST",
      body: JSON.stringify({ plan: values.get("plan"), billingPeriod: values.get("billingPeriod") }),
    });
    showStatus(data.message);
    await refresh();
  } catch (error) {
    showStatus(error.message, true);
  }
});

document.querySelector("#plan-select").addEventListener("change", (event) => {
  const billingPeriod = document.querySelector("#billing-period");
  billingPeriod.disabled = event.currentTarget.value === "free";
  if (billingPeriod.disabled) billingPeriod.value = "none";
  else if (billingPeriod.value === "none") billingPeriod.value = "monthly";
});

document.querySelector("#cancel-subscription-request").addEventListener("click", async (event) => {
  try {
    const data = await request("/v2/dashboard/subscription/change/cancel", {
      method: "POST",
      body: JSON.stringify({ requestId: event.currentTarget.dataset.requestId }),
    });
    showStatus(data.canceled ? "Pending plan request canceled." : "No pending request was found.");
    await refresh();
  } catch (error) {
    showStatus(error.message, true);
  }
});

document.querySelector("#request-subscription-cancel").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    const data = await request("/v2/dashboard/subscription/cancel", {
      method: "POST",
      body: "{}",
    });
    showStatus(data.message);
    await refresh();
  } catch (error) {
    showStatus(error.message, true);
  } finally {
    button.disabled = false;
  }
});

initialize();
