const STORAGE_KEY = "eisenhower_matrix_v1";
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
let tooltipEl = null;

const TOOLTIP_OFFSET = 10;

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function saveState() {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

function ensureGlobalTooltip() {
  if (tooltipEl) return tooltipEl;
  tooltipEl = document.createElement("div");
  tooltipEl.id = "global-tooltip";
  tooltipEl.setAttribute("role", "tooltip");
  tooltipEl.setAttribute("aria-hidden", "true");
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

function hideGlobalTooltip() {
  if (!tooltipEl) return;
  tooltipEl.dataset.visible = "false";
  tooltipEl.setAttribute("aria-hidden", "true");
}

function showGlobalTooltip(button) {
  const text = button.getAttribute("data-tooltip") || button.getAttribute("aria-label");
  if (!text) return;

  const tooltip = ensureGlobalTooltip();
  tooltip.textContent = text;
  tooltip.dataset.visible = "false";
  tooltip.setAttribute("aria-hidden", "true");

  const rect = button.getBoundingClientRect();
  const halfWidth = tooltip.offsetWidth / 2;
  const minLeft = window.scrollX + halfWidth + 8;
  const maxLeft = window.scrollX + document.documentElement.clientWidth - halfWidth - 8;
  const centeredLeft = window.scrollX + rect.left + rect.width / 2;
  const clampedLeft = Math.max(minLeft, Math.min(centeredLeft, maxLeft));
  const top = window.scrollY + rect.top - tooltip.offsetHeight - TOOLTIP_OFFSET;

  tooltip.style.left = `${clampedLeft}px`;
  tooltip.style.top = `${Math.max(window.scrollY + 8, top)}px`;
  tooltip.dataset.visible = "true";
  tooltip.setAttribute("aria-hidden", "false");
}

function initGlobalTooltip() {
  const supportsHover = window.matchMedia("(pointer: fine)").matches;
  if (!supportsHover) return;

  ensureGlobalTooltip();

  document.addEventListener("pointerover", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest(".icon-btn[data-tooltip]");
    if (!button) return;
    showGlobalTooltip(button);
  });

  document.addEventListener("pointerout", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest(".icon-btn[data-tooltip]");
    if (!button) return;
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Element && button.contains(nextTarget)) return;
    hideGlobalTooltip();
  });

  window.addEventListener("scroll", hideGlobalTooltip, { passive: true });
  window.addEventListener("resize", hideGlobalTooltip);
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
  moveButton.setAttribute("data-tooltip", "Move task");
  moveButton.textContent = "↔";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "icon-btn";
  editButton.setAttribute("aria-label", "Edit task");
  editButton.setAttribute("data-tooltip", "Edit task");
  editButton.textContent = "✎";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "icon-btn";
  deleteButton.setAttribute("aria-label", "Delete task");
  deleteButton.setAttribute("data-tooltip", "Delete task");
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
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentText;
  input.className = "task-edit";

  let cancelled = false;

  const finish = () => {
    const nextText = normalizeText(input.value);
    if (!cancelled && nextText) {
      updateTask(task.id, { text: nextText });
    } else {
      render();
    }
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

  input.addEventListener("blur", finish);

  textNode.replaceWith(input);
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
}

function submitQuickAdd() {
  if (isInlineEditingActive()) return;
  const didAdd = addTask(elements.taskInput.value, elements.quadrantSelect.value);
  if (!didAdd) return;
  elements.taskInput.value = "";
  elements.taskInput.focus();
}

function initQuickAdd() {
  elements.addTaskButton.addEventListener("click", () => {
    submitQuickAdd();
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
  initQuickAdd();
  initPerQuadrantAdd();
  initClearAll();
  initMoveSheet();
  initGlobalTooltip();
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
