// ---------- Auth gate ----------
const authGate = document.getElementById("auth-gate");
const appSection = document.getElementById("app");
const authForm = document.getElementById("auth-form");
const passwordInput = document.getElementById("password");
const authError = document.getElementById("auth-error");

const SESSION_KEY = "status-post-authed";

function unlockApp() {
  authGate.hidden = true;
  appSection.hidden = false;
  if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    loadScheduledPosts();
    loadMessageScheduledPosts();
    loadPostedHistory();
  }
}

if (sessionStorage.getItem(SESSION_KEY) === "1") {
  unlockApp();
}

authForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (passwordInput.value === window.APP_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, "1");
    authError.textContent = "";
    unlockApp();
  } else {
    authError.textContent = "Senha incorreta.";
  }
});

// ---------- Upload form ----------
const form = document.getElementById("post-form");
const accountSelect = document.getElementById("account");
const fileInput = document.getElementById("image");
const dropzone = document.getElementById("dropzone");
const dropzoneText = document.getElementById("dropzone-text");
const fileListEl = document.getElementById("file-list");
const imageUrlInput = document.getElementById("image-url");
const addUrlBtn = document.getElementById("add-url-btn");
const captionInput = document.getElementById("caption");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const statusEl = document.getElementById("status");
const progressBar = document.getElementById("progress-bar");
const progressFill = document.getElementById("progress-fill");
const postedListEl = document.getElementById("posted-list");
const postedEmptyEl = document.getElementById("posted-empty");

const modeRadios = document.querySelectorAll('input[name="mode"]');
const scheduleFields = document.getElementById("schedule-fields");
const scheduleTypeSelect = document.getElementById("schedule-type");
const onceFields = document.getElementById("once-fields");
const weeklyFields = document.getElementById("weekly-fields");
const scheduleDatetimeInput = document.getElementById("schedule-datetime");
const scheduleTimeInput = document.getElementById("schedule-time");
const weekdayCheckboxes = document.querySelectorAll('input[name="weekday"]');
const scheduledListEl = document.getElementById("scheduled-list");
const scheduledEmptyEl = document.getElementById("scheduled-empty");

// ---------- Lightbox ----------
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");

function openLightbox(src) {
  lightboxImg.src = src;
  lightbox.hidden = false;
}

lightbox.addEventListener("click", () => {
  lightbox.hidden = true;
  lightboxImg.src = "";
});

// ---------- Confirm modal ----------
const confirmModal = document.getElementById("confirm-modal");
const confirmMessage = document.getElementById("confirm-message");
const confirmOkBtn = document.getElementById("confirm-ok");
const confirmCancelBtn = document.getElementById("confirm-cancel");

function askConfirm(message) {
  confirmMessage.textContent = message;
  confirmModal.hidden = false;

  return new Promise((resolve) => {
    function cleanup(result) {
      confirmModal.hidden = true;
      confirmOkBtn.removeEventListener("click", onOk);
      confirmCancelBtn.removeEventListener("click", onCancel);
      resolve(result);
    }
    function onOk() { cleanup(true); }
    function onCancel() { cleanup(false); }

    confirmOkBtn.addEventListener("click", onOk);
    confirmCancelBtn.addEventListener("click", onCancel);
  });
}

let selectedFiles = [];
let dragIndex = null;

function currentMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

modeRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    scheduleFields.hidden = currentMode() !== "schedule";
    submitBtn.textContent = currentMode() === "schedule" ? "Agendar Status" : "Publicar Status";
  });
});

scheduleTypeSelect.addEventListener("change", () => {
  const isOnce = scheduleTypeSelect.value === "once";
  onceFields.hidden = !isOnce;
  weeklyFields.hidden = isOnce;
});

(window.WHATSAPP_ACCOUNTS || []).forEach((account) => {
  const option = document.createElement("option");
  option.value = account.id;
  option.textContent = account.label;
  accountSelect.appendChild(option);
});

function itemKey(item) {
  return item.type === "url"
    ? `url-${item.url}`
    : `file-${item.file.name}-${item.file.size}-${item.file.lastModified}`;
}

function itemName(item) {
  return item.type === "url" ? item.url : item.file.name;
}

function effectiveCaption(item) {
  return item.caption && item.caption.trim() ? item.caption : captionInput.value;
}

function urlBasename(url) {
  try {
    const path = new URL(url).pathname;
    const last = path.split("/").filter(Boolean).pop();
    return last || "imagem-url";
  } catch {
    return "imagem-url";
  }
}

