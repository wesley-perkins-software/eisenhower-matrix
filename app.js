const STORAGE_KEY = "eisenhower_matrix_v1";
const TASK_MAX_CHARS = 140;
const WARN_TASK_COUNT = 200;
const HEAVY_TASK_COUNT = 500;
const QUADRANTS = [
  { id: "do_first", label: "Do First" },
  { id: "schedule", label: "Schedule" },
  { id: "delegate", label: "Delegate" },
  { id: "eliminate", label: "Eliminate" },
];

const elements = {
  taskInput: document.getElementById("task-input"),
  quadrantSelect: document.getElementById("quadrant-select"),
  addTaskButton: document.getElementById("add-task"),
  clearAllButton: document.getElementById("clear-all"),
  taskToast: document.getElementById("task-toast"),
  lists: Array.from(document.querySelectorAll(".task-list")),
  addButtons: Array.from(document.querySelectorAll("[data-add]")),
  helperStatus: document.getElementById("helper-status"),
  charCounter: null,
};

const moveSheet = document.getElementById("move-sheet");
const moveBackdrop = document.getElementById("move-backdrop");
const moveCancel = document.getElementById("move-cancel");
const moveButtons = Array.from(document.querySelectorAll("#move-sheet [data-move]"));
const moveTaskPreview = document.getElementById("move-sheet-task");

let state = {
  version: 1,
  updatedAt: null,
  tasks: [],
  lastQuadrant: "do_first",
};

let saveTimer = null;
let toastTimer = null;
let activeMoveTaskId = null;
let storageErrorActive = false;

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function setStatus(message, type = "", source = "") {
  if (!elements.helperStatus) return;
  elements.helperStatus.textContent = message || "";
  elements.helperStatus.classList.remove("is-warn", "is-error");
  if (type === "warn") elements.helperStatus.classList.add("is-warn");
  if (type === "error") elements.helperStatus.classList.add("is-error");
  elements.helperStatus.dataset.source = source;
}

function updateCountWarnings() {
  if (storageErrorActive) return;
  const total = state.tasks.length;
  if (total >= HEAVY_TASK_COUNT) {
    setStatus("This is a very large list. Consider clearing old tasks.", "warn", "count");
    return;
  }
  if (total >= WARN_TASK_COUNT) {
    setStatus("Large lists may feel slower in this browser.", "warn", "count");
    return;
  }
  if (elements.helperStatus?.dataset.source === "count") {
    setStatus("", "", "");
  }
}


function ensureCharCounter() {
  if (elements.charCounter) return elements.charCounter;
  const quickAdd = document.querySelector(".quick-add");
  if (!quickAdd) return null;

  const meta = document.createElement("div");
  meta.className = "input-meta";

  const counter = document.createElement("span");
  counter.id = "char-counter";
  counter.className = "char-counter";
  counter.setAttribute("aria-live", "polite");

  meta.appendChild(counter);
  quickAdd.appendChild(meta);
  elements.charCounter = counter;
  return counter;
}

function updateCharCounter() {
  const counter = ensureCharCounter();
  if (!counter || !elements.taskInput) return;

  const len = elements.taskInput.value.length;

  counter.classList.remove("is-visible", "is-warn");
  counter.textContent = "";

  if (len < 130) return;

  counter.classList.add("is-visible", "is-warn");
  counter.textContent = `${len}/${TASK_MAX_CHARS}`;
}

function saveState() {
  state.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageErrorActive = false;
    updateCountWarnings();
  } catch (error) {
    storageErrorActive = true;
    setStatus("Couldn’t save in this browser. Your changes may not persist.", "error", "storage");
  }
}

function saveStateDebounced() {
  if (saveTimer) {
    window.clearTimeout(saveTimer);
  }
  saveTimer = window.setTimeout(() => {
    saveState();
    saveTimer = null;
  }, 250);
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.tasks)) {
      state = {
        ...state,
        ...parsed,
        tasks: parsed.tasks.map((task) => ({
          id: task.id,
          text: task.text,
          quadrant: task.quadrant,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        })),
        lastQuadrant: parsed.lastQuadrant || "do_first",
      };
    }
  } catch (error) {
    console.warn("Could not load saved tasks", error);
  }
}

function normalizeText(text) {
  return text.trim();
}

function isInlineEditingActive() {
  return Boolean(document.querySelector(".task-edit"));
}

function addTask(text, quadrant) {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  if (normalized.length > TASK_MAX_CHARS) return false;
  const now = new Date().toISOString();
  state.tasks.push({
    id: uid(),
    text: normalized,
    quadrant,
    createdAt: now,
    updatedAt: now,
  });
  state.lastQuadrant = quadrant;
  render();
  showTaskCreatedToast(normalized, quadrant);
  saveStateDebounced();
  return true;
}

