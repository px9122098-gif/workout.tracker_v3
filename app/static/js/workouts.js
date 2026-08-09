import {
    createWorkout,
    deleteWorkout,
    getWorkoutDetails,
    getWorkoutsOverview,
    readApiError,
} from "./api.js";
import { showPage } from "./navigation.js";
import { formatDate } from "./utils.js";
import { renderWorkoutDetails } from "./workoutDetails.js";


const workoutNameInput = document.querySelector("#workoutNameInput");
const workoutsList = document.querySelector("#workoutsList");
const workoutDetails = document.querySelector("#workoutDetails");
const workoutsMonthTitle = document.querySelector("#workoutsMonthTitle");

const workoutsBrowserView = document.querySelector("#workoutsBrowserView");
const workoutEditorView = document.querySelector("#workoutEditorView");
const closeWorkoutEditorBtn = document.querySelector("#closeWorkoutEditorBtn");

const openCreateWorkoutBtn = document.querySelector("#openCreateWorkoutBtn");
const createWorkoutPanel = document.querySelector("#createWorkoutPanel");
const createWorkoutForm = document.querySelector("#createWorkoutForm");
const cancelCreateWorkoutBtn = document.querySelector("#cancelCreateWorkoutBtn");
const openWorkoutButtons = document.querySelectorAll(".js-open-workouts");

const workoutSearchInput = document.querySelector("#workoutSearchInput");
const workoutSortSelect = document.querySelector("#workoutSortSelect");
const workoutFilterButtons = document.querySelectorAll("[data-workout-filter]");

const monthWorkoutCount = document.querySelector("#monthWorkoutCount");
const monthExerciseCount = document.querySelector("#monthExerciseCount");
const monthSetCount = document.querySelector("#monthSetCount");
const monthVolume = document.querySelector("#monthVolume");

const activityMonthTitle = document.querySelector("#activityMonthTitle");
const activityGrid = document.querySelector("#activityGrid");
const monthlySummaryList = document.querySelector("#monthlySummaryList");

let currentOverview = null;
let selectedFilter = "all";

export function renderWorkoutCard(workout) {
    const card = document.createElement("article");
    card.className = "workout-card";

    const header = document.createElement("div");
    header.className = "workout-card-header";

    const icon = document.createElement("div");
    icon.className = "workout-card-icon";
    icon.textContent = workout.title.trim().charAt(0).toUpperCase() || "W";

    const info = document.createElement("div");
    info.className = "workout-card-info";

    const titleRow = document.createElement("div");
    titleRow.className = "workout-card-title-row";

    const title = document.createElement("h3");
    title.className = "workout-card-title";
    title.textContent = workout.title;

    const status = document.createElement("span");
    status.className = workout.completed_at
        ? "workout-status is-completed"
        : "workout-status is-draft";
    status.textContent = workout.completed_at ? "Completed" : "In progress";

    const date = document.createElement("time");
    date.className = "workout-card-date";
    date.dateTime = workout.date;
    date.textContent = formatDate(workout.date);

    const notes = document.createElement("p");
    notes.className = "workout-card-notes";
    notes.textContent = workout.notes || "No notes added.";

    titleRow.append(title, status);
    info.append(titleRow, date, notes);
    header.append(icon, info);

    const stats = document.createElement("div");
    stats.className = "workout-card-stats";

    [
        [workout.exercise_count, "exercises"],
        [workout.set_count, "sets"],
        [Math.round(Number(workout.volume)).toLocaleString(), "kg volume"],
    ].forEach(function ([value, label]) {
        const item = document.createElement("div");
        const strong = document.createElement("strong");
        const span = document.createElement("span");
        strong.textContent = value;
        span.textContent = label;
        item.append(strong, span);
        stats.append(item);
    });

    const footer = document.createElement("div");
    footer.className = "workout-card-footer";

    const detailsButton = document.createElement("button");
    detailsButton.type = "button";
    detailsButton.className = "details-btn";
    detailsButton.textContent = "View workout";

    const actionsMenu = document.createElement("details");
    actionsMenu.className = "workout-card-actions-menu";

    const actionsTrigger = document.createElement("summary");
    actionsTrigger.className = "workout-card-actions-trigger";
    actionsTrigger.setAttribute("aria-label", `More actions for ${workout.title}`);
    actionsTrigger.title = "More actions";
    actionsTrigger.textContent = "\u22ef";

    const actionsPopover = document.createElement("div");
    actionsPopover.className = "workout-card-actions-popover";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-workout-btn";
    deleteButton.textContent = "Delete workout";
    actionsPopover.append(deleteButton);
    actionsMenu.append(actionsTrigger, actionsPopover);

    const arrow = document.createElement("span");
    arrow.className = "workout-card-arrow";
    arrow.setAttribute("aria-hidden", "true");

    detailsButton.addEventListener("click", async function () {
        try {
            await openWorkoutEditor(workout.id);
        } catch (error) {
            showWorkoutListMessage(error.message, "error");
        }
    });

    deleteButton.addEventListener("click", async function () {
        actionsMenu.open = false;
        if (!confirm(`Delete "${workout.title}"?`)) {
            return;
        }

        deleteButton.disabled = true;
        deleteButton.textContent = "Deleting...";

        try {
            const response = await deleteWorkout(workout.id);

            if (!response.ok) {
                throw new Error(await readApiError(response, "Workout was not deleted."));
            }

            await loadWorkouts();
            document.dispatchEvent(new CustomEvent("workout:updated"));
        } catch (error) {
            deleteButton.disabled = false;
            deleteButton.textContent = "Delete workout";
            showWorkoutListMessage(error.message, "error");
        }
    });

    footer.append(detailsButton, arrow);
    card.append(actionsMenu, header, stats, footer);
    return card;
}