function guessMimeFromUrl(url) {
  const ext = urlBasename(url).split(".").pop().toLowerCase();
  const map = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };
  return map[ext] || "image/jpeg";
}

function renderFileList() {
  fileListEl.innerHTML = "";
  dropzoneText.hidden = selectedFiles.length > 0;

  selectedFiles.forEach((item, index) => {
    const li = document.createElement("li");
    li.draggable = true;

    li.addEventListener("dragstart", () => {
      dragIndex = index;
      li.classList.add("dragging");
    });

    li.addEventListener("dragend", () => {
      li.classList.remove("dragging");
    });

    li.addEventListener("dragover", (e) => {
      e.preventDefault();
      li.classList.add("drag-over");
    });

    li.addEventListener("dragleave", () => {
      li.classList.remove("drag-over");
    });

    li.addEventListener("drop", (e) => {
      e.preventDefault();
      li.classList.remove("drag-over");
      if (dragIndex === null || dragIndex === index) return;
      const [moved] = selectedFiles.splice(dragIndex, 1);
      selectedFiles.splice(index, 0, moved);
      dragIndex = null;
      renderFileList();
    });

    const img = document.createElement("img");
    img.alt = itemName(item);
    if (item.type === "url") {
      img.src = item.url;
      img.addEventListener("click", () => openLightbox(item.url));
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result;
        img.addEventListener("click", () => openLightbox(reader.result));
      };
      reader.readAsDataURL(item.file);
    }

    const info = document.createElement("div");
    info.className = "file-info";

    const name = document.createElement("span");
    name.className = "file-name";
    name.textContent = itemName(item);

    const captionField = document.createElement("input");
    captionField.type = "text";
    captionField.className = "file-caption";
    captionField.placeholder = "Legenda desta imagem (opcional, usa a padrão se vazio)";
    captionField.value = item.caption || "";
    captionField.addEventListener("input", () => {
      item.caption = captionField.value;
    });

    info.append(name, captionField);

    const actions = document.createElement("div");
    actions.className = "file-actions";

    const upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.textContent = "↑";
    upBtn.disabled = index === 0;
    upBtn.addEventListener("click", () => {
      [selectedFiles[index - 1], selectedFiles[index]] = [selectedFiles[index], selectedFiles[index - 1]];
      renderFileList();
    });

    const downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.textContent = "↓";
    downBtn.disabled = index === selectedFiles.length - 1;
    downBtn.addEventListener("click", () => {
      [selectedFiles[index + 1], selectedFiles[index]] = [selectedFiles[index], selectedFiles[index + 1]];
      renderFileList();
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
      selectedFiles.splice(index, 1);
      renderFileList();
    });

    actions.append(upBtn, downBtn, removeBtn);
    li.append(img, info, actions);
    fileListEl.appendChild(li);
  });
}

function addFiles(fileList) {
  const existingKeys = new Set(selectedFiles.map(itemKey));
  Array.from(fileList)
    .filter((file) => file.type.startsWith("image/"))
    .forEach((file) => {
      const item = { type: "file", file };
      const key = itemKey(item);
      if (!existingKeys.has(key)) {
        selectedFiles.push(item);
        existingKeys.add(key);
      }
    });
  renderFileList();
}

function addUrl(url) {
  url = url.trim();
  if (!url) return;
  const item = { type: "url", url };
  const key = itemKey(item);
  if (!selectedFiles.some((existing) => itemKey(existing) === key)) {
    selectedFiles.push(item);
    renderFileList();
  }
}

fileInput.addEventListener("change", () => {
  addFiles(fileInput.files);
  fileInput.value = "";
});

["dragover", "dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropzone.classList.toggle("dragover", eventName === "dragover");
  });
});

dropzone.addEventListener("drop", (e) => {
  addFiles(e.dataTransfer.files);
});

addUrlBtn.addEventListener("click", () => {
  addUrl(imageUrlInput.value);
  imageUrlInput.value = "";
});

imageUrlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addUrl(imageUrlInput.value);
    imageUrlInput.value = "";
  }
});

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = type || "";
}

// ---------- Tabs ----------
const tabButtons = document.querySelectorAll(".tab-btn");
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.hidden = panel.id !== btn.dataset.tab;
    });
  });
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Delay aleatório entre publicações — evita o padrão de intervalo fixo que
// serviços de detecção de automação (WhatsApp) reconhecem como comportamento de bot.
function randomSendDelay() {
  const min = Number(window.SEND_DELAY_MIN_MS ?? 15000);
  const max = Number(window.SEND_DELAY_MAX_MS ?? 45000);
  if (!(max > min)) return min;
  return min + Math.random() * (max - min);
}

