import {
    getProgressExercises,
    getProgressOverview,
    getStrengthProgress,
} from "./api.js";


const progressNavButton = document.querySelector('[data-page="progressPage"]');
const periodButtons = document.querySelectorAll(".progress-period-button");

const progressStatus = document.querySelector("#progressStatus");
const trendTitle = document.querySelector("#progressTrendTitle");
const trendValue = document.querySelector("#progressTrendValue");
const trendDescription = document.querySelector("#progressTrendDescription");
const totalVolume = document.querySelector("#progressTotalVolume");
const weeklyVolumeChart = document.querySelector("#weeklyVolumeChart");

const strengthExerciseSelect = document.querySelector("#strengthExerciseSelect");
const strengthCurrentValue = document.querySelector("#strengthCurrentValue");
const strengthChange = document.querySelector("#strengthChange");
const strengthStatus = document.querySelector("#strengthStatus");
const strengthChart = document.querySelector("#strengthChart");

let selectedMonths = 6;

let selectedExerciseName = null;
let exerciseOptionsLoaded = false;

export function setupProgress() {
    progressNavButton.addEventListener("click", function () {
        loadProgress(selectedMonths);

        if (!exerciseOptionsLoaded) {
            loadProgressExercises();
        } else if (selectedExerciseName) {
            loadStrengthProgress();
        }
    });

    periodButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            selectedMonths = Number(button.dataset.months);

            periodButtons.forEach(function (periodButton) {
                periodButton.classList.toggle(
                    "is-active",
                    periodButton === button,
                );
            });

            loadProgress(selectedMonths);

            if (selectedExerciseName) {
                loadStrengthProgress();
            }
        });
    });

    strengthExerciseSelect.addEventListener(
        "change",
        function (event) {
            selectedExerciseName = event.target.value;
            loadStrengthProgress();
        },
    );
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

async function loadProgressExercises() {
    strengthStatus.textContent = "Loading exercises...";
    strengthExerciseSelect.disabled = true;

    try {
        const response = await getProgressExercises();

        if (!response.ok) {
            throw new Error("Exercises were not loaded");
        }

        const items = await response.json();

        renderProgressExerciseOptions(items);
        exerciseOptionsLoaded = true;

        if (items.length === 0) {
            selectedExerciseName = null;
            strengthCurrentValue.textContent = "--";
            strengthChange.textContent = "";
            strengthChart.replaceChildren();
            strengthStatus.textContent = "No completed weighted exercises yet.";
            return;
        }

        selectedExerciseName = items[0].name;
        strengthExerciseSelect.value = selectedExerciseName;

        await loadStrengthProgress();
    } catch (error) {
        exerciseOptionsLoaded = false;
        strengthStatus.textContent = error.message;
    }
}

function renderProgressExerciseOptions(items) {
    strengthExerciseSelect.replaceChildren();

    if (items.length === 0) {
        const option = document.createElement("option");

        option.value = "";
        option.textContent = "No weighted exercises";
        
        strengthExerciseSelect.appendChild(option);
        strengthExerciseSelect.disabled = true;
        return;
    }

    items.forEach(function (item) {
        const option = document.createElement("option");

        option.value = item.name;
        option.textContent = item.name;

        strengthExerciseSelect.appendChild(option);
    });

    strengthExerciseSelect.disabled = false;
}

async function loadStrengthProgress() {
    if (!selectedExerciseName) {
        return;
    }

    strengthStatus.textContent = "Loading strength progress...";

    try {
        const response = await getStrengthProgress(
            selectedExerciseName,
            selectedMonths,
        );

        if (!response.ok) {
            throw new Error("Strength progress was not loaded");
        }

        const data = await response.json();

        renderStrengthProgress(data);
    } catch (error) {
        strengthStatus.textContent = error.message;
    }
}

function renderStrengthProgress(data) {
    strengthChart.replaceChildren();
    strengthChange.classList.remove(
        "is-positive",
        "is-negative",
    );

    if (data.points.length === 0) {
        strengthCurrentValue.textContent = "--";
        strengthChange.textContent = "";
        strengthStatus.textContent =
            "No weighted sets for this exercise.";
        return;
    }

    const currentValue = Number(
        data.current_estimated_1rm
    );

    strengthCurrentValue.textContent =
        `${currentValue.toLocaleString("en-US", {
            maximumFractionDigits: 1,
        })} kg`;

    if (data.change_percent === null) {
        strengthChange.textContent =
            "Not enough data to compare";
    } else {
        const change = Number(data.change_percent);
        const sign = change > 0 ? "+" : "";

        strengthChange.textContent =
            `${sign}${change.toLocaleString("en-US", {
                maximumFractionDigits: 1,
            })}%`;

        strengthChange.classList.toggle(
            "is-positive",
            change > 0,
        );
        strengthChange.classList.toggle(
            "is-negative",
            change < 0,
        );
    }

    renderStrengthChart(data.points);
    strengthStatus.textContent = "";
}

