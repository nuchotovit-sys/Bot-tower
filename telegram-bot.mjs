// Telegram bot for "Башня" (Tower) — sends /start reply with an "Open App" button
// that opens the game as a Telegram Web App (Mini App).
//
// Requirements: Node.js 18+ (uses global fetch). No npm packages needed.
//
// Setup:
//   1. Set BOT_TOKEN below (or better, via env var — see bottom of file).
//   2. Set WEBAPP_URL to the public HTTPS address where the game is hosted.
//      Telegram requires a real, publicly reachable HTTPS URL here — it
//      cannot open localhost or an internal address.
//   3. Run:  node telegram-bot.mjs
//
// The bot uses simple long polling (no server/webhook needed to get started).

const BOT_TOKEN = process.env.BOT_TOKEN || "8755064730:AAGz0uV_HlKHTFlfFvju2eTasbhTJUVlxIk";
const WEBAPP_URL = process.env.WEBAPP_URL || "https://REPLACE-WITH-YOUR-DEPLOYED-URL.example.com";

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function callApi(method, payload) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error(`[${method}] error:`, data.description);
  }
  return data;
}

async function sendOpenAppMessage(chatId) {
  return callApi("sendMessage", {
    chat_id: chatId,
    text: "Жми, чтобы открыть игру 👇",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🎮 Open App",
            web_app: { url: WEBAPP_URL },
          },
        ],
      ],
    },
  });
}

// Optional: also sets a persistent "Open App" button next to the message
// input field for this bot's chats (shows up even without /start).
async function setPersistentMenuButton() {
  await callApi("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "Open App",
      web_app: { url: WEBAPP_URL },
    },
  });
}

async function handleUpdate(update) {
  const msg = update.message;
  if (!msg || !msg.text) return;

  if (msg.text.startsWith("/start")) {
    console.log(`/start from chat ${msg.chat.id} (${msg.from?.username || msg.from?.first_name})`);
    await sendOpenAppMessage(msg.chat.id);
  }
}

async function pollLoop() {
  let offset = 0;
  console.log("Bot is running. Waiting for /start ...");
  while (true) {
    try {
      const data = await callApi("getUpdates", {
        offset,
        timeout: 30,
        allowed_updates: ["message"],
      });
      if (data.ok) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          await handleUpdate(update);
        }
      }
    } catch (err) {
      console.error("Poll error:", err);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

if (WEBAPP_URL.includes("REPLACE-WITH-YOUR-DEPLOYED-URL")) {
  console.warn(
    "⚠️  WEBAPP_URL is still a placeholder. Set it (in this file or via the WEBAPP_URL env var) " +
      "to your game's real public HTTPS URL before the button will work.",
  );
}

setPersistentMenuButton().then(pollLoop);

// --- Running with env vars instead of hardcoding (recommended) ---
// BOT_TOKEN=123:abc WEBAPP_URL=https://your-game.vercel.app node telegram-bot.mjs