let publishCanceled = false;

// Igual a sleep(), mas verifica a cada 250ms se o usuário cancelou a publicação/envio,
// para o botão "Cancelar" interromper mesmo durante o intervalo entre imagens/mensagens.
async function cancellableSleep(ms, isCanceled = () => publishCanceled) {
  const step = 250;
  let remaining = ms;
  while (remaining > 0 && !isCanceled()) {
    await sleep(Math.min(step, remaining));
    remaining -= step;
  }
}

// Downscales large images client-side before upload to keep requests fast and light.
function compressImage(file, maxDimension = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/") || file.type === "image/gif") {
      resolve(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      if (scale === 1 && file.size < 500 * 1024) {
        resolve(file);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(new File([blob], file.name, { type: blob.type }));
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

async function postImage(item, caption, account) {
  const formData = new FormData();
  formData.append("type", "status");

  if (item.type === "url") {
    formData.append("imageUrl", item.url);
    formData.append("mimetype", guessMimeFromUrl(item.url));
  } else {
    const compressed = await compressImage(item.file);
    formData.append("image", compressed, item.file.name);
  }

  formData.append("caption", caption);
  formData.append("session", account);

  const response = await fetch(window.WEBHOOK_URL, {
    method: "POST",
    headers: { "X-API-Key": window.API_KEY },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Webhook respondeu com status ${response.status}`);
  }

  return extractMessageId(response);
}

// O node WAHA no n8n responde com { id: "true_status@broadcast_<ID>_<participant>@c.us", ... }
// — um id composto (fromMe_remoteJid_id_participant). A API de exclusão de status da WAHA
// espera só o segmento do meio (o id da mensagem em si).
async function extractMessageId(response) {
  try {
    const data = await response.clone().json();
    const first = Array.isArray(data) ? data[0] : data;
    const rawId = first?.id || first?.key?.id;
    if (!rawId) return null;
    const parts = rawId.split("_");
    return parts.length >= 3 ? parts[2] : rawId;
  } catch {
    return null;
  }
}

async function deleteWhatsappStatus(messageId, account) {
  const formData = new FormData();
  formData.append("type", "status-delete");
  formData.append("session", account);
  formData.append("id", messageId);

  const response = await fetch(window.WEBHOOK_URL, {
    method: "POST",
    headers: { "X-API-Key": window.API_KEY },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Webhook respondeu com status ${response.status}`);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: window.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
    "X-Schedule-Key": window.SCHEDULE_API_KEY,
    ...extra,
  };
}

async function insertScheduledPost(row) {
  const response = await fetch(`${window.SUPABASE_URL}/rest/v1/scheduled_posts`, {
    method: "POST",
    headers: supabaseHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    throw new Error(`Supabase respondeu com status ${response.status}`);
  }
}

async function buildHistoryImageFields(item) {
  if (item.type === "url") {
    return { image_url: item.url, image_filename: urlBasename(item.url) };
  }
  const thumb = await compressImage(item.file, 200, 0.6);
  const base64 = await fileToBase64(thumb);
  return { image_data: base64, image_mimetype: thumb.type, image_filename: item.file.name };
}

async function insertPostedHistory(row) {
  await fetch(`${window.SUPABASE_URL}/rest/v1/posted_history`, {
    method: "POST",
    headers: supabaseHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(row),
  });
}

async function logPostedHistory(item, caption, account, messageId) {
  try {
    const imageFields = await buildHistoryImageFields(item);
    await insertPostedHistory({
      account_id: account,
      post_type: "status",
      source: "immediate",
      caption,
      message_id: messageId || null,
      ...imageFields,
    });
  } catch {
    // Histórico é só conveniência — uma falha aqui não deve travar a publicação.
  }
}

async function markHistoryDeleted(id, reloadFn) {
  await fetch(`${window.SUPABASE_URL}/rest/v1/posted_history?id=eq.${id}`, {
    method: "PATCH",
    headers: supabaseHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ deleted: true }),
  });
  reloadFn();
}

async function deleteAndMarkHistory(post, reloadFn) {
  await deleteWhatsappStatus(post.message_id, post.account_id);
  await markHistoryDeleted(post.id, reloadFn);
}

async function loadPostedHistory() {
  try {
    // Status do WhatsApp some sozinho após 24h — passado esse prazo não há
    // mais o que apagar, então nem exibimos o post na lista.
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const response = await fetch(
      `${window.SUPABASE_URL}/rest/v1/posted_history?deleted=eq.false&post_type=eq.status&posted_at=gte.${cutoff}&order=posted_at.desc&limit=30`,
      { headers: supabaseHeaders() }
    );
    if (!response.ok) return;

    const posts = await response.json();
    postedListEl.innerHTML = "";
    postedEmptyEl.hidden = posts.length > 0;

    posts.forEach((post) => {
      const li = document.createElement("li");

      const img = document.createElement("img");
      const imgSrc = post.image_url || `data:${post.image_mimetype};base64,${post.image_data}`;
      img.src = imgSrc;
      img.alt = post.image_filename || "Imagem publicada";
      img.addEventListener("click", () => openLightbox(imgSrc));

      const info = document.createElement("div");
      info.className = "scheduled-info";
      const accountLabel =
        (window.WHATSAPP_ACCOUNTS || []).find((a) => a.id === post.account_id)?.label || post.account_id;
      const accountStrong = document.createElement("strong");
      accountStrong.textContent = accountLabel;
      info.append(accountStrong, document.createTextNode(new Date(post.posted_at).toLocaleString("pt-BR")));

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";

      if (post.message_id) {
        deleteBtn.textContent = "Apagar do WhatsApp";
        deleteBtn.addEventListener("click", async () => {
          if (!(await askConfirm("Apagar este status do WhatsApp agora?"))) return;
          deleteBtn.disabled = true;
          try {
            await deleteAndMarkHistory(post, loadPostedHistory);
          } catch (err) {
            deleteBtn.disabled = false;
            setStatus(`Falha ao apagar do WhatsApp: ${err.message}`, "error");
          }
        });
      } else {
        deleteBtn.textContent = "Já apaguei";
        deleteBtn.addEventListener("click", () => markHistoryDeleted(post.id, loadPostedHistory));
      }

      li.append(img, info, deleteBtn);
      postedListEl.appendChild(li);
    });
  } catch {
    // Silently ignore — histórico é uma visão de conveniência, não crítica.
  }
}

async function scheduleImage(item, caption, account, schedule) {
  const row = {
    account_id: account,
    post_type: "status",
    caption,
    recurrence_type: schedule.type,
    scheduled_at: schedule.type === "once" ? schedule.scheduledAt : null,
    recurrence_days: schedule.type === "weekly" ? schedule.days : null,
    recurrence_time: schedule.type === "weekly" ? schedule.time : null,
  };

  if (item.type === "url") {
    row.image_url = item.url;
    row.image_filename = urlBasename(item.url);
  } else {
    const compressed = await compressImage(item.file);
    const base64 = await fileToBase64(compressed);
    row.image_data = base64;
    row.image_mimetype = compressed.type;
    row.image_filename = item.file.name;
  }

  await insertScheduledPost(row);
}

async function scheduleMessage(item, text, account, chatId, schedule) {
  const row = {
    account_id: account,
    post_type: "message",
    chat_id: chatId,
    caption: text,
    recurrence_type: schedule.type,
    scheduled_at: schedule.type === "once" ? schedule.scheduledAt : null,
    recurrence_days: schedule.type === "weekly" ? schedule.days : null,
    recurrence_time: schedule.type === "weekly" ? schedule.time : null,
  };

  if (item) {
    if (item.type === "url") {
      row.image_url = item.url;
      row.image_filename = urlBasename(item.url);
    } else {
      const compressed = await compressImage(item.file);
      const base64 = await fileToBase64(compressed);
      row.image_data = base64;
      row.image_mimetype = compressed.type;
      row.image_filename = item.file.name;
    }
  }

  await insertScheduledPost(row);
}

function formatScheduleInfo(post) {
  if (post.recurrence_type === "once") {
    return new Date(post.scheduled_at).toLocaleString("pt-BR");
  }
  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const days = (post.recurrence_days || []).map((d) => dayLabels[d]).join(", ");
  return `${days} às ${(post.recurrence_time || "").slice(0, 5)}`;
}

async function cancelScheduledPost(id, reloadFn) {
  await fetch(`${window.SUPABASE_URL}/rest/v1/rpc/cancel_scheduled_post`, {
    method: "POST",
    headers: supabaseHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ post_id: id }),
  });
  reloadFn();
}