function renderStrengthChart(points) {
    const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

    const width = 720;
    const height = 220;
    const padding = 48;

    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;

    const values = points.map(function (point) {
        return Number(point.estimated_1rm);
    });

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const rawRange = maxValue - minValue;

    const scalePadding = rawRange === 0
        ? Math.max(maxValue * 0.05, 2.5)
        : rawRange * 0.15;

    const scaleMin = minValue - scalePadding;
    const scaleMax = maxValue + scalePadding;
    const scaleRange = scaleMax - scaleMin;

    const coordinates = points.map(
        function (point, index) {
            const value = Number(
                point.estimated_1rm
            );

            const x = points.length === 1
                ? width / 2
                : padding
                    + index / (points.length - 1)
                    * plotWidth;
            
            const y = padding
                + (scaleMax - value)
                / scaleRange
                * plotHeight;
            
            return {
                x: x,
                y: y,
                point: point,
            };
        },
    );

    const svg = document.createElementNS(
        SVG_NAMESPACE,
        "svg",
    );

    svg.setAttribute(
        "viewBox",
        `0 0 ${width} ${height}`,
    );
    svg.setAttribute(
        "class",
        "strength-chart-svg",
    );

    for (let index = 0; index <= 4; index += 1) {
        const ratio = index / 4;
        const y = padding + ratio * plotHeight;
        const value = scaleMax - ratio * scaleRange;

        const gridLine = document.createElementNS(
            SVG_NAMESPACE,
            "line",
        );

        gridLine.setAttribute("x1", String(padding));
        gridLine.setAttribute("x2", String(width - padding));
        gridLine.setAttribute("y1", String(y));
        gridLine.setAttribute("y2", String(y));
        gridLine.setAttribute("class", "strength-grid-line");

        svg.appendChild(gridLine);

        const axisLabel = document.createElementNS(
            SVG_NAMESPACE,
            "text",
        );

        axisLabel.setAttribute(
            "x",
            String(padding - 10),
        );
        axisLabel.setAttribute(
            "y",
            String(y + 4),
        );
        axisLabel.setAttribute(
            "class",
            "strength-axis-label",
        );

        axisLabel.textContent = `${value.toFixed(1)} kg`;

        svg.appendChild(axisLabel);
    }

    const line = document.createElementNS(
        SVG_NAMESPACE,
        "polyline",
    );

    const pointsAttribute = coordinates
        .map(function (coordinate) {
            return `${coordinate.x},${coordinate.y}`;
        })
        .join(" ");

    line.setAttribute("points", pointsAttribute);
    line.setAttribute("class", "strength-line");

    svg.appendChild(line);

    coordinates.forEach(function (coordinate) {
        const circle = document.createElementNS(
            SVG_NAMESPACE,
            "circle",
        );

        circle.setAttribute(
            "cx",
            String(coordinate.x),
        );
        circle.setAttribute(
            "cy",
            String(coordinate.y),
        );
        circle.setAttribute("r", "5");
        circle.setAttribute(
            "class",
            "strength-dot",
        );

        const pointLabel = document.createElementNS(
            SVG_NAMESPACE,
            "text",
        );

        pointLabel.setAttribute(
            "x",
            String(coordinate.x),
        );
        pointLabel.setAttribute(
            "y",
            String(coordinate.y - 12),
        );
        pointLabel.setAttribute(
            "class",
            "strength-point-label",
        );

        pointLabel.textContent = Number(
            coordinate.point.estimated_1rm
        ).toLocaleString("en-US", {
            maximumFractionDigits: 1,
        });

        svg.appendChild(pointLabel);

        const title = document.createElementNS(
            SVG_NAMESPACE,
            "title",
        );

        title.textContent =
            `${coordinate.point.date}: ` +
            `${Number(
                coordinate.point.estimated_1rm
            )} kg estimated 1RM`;

        circle.appendChild(title);
        svg.appendChild(circle);
    });

    strengthChart.replaceChildren(svg);
}