function getQuadrantLabel(quadrant) {
  const matchingQuadrant = QUADRANTS.find((item) => item.id === quadrant);
  return matchingQuadrant ? matchingQuadrant.label : "selected quadrant";
}

function showTaskCreatedToast(taskText, quadrant) {
  if (!elements.taskToast) return;

  const preview = taskText.length > 40 ? `${taskText.slice(0, 37)}…` : taskText;
  const targetQuadrant = getQuadrantLabel(quadrant);
  elements.taskToast.textContent = `Added “${preview}” to ${targetQuadrant}.`;
  elements.taskToast.classList.add("is-visible");

  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }

  toastTimer = window.setTimeout(() => {
    elements.taskToast.classList.remove("is-visible");
    toastTimer = null;
  }, 2100);
}

function updateTask(id, updates) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  Object.assign(task, updates, { updatedAt: new Date().toISOString() });
  render();
  saveStateDebounced();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((task) => task.id !== id);
  render();
  saveStateDebounced();
}

function openMoveSheet(task) {
  if (!moveSheet || !moveBackdrop) return;

  activeMoveTaskId = task.id;
  if (moveTaskPreview) {
    moveTaskPreview.textContent = task.text.length > 80 ? `${task.text.slice(0, 77)}…` : task.text;
  }

  moveBackdrop.hidden = false;
  moveSheet.hidden = false;

  const firstButton = moveButtons[0];
  if (firstButton) {
    firstButton.focus();
  }
}

function closeMoveSheet() {
  if (!moveSheet || !moveBackdrop) return;

  moveSheet.hidden = true;
  moveBackdrop.hidden = true;
  activeMoveTaskId = null;
}

function moveActiveTaskToQuadrant(quadrant) {
  if (!activeMoveTaskId) return;
  const task = state.tasks.find((item) => item.id === activeMoveTaskId);
  if (!task) {
    closeMoveSheet();
    return;
  }

  task.quadrant = quadrant;
  task.updatedAt = new Date().toISOString();
  render();
  saveStateDebounced();
  closeMoveSheet();
}

function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = "task";
  li.setAttribute("data-id", task.id);

  const topRow = document.createElement("div");
  topRow.className = "task-top";

  const textSpan = document.createElement("span");
  textSpan.className = "task-text";
  textSpan.textContent = task.text;

  const taskActions = document.createElement("div");
  taskActions.className = "task-actions";

  const moveButton = document.createElement("button");
  moveButton.type = "button";
  moveButton.className = "icon-btn icon-btn--move";
  moveButton.setAttribute("aria-label", "Move task");
  moveButton.title = "Move task";
  moveButton.textContent = "↔";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "icon-btn";
  editButton.setAttribute("aria-label", "Edit task");
  editButton.title = "Edit task";
  editButton.textContent = "✎";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "icon-btn";
  deleteButton.setAttribute("aria-label", "Delete task");
  deleteButton.title = "Delete task";
  deleteButton.textContent = "×";

  moveButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openMoveSheet(task);
  });

  editButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    startInlineEdit(task, textSpan);
  });

  deleteButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    deleteTask(task.id);
  });

  taskActions.appendChild(moveButton);
  taskActions.appendChild(editButton);
  taskActions.appendChild(deleteButton);

  topRow.appendChild(textSpan);
  topRow.appendChild(taskActions);

  li.appendChild(topRow);

  return li;
}

function startInlineEdit(task, textNode) {
  const activeEdit = document.querySelector(".task-edit");
  if (activeEdit) {
    activeEdit.focus();
    activeEdit.select();
    return;
  }

  const currentText = task.text;
  const wrap = document.createElement("div");
  wrap.className = "task-edit-wrap";

  const input = document.createElement("input");
  input.type = "text";
  input.value = currentText;
  input.className = "task-edit";
  input.maxLength = TASK_MAX_CHARS;

  const meta = document.createElement("div");
  meta.className = "edit-meta";

  const counter = document.createElement("span");
  counter.className = "char-counter";
  counter.setAttribute("aria-live", "polite");

  meta.appendChild(counter);
  wrap.appendChild(input);
  wrap.appendChild(meta);

  let cancelled = false;

  const updateInlineCounter = () => {
    const len = input.value.length;
    counter.classList.remove("is-visible", "is-warn");
    counter.textContent = "";

    if (len < 130) return;
    counter.classList.add("is-visible", "is-warn");
    counter.textContent = `${len}/${TASK_MAX_CHARS}`;
  };

  const finish = () => {
    const nextText = normalizeText(input.value);
    if (cancelled || !nextText) {
      render();
      return;
    }
    if (nextText.length > TASK_MAX_CHARS) {
      render();
      return;
    }
    updateTask(task.id, { text: nextText });
  };

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      input.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancelled = true;
      input.value = currentText;
      input.blur();
    }
  });

  input.addEventListener("input", updateInlineCounter);
  input.addEventListener("blur", finish);

  textNode.replaceWith(wrap);
  updateInlineCounter();
  input.focus();
  input.select();
}