async function loadScheduledPosts() {
  try {
    const response = await fetch(
      `${window.SUPABASE_URL}/rest/v1/scheduled_posts?status=eq.pending&post_type=eq.status&order=created_at.desc`,
      { headers: supabaseHeaders() }
    );
    if (!response.ok) return;

    const posts = await response.json();
    scheduledListEl.innerHTML = "";
    scheduledEmptyEl.hidden = posts.length > 0;

    posts.forEach((post) => {
      const li = document.createElement("li");

      const img = document.createElement("img");
      const imgSrc = post.image_url || `data:${post.image_mimetype};base64,${post.image_data}`;
      img.src = imgSrc;
      img.alt = post.image_filename || "Imagem agendada";
      img.addEventListener("click", () => openLightbox(imgSrc));

      const info = document.createElement("div");
      info.className = "scheduled-info";
      const accountLabel =
        (window.WHATSAPP_ACCOUNTS || []).find((a) => a.id === post.account_id)?.label || post.account_id;
      const accountStrong = document.createElement("strong");
      accountStrong.textContent = accountLabel;
      info.append(accountStrong, document.createTextNode(formatScheduleInfo(post)));

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = "Cancelar";
      cancelBtn.addEventListener("click", async () => {
        if (await askConfirm("Cancelar este post agendado?")) {
          cancelScheduledPost(post.id, loadScheduledPosts);
        }
      });

      li.append(img, info, cancelBtn);
      scheduledListEl.appendChild(li);
    });
  } catch {
    // Silently ignore — scheduled list is a convenience view, not critical path.
  }
}