function showWorkoutListMessage(message, kind = "empty") {
    workoutsList.replaceChildren();
    const state = document.createElement("div");
    state.className = `workouts-empty-state is-${kind}`;
    state.textContent = message;
    workoutsList.append(state);
}

function getVisibleWorkouts() {
    if (!currentOverview) {
        return [];
    }

    const query = workoutSearchInput.value.trim().toLowerCase();
    const direction = workoutSortSelect.value === "oldest" ? 1 : -1;

    return currentOverview.workouts
        .filter(function (workout) {
            if (selectedFilter === "completed" && !workout.completed_at) {
                return false;
            }
            if (selectedFilter === "draft" && workout.completed_at) {
                return false;
            }

            if (!query) {
                return true;
            }

            return [workout.title, workout.notes || ""]
                .some((value) => value.toLowerCase().includes(query));
        })
        .sort(function (left, right) {
            return direction * (new Date(left.date) - new Date(right.date));
        });
}

function renderWorkoutCollection() {
    workoutsList.replaceChildren();
    const workouts = getVisibleWorkouts();

    if (workouts.length === 0) {
        const hasAnyWorkouts = currentOverview?.workouts.length > 0;
        showWorkoutListMessage(
            hasAnyWorkouts
                ? "No workouts match these filters."
                : "No workouts recorded this month yet.",
        );
        return;
    }

    workouts.forEach((workout) => workoutsList.append(renderWorkoutCard(workout)));
}

function renderMonthlyAnalytics(summary) {
    monthWorkoutCount.textContent = summary.workouts;
    monthExerciseCount.textContent = summary.exercises;
    monthSetCount.textContent = summary.sets;
    monthVolume.textContent = `${Math.round(Number(summary.volume)).toLocaleString()} kg`;
    renderMonthlySummary(summary);
}

