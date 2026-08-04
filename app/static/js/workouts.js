import {
    getWorkoutsOverview,
    createWorkout,
    getWorkoutDetails,
    deleteWorkout,
} from "./api.js";
import { renderWorkoutDetails } from "./workoutDetails.js";
import { formatDate } from "./utils.js";
import { showPage } from "./navigation.js";

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

const monthWorkoutCount = document.querySelector("#monthWorkoutCount");
const monthExerciseCount = document.querySelector("#monthExerciseCount");
const monthSetCount = document.querySelector("#monthSetCount");
const monthVolume = document.querySelector("#monthVolume");

const activityMonthTitle = document.querySelector("#activityMonthTitle");
const activityGrid = document.querySelector("#activityGrid");
const monthlySummaryList = document.querySelector("#monthlySummaryList");

export function renderWorkoutCard(workout) {
    const stats = {
        exercises: workout.exercise_count,
        sets: workout.set_count,
        volume: Number(workout.volume),
    };

    const workoutCard = document.createElement("div");
    workoutCard.classList.add("workout-card");

    workoutCard.innerHTML = `
        <div class="workout-card-header">
            <div class="workout-card-icon"></div>
            <div class="workout-card-info">
                <h3 class="workout-card-title"></h3>
                <time class="workout-card-date"></time>
                <p class="workout-card-notes"></p>
            </div>
        </div>

        <div class="workout-card-stats"></div>

        <div class="workout-card-footer">
            <button type="button" class="details-btn">View workout</button>
            <span class="workout-card-arrow"></span>
        </div>
    `;

    workoutCard.querySelector(".workout-card-title").textContent = workout.title;
    workoutCard.querySelector(".workout-card-date").textContent = formatDate(workout.date);
    workoutCard.querySelector(".workout-card-notes").textContent = workout.notes || "No notes added.";

    const statsElement = workoutCard.querySelector(".workout-card-stats");

    statsElement.innerHTML = `
        <div><strong>${stats.exercises}</strong><span>exercises</span></div>
        <div><strong>${stats.sets}</strong><span>sets</span></div>
        <div><strong>${Math.round(stats.volume).toLocaleString()}</strong><span>kg volume</span></div>
    `

    const initial = workout.title.trim().charAt(0).toUpperCase() || "W";
    workoutCard.querySelector(".workout-card-icon").textContent = initial;

    const detailsBtn = workoutCard.querySelector(".details-btn");

    detailsBtn.addEventListener("click", async function () {
        try {
            await openWorkoutEditor(workout.id);
        } catch (error) {
            alert(error.message);
        }
    });

    const deleteWorkoutBtn = document.createElement("button");
    deleteWorkoutBtn.textContent = "Delete";
    deleteWorkoutBtn.classList.add("delete-workout-btn");

    deleteWorkoutBtn.addEventListener("click", async function () {
        const confirmed = confirm("Delete this workout?");

        if (!confirmed) {
            return;
        }

        deleteWorkoutBtn.disabled = true;
        deleteWorkoutBtn.textContent = "Deleting...";

        const response = await deleteWorkout(workout.id);

        if (!response.ok) {
            alert("Workout was not deleted");
            deleteWorkoutBtn.disabled = false;
            deleteWorkoutBtn.textContent = "Delete";
            return;
        }

        workoutCard.remove();
        await loadWorkouts();

        workoutDetails.innerHTML = `
            <h2>Workout Details</h2>
            <p>Select workout to see details</p>
        `;
    });
    
    const workoutCardFooter = workoutCard.querySelector(".workout-card-footer");
    const arrow = workoutCard.querySelector(".workout-card-arrow");
    workoutCardFooter.insertBefore(deleteWorkoutBtn, arrow);

    workoutsList.appendChild(workoutCard);
}


function renderMonthlyAnalytics(summary) {
    monthWorkoutCount.textContent = summary.workouts;
    monthExerciseCount.textContent = summary.exercises;
    monthSetCount.textContent = summary.sets;
    monthVolume.innerHTML =
        `${Math.round(Number(summary.volume)).toLocaleString()} <small>kg</small>`;

    renderMonthlySummary(summary);
}