function buildScheduleFrom(typeSelect, datetimeInput, timeInput, weekdayCheckboxes) {
  if (typeSelect.value === "once") {
    if (!datetimeInput.value) return { error: "Escolha a data e hora do agendamento." };
    const scheduledAt = new Date(datetimeInput.value);
    if (scheduledAt <= new Date()) return { error: "A data/hora precisa ser no futuro." };
    return { type: "once", scheduledAt: scheduledAt.toISOString() };
  }

  const days = Array.from(weekdayCheckboxes)
    .filter((cb) => cb.checked)
    .map((cb) => Number(cb.value));
  if (days.length === 0) return { error: "Escolha ao menos um dia da semana." };
  if (!timeInput.value) return { error: "Escolha o horário do agendamento." };
  return { type: "weekly", days, time: `${timeInput.value}:00` };
}

function buildSchedule() {
  return buildScheduleFrom(scheduleTypeSelect, scheduleDatetimeInput, scheduleTimeInput, weekdayCheckboxes);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (selectedFiles.length === 0) {
    setStatus("Selecione ao menos uma imagem antes de publicar.", "error");
    return;
  }

  const mode = currentMode();

  if (mode === "schedule") {
    const schedule = buildSchedule();
    if (schedule.error) {
      setStatus(schedule.error, "error");
      return;
    }

    submitBtn.disabled = true;
    progressBar.hidden = false;
    progressFill.style.width = "0%";

    const total = selectedFiles.length;
    let successCount = 0;

    for (let i = 0; i < total; i++) {
      setStatus(`Agendando ${i + 1} de ${total}...`, "");
      try {
        await scheduleImage(selectedFiles[i], effectiveCaption(selectedFiles[i]), accountSelect.value, schedule);
        successCount++;
        progressFill.style.width = `${Math.round(((i + 1) / total) * 100)}%`;
      } catch (err) {
        setStatus(`Falha ao agendar "${itemName(selectedFiles[i])}": ${err.message}`, "error");
        submitBtn.disabled = false;
        return;
      }
    }

    setStatus(`${successCount} imagem(ns) agendada(s) com sucesso!`, "success");
    form.reset();
    selectedFiles = [];
    renderFileList();
    progressBar.hidden = true;
    submitBtn.disabled = false;
    submitBtn.textContent = "Publicar Status";
    scheduleFields.hidden = true;
    onceFields.hidden = false;
    weeklyFields.hidden = true;
    loadScheduledPosts();
    return;
  }

  if (!window.WEBHOOK_URL || window.WEBHOOK_URL.includes("SEU-N8N")) {
    setStatus("Configure a WEBHOOK_URL em config.js antes de usar.", "error");
    return;
  }

  submitBtn.disabled = true;
  progressBar.hidden = false;
  progressFill.style.width = "0%";
  publishCanceled = false;
  cancelBtn.hidden = false;
  cancelBtn.disabled = false;

  const total = selectedFiles.length;
  const publishedItems = [];
  let successCount = 0;

  for (let i = 0; i < total; i++) {
    if (publishCanceled) break;

    setStatus(`Enviando ${i + 1} de ${total}...`, "");
    try {
      const caption = effectiveCaption(selectedFiles[i]);
      const messageId = await postImage(selectedFiles[i], caption, accountSelect.value);
      successCount++;
      publishedItems.push({ item: selectedFiles[i], caption, messageId });
      progressFill.style.width = `${Math.round(((i + 1) / total) * 100)}%`;
    } catch (err) {
      setStatus(`Falha ao publicar "${itemName(selectedFiles[i])}": ${err.message}`, "error");
      submitBtn.disabled = false;
      cancelBtn.hidden = true;
      return;
    }

    if (i < total - 1 && !publishCanceled) {
      const delay = randomSendDelay();
      setStatus(`Aguardando ${Math.round(delay / 1000)}s antes da próxima (anti-ban)...`, "");
      await cancellableSleep(delay);
    }
  }

  cancelBtn.hidden = true;

  if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    for (const { item, caption, messageId } of publishedItems) {
      await logPostedHistory(item, caption, accountSelect.value, messageId);
    }
    loadPostedHistory();
  }

  if (publishCanceled) {
    setStatus(`Publicação cancelada — ${successCount} de ${total} imagem(ns) publicada(s).`, successCount > 0 ? "success" : "");
  } else {
    setStatus(`${successCount} status publicado(s) com sucesso!`, "success");
  }
  form.reset();
  selectedFiles = [];
  renderFileList();
  progressBar.hidden = true;
  submitBtn.disabled = false;
});