function renderMonthActivity(activity, year, month) {
    const monthIndex = month - 1;
    const effortLevels = { light: 1, moderate: 2, hard: 3, very_hard: 4 };

    activityGrid.replaceChildren();

    const firstDayOffset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const activityByDay = new Map(activity.map((item) => [item.day, item]));

    for (let index = 0; index < firstDayOffset; index += 1) {
        const emptyCell = document.createElement("span");
        emptyCell.className = "activity-day is-empty";
        activityGrid.append(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const dayActivity = activityByDay.get(day);
        const count = dayActivity?.workouts ?? 0;
        const effort = dayActivity?.effort_level ?? null;
        let levelClass = "level-0";

        if (dayActivity && effort === null) {
            levelClass = "level-unrated";
        } else if (effort !== null) {
            levelClass = `level-${effortLevels[effort]}`;
        }

        const cell = document.createElement("span");
        cell.className = `activity-day ${levelClass}`;
        cell.title = !dayActivity
            ? `${day}: No workouts`
            : `${day}: ${count} workout${count === 1 ? "" : "s"}${effort ? `, ${effort.replace("_", " ")}` : ", not rated"}`;
        activityGrid.append(cell);
    }

    const monthName = new Date(year, monthIndex, 1)
        .toLocaleDateString("en-US", { month: "long" });
    activityMonthTitle.textContent = `${monthName} activity`;
}

function createSummaryRow(mark, value, label) {
    const row = document.createElement("div");
    row.className = "summary-row";

    const icon = document.createElement("span");
    icon.className = "summary-row-icon";
    icon.textContent = mark;

    const content = document.createElement("div");
    const strong = document.createElement("strong");
    const span = document.createElement("span");
    strong.textContent = value;
    span.textContent = label;
    content.append(strong, span);
    row.append(icon, content);
    return row;
}

function renderMonthlySummary(summary) {
    monthlySummaryList.replaceChildren(
        createSummaryRow("W", summary.workouts, "Workouts this month"),
        createSummaryRow("S", summary.strongest_week, "Strongest week"),
        createSummaryRow("M", summary.most_trained || "No workouts", "Most trained this month"),
    );
}

export function setupWorkouts() {
    openCreateWorkoutBtn.addEventListener("click", openCreateWorkoutForm);
    cancelCreateWorkoutBtn.addEventListener("click", closeCreateWorkoutForm);

    createWorkoutForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const workoutName = workoutNameInput.value.trim();

        if (!workoutName) {
            workoutNameInput.focus();
            return;
        }

        const submitButton = createWorkoutForm.querySelector('[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = "Creating...";

        try {
            const response = await createWorkout(workoutName);

            if (!response.ok) {
                throw new Error(await readApiError(response, "Workout was not created."));
            }

            const newWorkout = await response.json();
            closeCreateWorkoutForm();
            await loadWorkouts();
            document.dispatchEvent(new CustomEvent("workout:updated"));
            await openWorkoutEditor(newWorkout.id);
        } catch (error) {
            showWorkoutListMessage(error.message, "error");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Create";
        }
    });

    openWorkoutButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            showPage("workoutsPage");
            showWorkoutsBrowser();

            if (button.dataset.workoutAction === "create") {
                openCreateWorkoutForm();
            }
        });
    });

    closeWorkoutEditorBtn.addEventListener("click", closeWorkoutEditor);
    workoutEditorView.addEventListener("click", function (event) {
        if (event.target === workoutEditorView) {
            closeWorkoutEditor();
        }
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !workoutEditorView.hidden) {
            closeWorkoutEditor();
        }
    });
    document.addEventListener("app:page-changed", function (event) {
        if (event.detail.pageId !== "workoutsPage" && !workoutEditorView.hidden) {
            showWorkoutsBrowser();
        }
    });
    workoutSearchInput.addEventListener("input", renderWorkoutCollection);
    workoutSortSelect.addEventListener("change", renderWorkoutCollection);

    workoutFilterButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            selectedFilter = button.dataset.workoutFilter;
            workoutFilterButtons.forEach((candidate) => {
                candidate.classList.toggle("active", candidate === button);
            });
            renderWorkoutCollection();
        });
    });

    document.addEventListener("workout:updated", async function () {
        try {
            await loadWorkouts();
        } catch (error) {
            console.error("Workout overview was not refreshed", error);
        }
    });
}

export async function loadWorkouts() {
    const now = new Date();
    const response = await getWorkoutsOverview(now.getFullYear(), now.getMonth() + 1);

    if (!response.ok) {
        throw new Error(await readApiError(response, "Workout overview was not loaded."));
    }

    currentOverview = await response.json();
    const displayedMonth = new Date(currentOverview.year, currentOverview.month - 1, 1);

    workoutsMonthTitle.textContent = displayedMonth.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });

    renderWorkoutCollection();
    renderMonthlyAnalytics(currentOverview.summary);
    renderMonthActivity(
        currentOverview.activity,
        currentOverview.year,
        currentOverview.month,
    );
}

export async function openWorkoutEditor(workoutId) {
    workoutEditorView.hidden = false;
    document.body.classList.add("workout-modal-open");
    workoutDetails.innerHTML = '<p class="workout-editor-loading">Loading workout...</p>';
    closeWorkoutEditorBtn.focus();

    const response = await getWorkoutDetails(workoutId);

    if (!response.ok) {
        showWorkoutsBrowser();
        throw new Error(await readApiError(response, "Workout details were not loaded."));
    }

    const workout = await response.json();
    renderWorkoutDetails(workout);
}

export function showWorkoutsBrowser() {
    workoutsBrowserView.hidden = false;
    workoutEditorView.hidden = true;
    document.body.classList.remove("workout-modal-open");
    workoutDetails.replaceChildren();
}

export async function closeWorkoutEditor() {
    showWorkoutsBrowser();
    await loadWorkouts();
}

export function resetWorkoutsView() {
    currentOverview = null;
    workoutSearchInput.value = "";
    workoutSortSelect.value = "newest";
    selectedFilter = "all";
    workoutFilterButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.workoutFilter === "all");
    });
    closeCreateWorkoutForm();
    showWorkoutsBrowser();
}

function openCreateWorkoutForm() {
    createWorkoutPanel.hidden = false;
    openCreateWorkoutBtn.setAttribute("aria-expanded", "true");
    createWorkoutPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    workoutNameInput.focus();
}

function closeCreateWorkoutForm() {
    createWorkoutPanel.hidden = true;
    openCreateWorkoutBtn.setAttribute("aria-expanded", "false");
    createWorkoutForm.reset();
}
