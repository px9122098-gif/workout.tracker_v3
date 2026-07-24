import { getProgressOverview } from "./api.js";


const progressNavButton = document.querySelector('[data-page="progressPage"]');
const periodButtons = document.querySelectorAll(".progress-period-button");

const progressStatus = document.querySelector("#progressStatus");
const trendTitle = document.querySelector("#progressTrendTitle");
const trendValue = document.querySelector("#progressTrendValue");
const trendDescription = document.querySelector("#progressTrendDescription");
const totalVolume = document.querySelector("#progressTotalVolume");
const weeklyVolumeChart = document.querySelector("#weeklyVolumeChart");

let selectedMonths = 6;

export function setupProgress() {
    progressNavButton.addEventListener("click", function () {
        loadProgress(selectedMonths);
    });

    periodButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            selectedMonths = Number(button.dataset.months);

            periodButtons.forEach(function (periodButton) {
                periodButton.classList.toggle(
                    "is-active",
                    periodButton === button
                );
            });

            loadProgress(selectedMonths);
        });
    });
}

export async function loadProgress(months = selectedMonths) {
    progressStatus.textContent = "Loading progress...";

    try {
        const response = await getProgressOverview(months);

        if (!response.ok) {
            throw new Error("Progress was not loaded");
        }

        const progress = await response.json();

        renderProgressSummary(progress.summary);
        renderWeeklyVolume(progress.weekly_volume);

        progressStatus.textContent = "";
    } catch (error) {
        progressStatus.textContent = error.message;
    }
}

function renderProgressSummary(summary) {
    const volume = Number(summary.volume);

    totalVolume.textContent = `${Math.round(volume).toLocaleString()} kg`;

    if (summary.volume_change_percent === null) {
        trendTitle.textContent = "Your progress starts here";
        trendValue.textContent = "-";
        trendDescription.textContent = "Complete more workouts to compare training periods.";

        return;
    }

    const changePercent = Number(
        summary.volume_change_percent
    );

    const formattedPercent = Math.abs(changePercent)
        .toLocaleString("en-US", {
            maximumFractionDigits: 1,
        });

    if (changePercent > 0) {
        trendTitle.textContent = "Your training is trending up";
        trendValue.textContent = `+${formattedPercent}%`;
        trendDescription.textContent = 
            `Training volume is up ${formattedPercent}% ` +
            "from the previous period.";
        
        return;
    }

    if (changePercent < 0) {
        trendTitle.textContent = "Your training volume is down";
        trendValue.textContent = `-${formattedPercent}%`;
        trendDescription.textContent = 
            `Training volume is down ${formattedPercent}% ` +
            "from the previous period.";

        return;
    }

    trendTitle.textContent = "Your training is holding steady";
    trendValue.textContent = "0%";
    trendDescription.textContent = "Training matches the previous period.";
}

function renderWeeklyVolume(items) {
    weeklyVolumeChart.replaceChildren();

    if (items.length === 0) {
        weeklyVolumeChart.textContent = "No completed workouts in this period.";
        weeklyVolumeChart.classList.add("is-empty");
        return;
    }

    weeklyVolumeChart.classList.remove("is-empty");

    const volumes = items.map(function (item) {
        return Number(item.volume);
    });

    const maxVolume = Math.max(...volumes, 1);

    items.forEach(function (item) {
        const volume = Number(item.volume);
        const heightPercent = volume === 0
            ? 0
            : Math.max(volume / maxVolume * 100, 6);
        
        const weekStart = new Date(`${item.week_start}T00:00:00`);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const column = document.createElement("div");
        column.className = "weekly-volume-column";

        const value = document.createElement("span");
        value.className = "weekly-volume-value";
        value.textContent = new Intl.NumberFormat("en-US", {
            notation: "compact",
            maximumFractionDigits: 1,
        }).format(volume);

        const track = document.createElement("div");
        track.className = "weekly-volume-track";

        const bar = document.createElement("div");
        bar.className = "weekly-volume-bar";
        bar.style.height = `${heightPercent}%`;
        bar.title =
            `${volume.toLocaleString()} kg, ` +
            `${item.workouts} workout(s)`;

        const label = document.createElement("time");
        label.className = "weekly-volume-label";
        label.dateTime = item.week_start;
        label.textContent = formatWeekRange(
            weekStart,
            weekEnd
        );

        track.appendChild(bar);
        column.append(value, track, label);
        weeklyVolumeChart.appendChild(column);
    });
}

function formatWeekRange(start, end) {
    const formatter = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
    });

    return `${formatter.format(start)}-${formatter.format(end)}`;
}