cancelBtn.addEventListener("click", () => {
  publishCanceled = true;
  cancelBtn.disabled = true;
});

// ---------- Enviar Mensagem ----------
const messageForm = document.getElementById("message-form");
const messageAccountSelect = document.getElementById("message-account");
const messagePhoneInput = document.getElementById("message-phone");
const messageIsGroupInput = document.getElementById("message-is-group");
const messageFileInput = document.getElementById("message-image");
const messageDropzone = document.getElementById("message-dropzone");
const messageDropzoneText = document.getElementById("message-dropzone-text");
const messageImageUrlInput = document.getElementById("message-image-url");
const messageAddUrlBtn = document.getElementById("message-add-url-btn");
const messageImageListEl = document.getElementById("message-image-list");
const messageTextInput = document.getElementById("message-text");
const messageSubmitBtn = document.getElementById("message-submit-btn");
const messageCancelBtn = document.getElementById("message-cancel-btn");
const messageProgressBar = document.getElementById("message-progress-bar");
const messageProgressFill = document.getElementById("message-progress-fill");
const messagePhoneCountEl = document.getElementById("message-phone-count");
const messageStatusEl = document.getElementById("message-status");

const messageModeRadios = document.querySelectorAll('input[name="message-mode"]');
const messageScheduleFields = document.getElementById("message-schedule-fields");
const messageScheduleTypeSelect = document.getElementById("message-schedule-type");
const messageOnceFields = document.getElementById("message-once-fields");
const messageWeeklyFields = document.getElementById("message-weekly-fields");
const messageScheduleDatetimeInput = document.getElementById("message-schedule-datetime");
const messageScheduleTimeInput = document.getElementById("message-schedule-time");
const messageWeekdayCheckboxes = document.querySelectorAll('input[name="message-weekday"]');
const messageScheduledListEl = document.getElementById("message-scheduled-list");
const messageScheduledEmptyEl = document.getElementById("message-scheduled-empty");

function currentMessageMode() {
  return document.querySelector('input[name="message-mode"]:checked').value;
}

messageModeRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    messageScheduleFields.hidden = currentMessageMode() !== "schedule";
    messageSubmitBtn.textContent = currentMessageMode() === "schedule" ? "Agendar Mensagem" : "Enviar Mensagem";
  });
});

messageScheduleTypeSelect.addEventListener("change", () => {
  const isOnce = messageScheduleTypeSelect.value === "once";
  messageOnceFields.hidden = !isOnce;
  messageWeeklyFields.hidden = isOnce;
});

function buildMessageSchedule() {
  return buildScheduleFrom(messageScheduleTypeSelect, messageScheduleDatetimeInput, messageScheduleTimeInput, messageWeekdayCheckboxes);
}

