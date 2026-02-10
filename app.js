const STORAGE_KEY = "eisenhower_matrix_v1";
const COMPLETE_HOLD_DELAY_MS = 500;
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
  lists: Array.from(document.querySelectorAll(".task-list")),
  addButtons: Array.from(document.querySelectorAll("[data-add]")),
};

let state = {
  version: 1,
  updatedAt: null,
  tasks: [],
  lastQuadrant: "do_first",
};

let saveTimer = null;

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
          ...task,
          completed: Boolean(task.completed),
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
    completed: false,
    createdAt: now,
    updatedAt: now,
  });
  state.lastQuadrant = quadrant;
  render();
  saveStateDebounced();
  return true;
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

function toggleTaskDone(id, completed) {
  updateTask(id, { completed });
}

function reorderFromDOM() {
  const orderedIds = [];
  elements.lists.forEach((list) => {
    list.querySelectorAll("[data-id]").forEach((item) => {
      orderedIds.push(item.getAttribute("data-id"));
    });
  });

  const map = new Map(state.tasks.map((task) => [task.id, task]));
  const orderedTasks = [];
  orderedIds.forEach((id) => {
    const task = map.get(id);
    if (task) orderedTasks.push(task);
    map.delete(id);
  });

  map.forEach((task) => orderedTasks.push(task));
  state.tasks = orderedTasks;
}

function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = "task";
  if (task.completed) {
    li.classList.add("task--done");
  }
  li.setAttribute("data-id", task.id);

  const topRow = document.createElement("div");
  topRow.className = "task-top";

  const textSpan = document.createElement("span");
  textSpan.className = "task-text";
  textSpan.textContent = task.text;
  textSpan.title = "Click to edit";

  const taskActions = document.createElement("div");
  taskActions.className = "task-actions";

  const doneButton = document.createElement("button");
  doneButton.type = "button";
  doneButton.className = "icon-btn";
  doneButton.setAttribute("aria-label", task.completed ? "Mark task as not done" : "Mark task as done");
  doneButton.textContent = "✓";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "icon-btn";
  deleteButton.setAttribute("aria-label", "Delete task");
  deleteButton.textContent = "×";

  doneButton.addEventListener("click", () => {
    toggleTaskDone(task.id, !task.completed);
  });

  deleteButton.addEventListener("click", () => {
    deleteTask(task.id);
  });

  taskActions.appendChild(doneButton);
  taskActions.appendChild(deleteButton);

  topRow.appendChild(textSpan);
  topRow.appendChild(taskActions);

  let holdTimer = null;
  let holdTriggered = false;

  const clearHoldTimer = () => {
    if (!holdTimer) return;
    window.clearTimeout(holdTimer);
    holdTimer = null;
  };

  const startHold = (event) => {
    if (event.target.closest("button, .task-edit")) return;
    clearHoldTimer();
    holdTriggered = false;
    holdTimer = window.setTimeout(() => {
      holdTriggered = true;
      toggleTaskDone(task.id, !task.completed);
    }, COMPLETE_HOLD_DELAY_MS);
  };

  const endHold = () => {
    clearHoldTimer();
    if (!holdTriggered) return;
    window.setTimeout(() => {
      holdTriggered = false;
    }, 0);
  };

  textSpan.addEventListener("click", () => {
    if (holdTriggered) {
      holdTriggered = false;
      return;
    }
    startInlineEdit(task, textSpan);
  });

  li.addEventListener("pointerdown", startHold);
  li.addEventListener("pointerup", endHold);
  li.addEventListener("pointerleave", clearHoldTimer);
  li.addEventListener("pointercancel", clearHoldTimer);

  li.appendChild(topRow);

  return li;
}

function startInlineEdit(task, textNode) {
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

function initDragAndDrop() {
  if (!window.Sortable) return;
  elements.lists.forEach((list) => {
    Sortable.create(list, {
      group: "matrix",
      animation: 150,
      emptyInsertThreshold: 9999,
      fallbackTolerance: 3,
      forceFallback: true,
      fallbackOnBody: true,
      delay: 150,
      delayOnTouchOnly: true,
      touchStartThreshold: 4,
      filter: ".icon-btn, .task-edit",
      preventOnFilter: false,
      onEnd: (event) => {
        const movedId = event.item.getAttribute("data-id");
        const newQuadrant = event.to.getAttribute("data-list");
        const task = state.tasks.find((item) => item.id === movedId);
        if (task) {
          task.quadrant = newQuadrant;
        }
        reorderFromDOM();
        saveStateDebounced();
      },
    });
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

function init() {
  loadState();
  elements.quadrantSelect.value = state.lastQuadrant || "do_first";
  render();
  initQuickAdd();
  initPerQuadrantAdd();
  initClearAll();
  initDragAndDrop();
}


document.addEventListener("keydown", (event) => {
  if (!isInlineEditingActive()) return;
  if (event.key === "Enter" || event.key === "Escape") {
    event.stopPropagation();
  }
});

init();