function render() {
  elements.lists.forEach((list) => {
    list.innerHTML = "";
  });

  state.tasks.forEach((task) => {
    const list = document.querySelector(`[data-list="${task.quadrant}"]`);
    if (!list) return;
    list.appendChild(createTaskElement(task));
  });

  updateCountWarnings();
}

function submitQuickAdd() {
  if (isInlineEditingActive()) return;
  const didAdd = addTask(elements.taskInput.value, elements.quadrantSelect.value);
  if (!didAdd) return;
  elements.taskInput.value = "";
  updateCharCounter();
  elements.taskInput.focus();
}

function initQuickAdd() {
  elements.taskInput.maxLength = TASK_MAX_CHARS;

  elements.addTaskButton.addEventListener("click", () => {
    submitQuickAdd();
  });

  elements.taskInput.addEventListener("input", () => {
    updateCharCounter();
  });

  elements.taskInput.addEventListener("focus", () => {
    updateCharCounter();
  });

  elements.taskInput.addEventListener("blur", () => {
    updateCharCounter();
  });

  elements.taskInput.addEventListener("paste", (event) => {
    const text = event.clipboardData?.getData("text") || "";
    if (!/[\r\n]/.test(text)) return;

    event.preventDefault();
    const lines = text
      .split(/\r?\n/)
      .map((line) => normalizeText(line))
      .filter(Boolean);

    let added = 0;
    let rejected = 0;

    lines.forEach((line) => {
      if (line.length > TASK_MAX_CHARS) {
        rejected += 1;
        return;
      }
      if (addTask(line, elements.quadrantSelect.value)) {
        added += 1;
      }
    });

    if (added && rejected) {
      setStatus(
        `Added ${added} task${added === 1 ? "" : "s"}. ${rejected} line${rejected === 1 ? " was" : "s were"} longer than ${TASK_MAX_CHARS} characters and skipped.`,
        "warn",
        "input"
      );
    } else if (added) {
      setStatus(`Added ${added} task${added === 1 ? "" : "s"}.`, "", "input");
    } else if (rejected) {
      setStatus(
        `${rejected} line${rejected === 1 ? " was" : "s were"} longer than ${TASK_MAX_CHARS} characters and skipped.`,
        "warn",
        "input"
      );
    }

    elements.taskInput.value = "";
    updateCharCounter();
    elements.taskInput.focus();
  });

  elements.taskInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    submitQuickAdd();
  });

  elements.quadrantSelect.addEventListener("change", (event) => {
    state.lastQuadrant = event.target.value;
    saveStateDebounced();
  });
}

function initPerQuadrantAdd() {
  elements.addButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const quadrant = button.getAttribute("data-add");
      const text = window.prompt("New task:");
      if (text !== null) {
        addTask(text, quadrant);
      }
    });
  });
}

function initClearAll() {
  elements.clearAllButton.addEventListener("click", () => {
    const confirmed = window.confirm("Clear all tasks? This cannot be undone.");
    if (!confirmed) return;
    state.tasks = [];
    saveState();
    render();
  });
}

function initMoveSheet() {
  if (!moveSheet || !moveBackdrop) return;

  closeMoveSheet();

  if (moveCancel) {
    moveCancel.addEventListener("click", () => {
      closeMoveSheet();
    });
  }

  moveBackdrop.addEventListener("click", () => {
    closeMoveSheet();
  });

  moveButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const destination = button.getAttribute("data-move");
      if (!destination) return;
      moveActiveTaskToQuadrant(destination);
    });
  });
}

function init() {
  loadState();
  elements.quadrantSelect.value = state.lastQuadrant || "do_first";
  render();
  updateCountWarnings();
  initQuickAdd();
  updateCharCounter();
  initPerQuadrantAdd();
  initClearAll();
  initMoveSheet();
}

document.addEventListener("keydown", (event) => {
  const isMoveSheetOpen = Boolean(moveSheet && !moveSheet.hidden);
  if (isMoveSheetOpen && event.key === "Escape") {
    event.preventDefault();
    closeMoveSheet();
    return;
  }

  if (!isInlineEditingActive()) return;
  if (event.key === "Enter" || event.key === "Escape") {
    event.stopPropagation();
  }
});

init();