async function loadMessageScheduledPosts() {
  try {
    const response = await fetch(
      `${window.SUPABASE_URL}/rest/v1/scheduled_posts?status=eq.pending&post_type=eq.message&order=created_at.desc`,
      { headers: supabaseHeaders() }
    );
    if (!response.ok) return;

    const posts = await response.json();
    messageScheduledListEl.innerHTML = "";
    messageScheduledEmptyEl.hidden = posts.length > 0;

    posts.forEach((post) => {
      const li = document.createElement("li");

      if (post.image_url || post.image_data) {
        const img = document.createElement("img");
        const imgSrc = post.image_url || `data:${post.image_mimetype};base64,${post.image_data}`;
        img.src = imgSrc;
        img.alt = post.image_filename || "Imagem agendada";
        img.addEventListener("click", () => openLightbox(imgSrc));
        li.appendChild(img);
      }

      const info = document.createElement("div");
      info.className = "scheduled-info";
      const accountLabel =
        (window.WHATSAPP_ACCOUNTS || []).find((a) => a.id === post.account_id)?.label || post.account_id;
      const accountStrong = document.createElement("strong");
      const destino = (post.chat_id || "").replace(/@c\.us$/, "").replace(/@g\.us$/, " (grupo)");
      accountStrong.textContent = `${accountLabel} → ${destino}`;
      info.append(accountStrong, document.createTextNode(formatScheduleInfo(post)));

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = "Cancelar";
      cancelBtn.addEventListener("click", async () => {
        if (await askConfirm("Cancelar esta mensagem agendada?")) {
          cancelScheduledPost(post.id, loadMessageScheduledPosts);
        }
      });

      li.append(info, cancelBtn);
      messageScheduledListEl.appendChild(li);
    });
  } catch {
    // Silently ignore — scheduled list is a convenience view, not critical path.
  }
}

(window.WHATSAPP_ACCOUNTS || []).forEach((account) => {
  const option = document.createElement("option");
  option.value = account.id;
  option.textContent = account.label;
  messageAccountSelect.appendChild(option);
});

let messageImage = null;

function setMessageStatus(message, type) {
  messageStatusEl.textContent = message;
  messageStatusEl.className = type || "";
}

function renderMessageImage() {
  messageImageListEl.innerHTML = "";
  messageDropzoneText.hidden = messageImage !== null;
  if (!messageImage) return;

  const li = document.createElement("li");

  const img = document.createElement("img");
  img.alt = itemName(messageImage);
  if (messageImage.type === "url") {
    img.src = messageImage.url;
    img.addEventListener("click", () => openLightbox(messageImage.url));
  } else {
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result;
      img.addEventListener("click", () => openLightbox(reader.result));
    };
    reader.readAsDataURL(messageImage.file);
  }

  const name = document.createElement("span");
  name.className = "file-name";
  name.textContent = itemName(messageImage);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "✕";
  removeBtn.addEventListener("click", () => {
    messageImage = null;
    renderMessageImage();
  });

  const actions = document.createElement("div");
  actions.className = "file-actions";
  actions.appendChild(removeBtn);

  li.append(img, name, actions);
  messageImageListEl.appendChild(li);
}

messageFileInput.addEventListener("change", () => {
  const file = messageFileInput.files[0];
  if (file && file.type.startsWith("image/")) {
    messageImage = { type: "file", file };
    renderMessageImage();
  }
  messageFileInput.value = "";
});

["dragover", "dragleave", "drop"].forEach((eventName) => {
  messageDropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    messageDropzone.classList.toggle("dragover", eventName === "dragover");
  });
});

messageDropzone.addEventListener("drop", (e) => {
  const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
  if (file) {
    messageImage = { type: "file", file };
    renderMessageImage();
  }
});

messageAddUrlBtn.addEventListener("click", () => {
  const url = messageImageUrlInput.value.trim();
  if (url) {
    messageImage = { type: "url", url };
    renderMessageImage();
  }
  messageImageUrlInput.value = "";
});

messageImageUrlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    messageAddUrlBtn.click();
  }
});

// Monta o chatId no formato exigido pela WAHA (@c.us para contatos, @g.us para grupos).
function buildChatId(phone, isGroup) {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@${isGroup ? "g.us" : "c.us"}`;
}

// Aceita um número por linha ou separados por vírgula/ponto-e-vírgula, para envio em lote.
function parsePhoneList(raw) {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

let messagePublishCanceled = false;

messagePhoneInput.addEventListener("input", () => {
  const count = parsePhoneList(messagePhoneInput.value).length;
  messagePhoneCountEl.textContent =
    count > 1 ? `${count} destinatários — serão enviados em lote com intervalo anti-ban.` : "";
});

async function postMessage(chatId, text, image, account) {
  const formData = new FormData();
  formData.append("type", "message");
  formData.append("session", account);
  formData.append("chatId", chatId);
  formData.append("text", text);

  if (image) {
    if (image.type === "url") {
      formData.append("imageUrl", image.url);
      formData.append("mimetype", guessMimeFromUrl(image.url));
    } else {
      const compressed = await compressImage(image.file);
      formData.append("image", compressed, image.file.name);
    }
  }

  const response = await fetch(window.WEBHOOK_URL, {
    method: "POST",
    headers: { "X-API-Key": window.API_KEY },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Webhook respondeu com status ${response.status}`);
  }
}