function renderMonthActivity(activity, year, month) {
    const monthIndex = month - 1;

    const effortLevels = {
        light: 1,
        moderate: 2,
        hard: 3,
        very_hard: 4,
    };

    activityGrid.replaceChildren();

    const firstDayOffset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    const activityByDay = new Map(
        activity.map(function (item) {
            return [item.day, item];
        })
    );

    for (let index = 0; index < firstDayOffset; index += 1) {
        const emptyCell = document.createElement("span");
        emptyCell.classList.add("activity-day", "is-empty");
        activityGrid.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const dayActivity = activityByDay.get(day);

        const count = dayActivity?.workouts ?? 0;
        const effort = dayActivity?.effort_level ?? null;

        let levelClass = "level-0";

        if (dayActivity && effort === null) {
            levelClass = "level-unrated";
        }

        if (effort !== null) {
            levelClass = `level-${effortLevels[effort]}`;
        }

        const cell = document.createElement("span");
        cell.classList.add("activity-day", levelClass);
        
        if (!dayActivity) {
            cell.title = `${day}: No workouts`;
        } else if (effort === null) {
            cell.title = `${day}: ${count} workout(s), not rated`;
        } else {
            cell.title = `${day}: ${count} workout(s), ${effort}`;
        }

        activityGrid.appendChild(cell);
    }

    const monthName = new Date(year, monthIndex, 1)
        .toLocaleDateString("en-US", { month: "long" });

    activityMonthTitle.textContent = `${monthName} activity`;
}

function renderMonthlySummary(summary) {
    monthlySummaryList.innerHTML = `
        <div class="summary-row">
            <span class="summary-row-icon">W</span>
            <div>
                <strong>${summary.workouts}</strong>
                <span>Workouts this month</span>
            </div>
        </div>

        <div class="summary-row">
            <span class="summary-row-icon">S</span>
            <div>
                <strong>${summary.strongest_week}</strong>
                <span>Strongest week</span>
            </div>
        </div>

        <div class="summary-row">
            <span class="summary-row-icon">M</span>
            <div>
                <strong>${summary.most_trained || "No workouts"}</strong>
                <span>Most trained this month</span>
            </div>
        </div>
    `;
}

export function setupWorkouts() {
    openCreateWorkoutBtn.addEventListener("click", openCreateWorkoutForm);
    cancelCreateWorkoutBtn.addEventListener("click", closeCreateWorkoutForm);

    createWorkoutForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const workoutName = workoutNameInput.value.trim();

        if (workoutName === "") {
            alert("Enter workout name");
            return;
        }

        const response = await createWorkout(workoutName);

        if (!response.ok) {
            alert("Workout was not created");
            return;
        }

        const newWorkout = await response.json();

        closeCreateWorkoutForm();
        await loadWorkouts();
        await openWorkoutEditor(newWorkout.id);
    });

    openWorkoutButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            showPage("workoutsPage");
            openCreateWorkoutForm();
        });
    });

    closeWorkoutEditorBtn.addEventListener("click", async () => {
        try {
            await closeWorkoutEditor();
        } catch (error) {
            console.error("Failed to close workout editor:", error);
        }
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
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const response = await getWorkoutsOverview(year, month);

    if (!response.ok) {
        throw new Error("Workout overview was not loaded");
    }

    const overview = await response.json();

    const displayedMonth = new Date(
        overview.year,
        overview.month - 1,
        1,
    );

    workoutsMonthTitle.textContent = displayedMonth.toLocaleDateString(
        "en-US",
        {
            month: "long",
            year: "numeric",
        },
    );

    workoutsList.replaceChildren();

    if (overview.workouts.length === 0) {
        const emptyState = document.createElement("p");
        emptyState.className = "workouts-empty-state";
        emptyState.textContent = "No workouts recorded this month yet.";
        workoutsList.append(emptyState);
    }

    overview.workouts.forEach(function (workout) {
        renderWorkoutCard(workout);
    });

    renderMonthlyAnalytics(overview.summary);
    renderMonthActivity(
        overview.activity,
        overview.year,
        overview.month
    );
}

export async function openWorkoutEditor(workoutId) {
    const response = await getWorkoutDetails(workoutId);

    if (!response.ok) {
        throw new Error("Workout details were not loaded");
    }

    const workout = await response.json();

    workoutsBrowserView.hidden = true;
    workoutEditorView.hidden = false;

    renderWorkoutDetails(workout);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

export async function closeWorkoutEditor() {
    workoutsBrowserView.hidden = false;
    workoutEditorView.hidden = true;
    workoutDetails.replaceChildren();

    await loadWorkouts();

    window.scrollTo({
        top: 0,
        behavior: "smooth",
    });
}

export function resetWorkoutsView() {
    workoutDetails.replaceChildren();
    workoutEditorView.hidden = true;
    workoutsBrowserView.hidden = false;
}

function openCreateWorkoutForm() {
    createWorkoutPanel.hidden = false;
    openCreateWorkoutBtn.setAttribute("aria-expanded", "true");
    workoutNameInput.focus();
}

function closeCreateWorkoutForm() {
    createWorkoutPanel.hidden = true;
    openCreateWorkoutBtn.setAttribute("aria-expanded", "false");
    workoutNameInput.value = "";
}


