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
const captionInput = document.getElementById("caption");
const submitBtn = document.getElementById("submit-btn");
const statusEl = document.getElementById("status");
const progressBar = document.getElementById("progress-bar");
const progressFill = document.getElementById("progress-fill");

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

function fileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function renderFileList() {
  fileListEl.innerHTML = "";
  dropzoneText.hidden = selectedFiles.length > 0;

  selectedFiles.forEach((file, index) => {
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
    img.alt = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result;
      img.addEventListener("click", () => openLightbox(reader.result));
    };
    reader.readAsDataURL(file);

    const name = document.createElement("span");
    name.className = "file-name";
    name.textContent = file.name;

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
    li.append(img, name, actions);
    fileListEl.appendChild(li);
  });
}

function addFiles(fileList) {
  const existingKeys = new Set(selectedFiles.map(fileKey));
  Array.from(fileList)
    .filter((file) => file.type.startsWith("image/"))
    .forEach((file) => {
      if (!existingKeys.has(fileKey(file))) {
        selectedFiles.push(file);
        existingKeys.add(fileKey(file));
      }
    });
  renderFileList();
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

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = type || "";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function postImage(file, caption, account) {
  const compressed = await compressImage(file);

  const formData = new FormData();
  formData.append("image", compressed, file.name);
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

async function scheduleImage(file, caption, account, schedule) {
  const compressed = await compressImage(file);
  const base64 = await fileToBase64(compressed);

  const row = {
    account_id: account,
    caption,
    image_data: base64,
    image_mimetype: compressed.type,
    image_filename: file.name,
    recurrence_type: schedule.type,
    scheduled_at: schedule.type === "once" ? schedule.scheduledAt : null,
    recurrence_days: schedule.type === "weekly" ? schedule.days : null,
    recurrence_time: schedule.type === "weekly" ? schedule.time : null,
  };

  const response = await fetch(`${window.SUPABASE_URL}/rest/v1/scheduled_posts`, {
    method: "POST",
    headers: supabaseHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    throw new Error(`Supabase respondeu com status ${response.status}`);
  }
}

function formatScheduleInfo(post) {
  if (post.recurrence_type === "once") {
    return new Date(post.scheduled_at).toLocaleString("pt-BR");
  }
  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const days = (post.recurrence_days || []).map((d) => dayLabels[d]).join(", ");
  return `${days} às ${(post.recurrence_time || "").slice(0, 5)}`;
}

async function loadScheduledPosts() {
  try {
    const response = await fetch(
      `${window.SUPABASE_URL}/rest/v1/scheduled_posts?status=eq.pending&order=created_at.desc`,
      { headers: supabaseHeaders() }
    );
    if (!response.ok) return;

    const posts = await response.json();
    scheduledListEl.innerHTML = "";
    scheduledEmptyEl.hidden = posts.length > 0;

    posts.forEach((post) => {
      const li = document.createElement("li");

      const img = document.createElement("img");
      const imgSrc = `data:${post.image_mimetype};base64,${post.image_data}`;
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
          cancelScheduledPost(post.id);
        }
      });

      li.append(img, info, cancelBtn);
      scheduledListEl.appendChild(li);
    });
  } catch {
    // Silently ignore — scheduled list is a convenience view, not critical path.
  }
}

async function cancelScheduledPost(id) {
  await fetch(`${window.SUPABASE_URL}/rest/v1/rpc/cancel_scheduled_post`, {
    method: "POST",
    headers: supabaseHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ post_id: id }),
  });
  loadScheduledPosts();
}

function buildSchedule() {
  if (scheduleTypeSelect.value === "once") {
    if (!scheduleDatetimeInput.value) return { error: "Escolha a data e hora do agendamento." };
    const scheduledAt = new Date(scheduleDatetimeInput.value);
    if (scheduledAt <= new Date()) return { error: "A data/hora precisa ser no futuro." };
    return { type: "once", scheduledAt: scheduledAt.toISOString() };
  }

  const days = Array.from(weekdayCheckboxes)
    .filter((cb) => cb.checked)
    .map((cb) => Number(cb.value));
  if (days.length === 0) return { error: "Escolha ao menos um dia da semana." };
  if (!scheduleTimeInput.value) return { error: "Escolha o horário do agendamento." };
  return { type: "weekly", days, time: `${scheduleTimeInput.value}:00` };
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
        await scheduleImage(selectedFiles[i], captionInput.value, accountSelect.value, schedule);
        successCount++;
        progressFill.style.width = `${Math.round(((i + 1) / total) * 100)}%`;
      } catch (err) {
        setStatus(`Falha ao agendar "${selectedFiles[i].name}": ${err.message}`, "error");
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

  const total = selectedFiles.length;
  let successCount = 0;

  for (let i = 0; i < total; i++) {
    setStatus(`Enviando ${i + 1} de ${total}...`, "");
    try {
      await postImage(selectedFiles[i], captionInput.value, accountSelect.value);
      successCount++;
      progressFill.style.width = `${Math.round(((i + 1) / total) * 100)}%`;
    } catch (err) {
      setStatus(`Falha ao publicar "${selectedFiles[i].name}": ${err.message}`, "error");
      submitBtn.disabled = false;
      return;
    }

    if (i < total - 1) {
      await sleep(window.SEND_DELAY_MS || 0);
    }
  }

  setStatus(`${successCount} status publicado(s) com sucesso!`, "success");
  form.reset();
  selectedFiles = [];
  renderFileList();
  progressBar.hidden = true;
  submitBtn.disabled = false;
});