messageCancelBtn.addEventListener("click", () => {
  messagePublishCanceled = true;
  messageCancelBtn.disabled = true;
});

messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const phones = parsePhoneList(messagePhoneInput.value);
  if (phones.length === 0) {
    setMessageStatus("Informe ao menos um número de destinatário.", "error");
    return;
  }

  const text = messageTextInput.value.trim();
  if (!text && !messageImage) {
    setMessageStatus("Escreva uma mensagem ou anexe uma imagem.", "error");
    return;
  }

  const chatIds = phones.map((phone) => buildChatId(phone, messageIsGroupInput.checked));
  const mode = currentMessageMode();

  if (mode === "schedule") {
    const schedule = buildMessageSchedule();
    if (schedule.error) {
      setMessageStatus(schedule.error, "error");
      return;
    }

    messageSubmitBtn.disabled = true;

    const total = chatIds.length;
    let successCount = 0;

    for (let i = 0; i < total; i++) {
      setMessageStatus(total > 1 ? `Agendando ${i + 1} de ${total}...` : "Agendando...", "");
      try {
        await scheduleMessage(messageImage, text, messageAccountSelect.value, chatIds[i], schedule);
        successCount++;
      } catch (err) {
        setMessageStatus(`Falha ao agendar para "${phones[i]}": ${err.message}`, "error");
        messageSubmitBtn.disabled = false;
        return;
      }
    }

    setMessageStatus(
      total > 1 ? `${successCount} mensagem(ns) agendada(s) com sucesso!` : "Mensagem agendada com sucesso!",
      "success"
    );
    messageForm.reset();
    messageImage = null;
    renderMessageImage();
    messagePhoneCountEl.textContent = "";
    messageSubmitBtn.textContent = "Enviar Mensagem";
    messageScheduleFields.hidden = true;
    messageOnceFields.hidden = false;
    messageWeeklyFields.hidden = true;
    messageSubmitBtn.disabled = false;
    loadMessageScheduledPosts();
    return;
  }

  if (!window.WEBHOOK_URL || window.WEBHOOK_URL.includes("SEU-N8N")) {
    setMessageStatus("Configure a WEBHOOK_URL em config.js antes de usar.", "error");
    return;
  }

  messageSubmitBtn.disabled = true;
  messagePublishCanceled = false;
  const total = chatIds.length;
  const isBatch = total > 1;

  if (isBatch) {
    messageProgressBar.hidden = false;
    messageProgressFill.style.width = "0%";
    messageCancelBtn.hidden = false;
    messageCancelBtn.disabled = false;
  }

  let successCount = 0;
  const failures = [];

  for (let i = 0; i < total; i++) {
    if (messagePublishCanceled) break;

    setMessageStatus(isBatch ? `Enviando ${i + 1} de ${total}...` : "Enviando...", "");
    try {
      await postMessage(chatIds[i], text, messageImage, messageAccountSelect.value);
      successCount++;
      if (isBatch) {
        messageProgressFill.style.width = `${Math.round(((i + 1) / total) * 100)}%`;
      }
    } catch (err) {
      failures.push({ phone: phones[i], error: err.message });
    }

    if (isBatch && i < total - 1 && !messagePublishCanceled) {
      const delay = randomSendDelay();
      setMessageStatus(`Aguardando ${Math.round(delay / 1000)}s antes do próximo envio (anti-ban)...`, "");
      await cancellableSleep(delay, () => messagePublishCanceled);
    }
  }

  messageCancelBtn.hidden = true;
  messageProgressBar.hidden = true;
  messageSubmitBtn.disabled = false;

  if (messagePublishCanceled) {
    setMessageStatus(`Envio cancelado — ${successCount} de ${total} mensagem(ns) enviada(s).`, successCount > 0 ? "success" : "");
    return;
  }

  if (failures.length === 0) {
    setMessageStatus(isBatch ? `${successCount} mensagem(ns) enviada(s) com sucesso!` : "Mensagem enviada com sucesso!", "success");
  } else {
    setMessageStatus(
      `${successCount} de ${total} enviada(s). Falha para: ${failures.map((f) => f.phone).join(", ")}.`,
      successCount > 0 ? "" : "error"
    );
  }

  messageForm.reset();
  messageImage = null;
  renderMessageImage();
  messagePhoneCountEl.textContent = "";
});
