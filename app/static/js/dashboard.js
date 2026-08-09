import {
    getPersonalRecords,
    getProgressOverview,
    getWorkouts,
} from "./api.js";
import { showPage } from "./navigation.js";
import { formatDate } from "./utils.js";
import { openWorkoutEditor } from "./workouts.js";


const SVG_NS = "http://www.w3.org/2000/svg";
const dashboardNavButton = document.querySelector('[data-page="dashboardPage"]');

const dashboardWeekWorkouts = document.querySelector("#dashboardWeekWorkouts");
const dashboardWeekVolume = document.querySelector("#dashboardWeekVolume");
const dashboardWeekStreak = document.querySelector("#dashboardWeekStreak");
const dashboardWeekChart = document.querySelector("#dashboardWeekChart");
const dashboardRecentWorkouts = document.querySelector("#dashboardRecentWorkouts");

const dashboardGoalRing = document.querySelector("#dashboardGoalRing");
const dashboardGoalValue = document.querySelector("#dashboardGoalValue");
const dashboardGoalTitle = document.querySelector("#dashboardGoalTitle");
const dashboardGoalMessage = document.querySelector("#dashboardGoalMessage");

const dashboardRecordName = document.querySelector("#dashboardRecordName");
const dashboardRecordValue = document.querySelector("#dashboardRecordValue");
const dashboardRecordDate = document.querySelector("#dashboardRecordDate");
const dashboardStatus = document.querySelector("#dashboardStatus");
const viewGoalsButton = document.querySelector(".goal-card .text-action");

export function setupDashboard() {
    dashboardNavButton.addEventListener("click", loadDashboard);
    viewGoalsButton.addEventListener("click", function () {
        showPage("progressPage");
    });

    document.addEventListener("workout:updated", async function () {
        try {
            await loadDashboard();
        } catch (error) {
            console.error("Dashboard overview was not refreshed", error);
        }
    });
}

export async function loadDashboard() {
    dashboardStatus.textContent = "Loading dashboard...";

    try {
        const [progressResponse, workoutsResponse, recordsResponse] =
            await Promise.all([
                getProgressOverview(3),
                getWorkouts(),
                getPersonalRecords(1),
            ]);

        const responses = [progressResponse, workoutsResponse, recordsResponse];

        if (responses.some((response) => !response.ok)) {
            throw new Error("Dashboard data could not be loaded.");
        }

        const [progress, workouts, records] = await Promise.all([
            progressResponse.json(),
            workoutsResponse.json(),
            recordsResponse.json(),
        ]);

        const currentWeek = findCurrentWeek(progress.weekly_volume);

        renderDashboardWeek(
            currentWeek,
            progress.consistency,
            progress.weekly_volume,
        );
        renderRecentWorkouts(workouts);
        renderDashboardRecord(records);
        renderDashboardGoal(currentWeek?.workouts ?? 0);

        dashboardStatus.textContent = "";
    } catch (error) {
        dashboardStatus.textContent = error.message;
        throw error;
    }
}

function findCurrentWeek(weeklyVolume) {
    const today = new Date();
    const todayKey = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
    ].join("-");

    return [...weeklyVolume]
        .reverse()
        .find((week) => week.week_start <= todayKey);
}

function renderDashboardWeek(currentWeek, consistency, weeklyVolume) {
    const week = currentWeek ?? { workouts: 0, volume: 0 };

    dashboardWeekWorkouts.textContent = week.workouts;
    dashboardWeekVolume.textContent =
        `${Math.round(Number(week.volume)).toLocaleString()} kg`;
    dashboardWeekStreak.textContent = consistency.current_week_streak;

    renderDashboardVolumeChart(weeklyVolume.slice(-8));
}

function createSvgElement(tagName, attributes = {}) {
    const element = document.createElementNS(SVG_NS, tagName);

    Object.entries(attributes).forEach(function ([name, value]) {
        element.setAttribute(name, String(value));
    });

    return element;
}

