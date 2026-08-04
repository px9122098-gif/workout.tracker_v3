import {
    getProgressOverview,
    getWorkouts,
    getPersonalRecords,
} from "./api.js";

import { formatDate } from "./utils.js";


const dashboardNavButton = document.querySelector('[data-page="dashboardPage"]');

const dashboardWeekWorkouts = document.querySelector("#dashboardWeekWorkouts");
const dashboardWeekVolume = document.querySelector("#dashboardWeekVolume");
const dashboardWeekStreak = document.querySelector("#dashboardWeekStreak");
const dashboardRecentWorkouts = document.querySelector("#dashboardRecentWorkouts");

const dashboardGoalRing = document.querySelector("#dashboardGoalRing");
const dashboardGoalValue = document.querySelector("#dashboardGoalValue");

const dashboardRecordName = document.querySelector("#dashboardRecordName");
const dashboardRecordValue = document.querySelector("#dashboardRecordValue");
const dashboardRecordDate = document.querySelector("#dashboardRecordDate");
const dashboardStatus = document.querySelector("#dashboardStatus");

const dashboardGoalTitle = document.querySelector("#dashboardGoalTitle");
const dashboardGoalMessage = document.querySelector("#dashboardGoalMessage");

export function setupDashboard() {
    dashboardNavButton.addEventListener("click", function () {
        loadDashboard();
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
    dashboardStatus.textContent = "Loading...";
    try {
        const [progressResponse, workoutsResponse, recordsResponse] =
        await Promise.all([
            getProgressOverview(3),
            getWorkouts(),
            getPersonalRecords(1),
        ]);

        const responses = [progressResponse, workoutsResponse, recordsResponse]

        const hasFailedResponse = responses.some(function (response) {
            return !response.ok;
        });

        if (hasFailedResponse) {
            throw new Error("Dashboard was not loaded");
        }

        const [progress, workouts, records] = await Promise.all([
            progressResponse.json(),
            workoutsResponse.json(),
            recordsResponse.json(),
        ]);

        const currentWeek = findCurrentWeek(progress.weekly_volume);

        renderDashboardWeek(currentWeek, progress.consistency);
        renderRecentWorkouts(workouts);
        renderDashboardRecord(records);
        renderDashboardGoal(currentWeek?.workouts ?? 0);

        dashboardStatus.textContent = "";
    } catch (error) {
        dashboardStatus.textContent = error.message;
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
        .find(function (week) {
            return week.week_start <= todayKey;
        });
}

function renderDashboardWeek(currentWeek, consistency) {
    const week = currentWeek ?? { workouts: 0, volume: 0 };

    dashboardWeekWorkouts.textContent = week.workouts;
    dashboardWeekVolume.textContent =
        `${Number(week.volume).toLocaleString()} kg`;
    dashboardWeekStreak.textContent =
        consistency.current_week_streak;
}

function renderRecentWorkouts(workouts) {
    const recentWorkouts = [...workouts]
        .sort(function (left, right) {
            return new Date(right.date) - new Date(left.date);
        })
        .slice(0, 3);

    dashboardRecentWorkouts.replaceChildren();
    if (recentWorkouts.length === 0) {
        dashboardRecentWorkouts.textContent = "No workouts yet. Start your first session.";
        return;
    }

    recentWorkouts.forEach(function (workout) {
        const row = document.createElement("article");
        row.className = "recent-workout-row";

        const mark = document.createElement("div");
        mark.className = "recent-workout-icon";
        mark.textContent = workout.title.charAt(0).toUpperCase();

        const info = document.createElement("div");
        info.className = "recent-workout-info";

        const name = document.createElement("strong");
        name.textContent = workout.title;

        const date = document.createElement("span");
        date.textContent = formatDate(workout.date);

        info.append(name, date);

        const arrow = document.createElement("span");
        arrow.className = "recent-workout-arrow"

        row.append(mark, info, arrow);
        dashboardRecentWorkouts.append(row);
    })
}

function renderDashboardRecord(records) {
    if (records.length === 0) {
        dashboardRecordName.textContent = "No record yet";
        dashboardRecordValue.textContent = "--";
        dashboardRecordDate.textContent = "Complete a weighted workout";
    } else {
        const record = records[0];

        dashboardRecordName.textContent = record.exercise_name;
        dashboardRecordValue.textContent =
            Number(record.estimated_1rm).toLocaleString("en-US", {
                maximumFractionDigits: 1,
            });
        dashboardRecordDate.textContent =
            `Estimated on ${formatDate(record.workout_date)}`;
    }
}

function renderDashboardGoal(workoutCount) {
    const WEEKLY_GOAL = 5;
    const completed = Math.min(workoutCount, WEEKLY_GOAL);
    const percent = Math.min(workoutCount / WEEKLY_GOAL, 1) * 100;

    dashboardGoalRing.style.setProperty(
        "--goal-progress",
        `${percent}%`,
    );

    dashboardGoalValue.textContent = completed;

    const remaining = Math.max(WEEKLY_GOAL - workoutCount, 0);

    if (workoutCount === 0) {
        dashboardGoalTitle.textContent = "Start your weekly goal";
        dashboardGoalMessage.textContent =
                "Complete your first workout to begin.";
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