function renderDashboardVolumeChart(weeks) {
    dashboardWeekChart.replaceChildren();

    if (weeks.length === 0) {
        const message = document.createElement("p");
        message.className = "dashboard-chart-empty";
        message.textContent = "Complete a workout to start your chart.";
        dashboardWeekChart.append(message);
        return;
    }

    const width = 640;
    const height = 96;
    const paddingX = 18;
    const paddingY = 14;
    const values = weeks.map((week) => Number(week.volume));
    const maxValue = Math.max(...values, 1);
    const horizontalStep = weeks.length === 1
        ? 0
        : (width - paddingX * 2) / (weeks.length - 1);

    const points = values.map(function (value, index) {
        return {
            x: weeks.length === 1 ? width / 2 : paddingX + index * horizontalStep,
            y: height - paddingY - (value / maxValue) * (height - paddingY * 2),
        };
    });

    const svg = createSvgElement("svg", {
        class: "dashboard-volume-svg",
        viewBox: `0 0 ${width} ${height}`,
        role: "img",
        "aria-label": "Training volume for the latest weeks",
    });

    const areaPoints = [
        `${points[0].x},${height - paddingY}`,
        ...points.map((point) => `${point.x},${point.y}`),
        `${points.at(-1).x},${height - paddingY}`,
    ].join(" ");

    svg.append(
        createSvgElement("polygon", {
            class: "dashboard-volume-area",
            points: areaPoints,
        }),
        createSvgElement("polyline", {
            class: "dashboard-volume-line",
            points: points.map((point) => `${point.x},${point.y}`).join(" "),
        }),
    );

    points.forEach(function (point, index) {
        const dot = createSvgElement("circle", {
            class: "dashboard-volume-dot",
            cx: point.x,
            cy: point.y,
            r: 4,
        });
        const label = `${Math.round(values[index]).toLocaleString()} kg`;
        dot.setAttribute("aria-label", label);

        const title = createSvgElement("title");
        title.textContent = label;
        dot.append(title);
        svg.append(dot);
    });

    dashboardWeekChart.append(svg);
}

function renderRecentWorkouts(workouts) {
    const recentWorkouts = [...workouts]
        .sort((left, right) => new Date(right.date) - new Date(left.date))
        .slice(0, 3);

    dashboardRecentWorkouts.replaceChildren();

    if (recentWorkouts.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "dashboard-empty-state";
        emptyState.innerHTML = "<strong>No workouts yet</strong><span>Start a session and it will appear here.</span>";
        dashboardRecentWorkouts.append(emptyState);
        return;
    }

    recentWorkouts.forEach(function (workout) {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "recent-workout-row";

        const mark = document.createElement("span");
        mark.className = "recent-workout-icon";
        mark.textContent = workout.title.trim().charAt(0).toUpperCase() || "W";

        const info = document.createElement("span");
        info.className = "recent-workout-info";

        const name = document.createElement("strong");
        name.textContent = workout.title;

        const meta = document.createElement("span");
        meta.textContent = `${formatDate(workout.date)} | ${workout.completed_at ? "Completed" : "In progress"}`;

        info.append(name, meta);

        const arrow = document.createElement("span");
        arrow.className = "recent-workout-arrow";
        arrow.setAttribute("aria-hidden", "true");

        row.append(mark, info, arrow);
        row.addEventListener("click", async function () {
            showPage("workoutsPage");
            try {
                await openWorkoutEditor(workout.id);
            } catch (error) {
                dashboardStatus.textContent = error.message;
            }
        });

        dashboardRecentWorkouts.append(row);
    });
}

function renderDashboardRecord(records) {
    if (records.length === 0) {
        dashboardRecordName.textContent = "No record yet";
        dashboardRecordValue.textContent = "--";
        dashboardRecordDate.textContent = "Complete a weighted workout";
        return;
    }

    const record = records[0];
    dashboardRecordName.textContent = record.exercise_name;
    dashboardRecordValue.textContent = Number(record.estimated_1rm)
        .toLocaleString("en-US", { maximumFractionDigits: 1 });
    dashboardRecordDate.textContent =
        `Estimated on ${formatDate(record.workout_date)}`;
}

function renderDashboardGoal(workoutCount) {
    const weeklyGoal = 5;
    const completed = Math.min(workoutCount, weeklyGoal);
    const percent = Math.min(workoutCount / weeklyGoal, 1) * 100;

    dashboardGoalRing.style.setProperty("--goal-progress", `${percent}%`);
    dashboardGoalValue.textContent = completed;

    const remaining = Math.max(weeklyGoal - workoutCount, 0);

    if (workoutCount === 0) {
        dashboardGoalTitle.textContent = "Start your weekly goal";
        dashboardGoalMessage.textContent = "Complete your first workout to begin.";
    } else if (remaining > 0) {
        dashboardGoalTitle.textContent =
            `${remaining} workout${remaining === 1 ? "" : "s"} left`;
        dashboardGoalMessage.textContent =
            "Keep going. Your weekly goal is within reach.";
    } else {
        dashboardGoalTitle.textContent = "Weekly goal complete";
        dashboardGoalMessage.textContent =
            "Great work. Every additional workout is a bonus.";
    }
}
