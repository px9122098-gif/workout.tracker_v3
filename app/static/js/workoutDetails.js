import {
    completeWorkout,
    createExercise,
    deleteExercise,
    getWorkoutDetails,
    readApiError,
    updateExercise,
    updateWorkout,
} from "./api.js";
import {
    calculateExerciseVolume,
    renderSet,
    renderSetForm,
} from "./sets.js";
import { formatDate } from "./utils.js";


const workoutDetails = document.querySelector("#workoutDetails");

function formatNumber(value) {
    return Math.round(Number(value)).toLocaleString();
}

function notifyWorkoutUpdated() {
    document.dispatchEvent(new CustomEvent("workout:updated"));
}

function createMetric(value, label) {
    const item = document.createElement("div");
    const strong = document.createElement("strong");
    const span = document.createElement("span");
    strong.textContent = value;
    span.textContent = label;
    item.append(strong, span);
    return item;
}

export function renderWorkoutDetails(workout) {
    const exercises = workout.exercises || [];
    const isReadOnly = Boolean(workout.completed_at);
    const setCount = exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
    const totalVolume = exercises.reduce(
        (total, exercise) => total + calculateExerciseVolume(exercise),
        0,
    );

    workoutDetails.replaceChildren();

    const header = document.createElement("header");
    header.className = "workout-editor-header";
    header.innerHTML = `
        <div class="workout-editor-heading-copy">
            <div class="workout-editor-heading-meta">
                <span class="workout-editor-eyebrow">Workout session</span>
                <span class="workout-editor-status"></span>
            </div>
            <h2 class="workout-details-title"></h2>
            <time class="workout-details-date"></time>
        </div>
        <div class="workout-editor-summary" aria-label="Workout summary"></div>
    `;

    header.querySelector(".workout-details-title").textContent = workout.title;
    const status = header.querySelector(".workout-editor-status");
    status.classList.add(workout.completed_at ? "is-completed" : "is-draft");
    status.textContent = workout.completed_at ? "Completed" : "In progress";

    const date = header.querySelector(".workout-details-date");
    date.dateTime = workout.date;
    date.textContent = formatDate(workout.date);

    header.querySelector(".workout-editor-summary").append(
        createMetric(exercises.length, "exercises"),
        createMetric(setCount, "sets"),
        createMetric(`${formatNumber(totalVolume)} kg`, "volume"),
    );

    const notes = renderWorkoutNotes(workout);
    const exercisesSection = document.createElement("section");
    exercisesSection.className = "workout-exercises-section";

    const exercisesHeader = document.createElement("div");
    exercisesHeader.className = "workout-section-heading";
    exercisesHeader.innerHTML = `
        <div>
            <h3>Exercises</h3>
            <p>${isReadOnly ? "Completed sessions are saved as read-only." : "Build the session one movement at a time."}</p>
        </div>
    `;

    const addExerciseButton = document.createElement("button");
    addExerciseButton.type = "button";
    addExerciseButton.className = "add-exercise-btn";
    addExerciseButton.textContent = "+ Add exercise";
    if (!isReadOnly) {
        exercisesHeader.append(addExerciseButton);
    }

    const exerciseFormSlot = document.createElement("div");
    exerciseFormSlot.className = "exercise-form-slot";
    const exerciseList = document.createElement("div");
    exerciseList.className = "exercises-list";

    if (exercises.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "workout-editor-empty";
        emptyState.innerHTML = "<strong>No exercises yet</strong><span>Add the first movement to begin this workout.</span>";
        exerciseList.append(emptyState);
    } else {
        exercises.forEach(function (exercise, index) {
            exerciseList.append(renderExercise(exercise, workout, index));
        });
    }

    if (!isReadOnly) {
        addExerciseButton.addEventListener("click", function () {
            if (exerciseFormSlot.firstChild) {
                exerciseFormSlot.querySelector("input")?.focus();
                return;
            }

            addExerciseButton.disabled = true;
            const form = renderExerciseForm(workout, {
                onCancel() {
                    exerciseFormSlot.replaceChildren();
                    addExerciseButton.disabled = false;
                },
            });
            exerciseFormSlot.append(form);
            form.querySelector("input").focus();
        });
    }

    exercisesSection.append(exercisesHeader, exerciseFormSlot, exerciseList);

    const sessionPanel = document.createElement("section");
    sessionPanel.className = "workout-session-panel";
    sessionPanel.append(
        renderWorkoutEffort(workout),
        renderWorkoutCompletion(workout),
    );

    workoutDetails.append(header, notes, exercisesSection, sessionPanel);
}

function renderWorkoutNotes(workout) {
    const section = document.createElement("section");
    section.className = "workout-notes";

    const heading = document.createElement("div");
    heading.className = "workout-section-heading compact";
    heading.innerHTML = "<div><h3>Session notes</h3><p>Keep context for your next workout.</p></div>";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "secondary-button";
    editButton.textContent = "Edit notes";
    heading.append(editButton);

    const text = document.createElement("p");
    text.className = workout.notes ? "workout-notes-text" : "workout-notes-text is-empty";
    text.textContent = workout.notes || "No notes added yet.";
    section.append(heading, text);

    editButton.addEventListener("click", function () {
        const form = document.createElement("form");
        form.className = "notes-editor";
        form.innerHTML = `
            <textarea class="notes-input" maxlength="2000" placeholder="What should you remember about this session?"></textarea>
            <div class="inline-form-actions">
                <button type="submit" class="primary-button">Save notes</button>
                <button type="button" class="secondary-button">Cancel</button>
            </div>
            <p class="inline-form-status" aria-live="polite"></p>
        `;
        const input = form.querySelector("textarea");
        const saveButton = form.querySelector('[type="submit"]');
        const cancelButton = form.querySelector('[type="button"]');
        const formStatus = form.querySelector(".inline-form-status");
        input.value = workout.notes || "";
        section.replaceChildren(heading, form);
        editButton.hidden = true;
        input.focus();

        cancelButton.addEventListener("click", function () {
            renderWorkoutDetails(workout);
        });

        form.addEventListener("submit", async function (event) {
            event.preventDefault();
            saveButton.disabled = true;
            saveButton.textContent = "Saving...";

            try {
                const response = await updateWorkout(workout.id, {
                    notes: input.value.trim() || null,
                });
                if (!response.ok) {
                    throw new Error(await readApiError(response, "Notes were not updated."));
                }
                await reloadWorkoutDetails(workout.id, true);
            } catch (error) {
                saveButton.disabled = false;
                saveButton.textContent = "Save notes";
                formStatus.textContent = error.message;
            }
        });
    });

    return section;
}

function renderWorkoutEffort(workout) {
    const effortOptions = [
        { value: "light", label: "Light" },
        { value: "moderate", label: "Moderate" },
        { value: "hard", label: "Hard" },
        { value: "very_hard", label: "Very hard" },
    ];

    const section = document.createElement("section");
    section.className = "workout-effort";
    section.innerHTML = `
        <div>
            <h3>How did this workout feel?</h3>
            <p class="workout-effort-description">Rate the overall effort for your activity calendar.</p>
        </div>
        <div class="effort-options"></div>
        <p class="effort-status" aria-live="polite"></p>
    `;

    const options = section.querySelector(".effort-options");
    const status = section.querySelector(".effort-status");
    const buttons = [];

    effortOptions.forEach(function (option) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = option.label;
        button.className = "effort-option";
        button.classList.toggle("is-selected", workout.effort_level === option.value);
        button.setAttribute("aria-pressed", String(workout.effort_level === option.value));

        button.addEventListener("click", async function () {
            if (workout.effort_level === option.value) {
                return;
            }

            buttons.forEach((candidate) => candidate.disabled = true);
            status.textContent = "Saving...";

            try {
                const response = await updateWorkout(workout.id, {
                    effort_level: option.value,
                });
                if (!response.ok) {
                    throw new Error(await readApiError(response, "Effort was not updated."));
                }
                await reloadWorkoutDetails(workout.id, true);
            } catch (error) {
                buttons.forEach((candidate) => candidate.disabled = false);
                status.textContent = error.message;
            }
        });

        buttons.push(button);
        options.append(button);
    });

    return section;
}

function renderWorkoutCompletion(workout) {
    const section = document.createElement("section");
    section.className = "workout-completion";

    if (workout.completed_at) {
        section.classList.add("is-completed");
        section.innerHTML = `
            <span class="completion-mark" aria-hidden="true">Done</span>
            <div>
                <strong class="workout-completion-title">Workout completed</strong>
                <span class="workout-completion-date"></span>
            </div>
        `;
        section.querySelector(".workout-completion-date").textContent =
            `Completed on ${formatDate(workout.completed_at)}`;
        return section;
    }

    const copy = document.createElement("div");
    copy.innerHTML = "<strong>Ready to finish?</strong><span>Your progress updates after completion.</span>";

    const action = document.createElement("div");
    action.className = "completion-action";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "finish-workout-btn";
    button.textContent = "Finish workout";

    const status = document.createElement("p");
    status.className = "workout-completion-status";
    status.setAttribute("aria-live", "polite");
    action.append(button, status);
    section.append(copy, action);

    button.addEventListener("click", async function () {
        button.disabled = true;
        button.textContent = "Finishing...";
        status.textContent = "";

        try {
            const response = await completeWorkout(workout.id, workout.effort_level);
            if (!response.ok) {
                throw new Error(await readApiError(response, "Could not finish the workout."));
            }
            await reloadWorkoutDetails(workout.id, true);
        } catch (error) {
            button.disabled = false;
            button.textContent = "Finish workout";
            status.textContent = error.message;
        }
    });

    return section;
}

export async function reloadWorkoutDetails(workoutId, shouldNotify = false) {
    const response = await getWorkoutDetails(workoutId);

    if (!response.ok) {
        throw new Error(await readApiError(response, "Workout details were not loaded."));
    }

    renderWorkoutDetails(await response.json());
    if (shouldNotify) {
        notifyWorkoutUpdated();
    }
}

export function renderExercise(exercise, workout, index) {
    const isReadOnly = Boolean(workout.completed_at);
    const item = document.createElement("article");
    item.className = "exercise-item";
    item.classList.toggle("is-readonly", isReadOnly);

    const header = document.createElement("div");
    header.className = "exercise-header";

    const identity = document.createElement("div");
    identity.className = "exercise-identity";
    const mark = document.createElement("span");
    mark.textContent = index + 1;
    const title = document.createElement("h3");
    title.textContent = exercise.name;
    identity.append(mark, title);

    const actions = document.createElement("div");
    actions.className = "exercise-actions";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "icon-text-button";
    editButton.textContent = "Edit";
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger-text-button";
    deleteButton.textContent = "Delete";
    if (!isReadOnly) {
        actions.append(editButton, deleteButton);
    }
    header.append(identity, actions);

    const editSlot = document.createElement("div");
    const sets = document.createElement("div");
    sets.className = "sets-list";
    const refresh = () => reloadWorkoutDetails(workout.id, true);

    if (exercise.sets.length === 0) {
        const empty = document.createElement("p");
        empty.className = "sets-empty-state";
        empty.textContent = "No sets recorded for this exercise.";
        sets.append(empty);
    } else {
        exercise.sets.forEach(function (set, setIndex) {
            sets.append(renderSet(set, setIndex, { onChanged: refresh, readOnly: isReadOnly }));
        });
    }

    const footer = document.createElement("div");
    footer.className = "exercise-footer";
    const volume = document.createElement("span");
    volume.innerHTML = `<strong>${formatNumber(calculateExerciseVolume(exercise))} kg</strong> total volume`;

    const addSetButton = document.createElement("button");
    addSetButton.type = "button";
    addSetButton.className = "add-set-btn";
    addSetButton.textContent = "+ Add set";
    footer.append(volume);
    if (!isReadOnly) {
        footer.append(addSetButton);
    }

    const setFormSlot = document.createElement("div");
    setFormSlot.className = "set-form-slot";

    if (!isReadOnly) {
        editButton.addEventListener("click", function () {
            if (editSlot.firstChild) {
                return;
            }
            editButton.disabled = true;
            deleteButton.disabled = true;
            const form = renderEditExerciseForm(exercise, workout, {
                onCancel() {
                    editSlot.replaceChildren();
                    editButton.disabled = false;
                    deleteButton.disabled = false;
                },
            });
            editSlot.append(form);
            form.querySelector("input").focus();
        });

        deleteButton.addEventListener("click", async function () {
            if (!confirm(`Delete "${exercise.name}" and all its sets?`)) {
                return;
            }

            deleteButton.disabled = true;
            deleteButton.textContent = "Deleting...";
            try {
                const response = await deleteExercise(exercise.id);
                if (!response.ok) {
                    throw new Error(await readApiError(response, "Exercise was not deleted."));
                }
                await refresh();
            } catch (error) {
                deleteButton.disabled = false;
                deleteButton.textContent = "Delete";
                alert(error.message);
            }
        });

        addSetButton.addEventListener("click", function () {
            if (setFormSlot.firstChild) {
                setFormSlot.querySelector("input")?.focus();
                return;
            }
            addSetButton.disabled = true;
            const form = renderSetForm(exercise, {
                onChanged: refresh,
                onCancel() {
                    setFormSlot.replaceChildren();
                    addSetButton.disabled = false;
                },
            });
            setFormSlot.append(form);
            form.querySelector("input").focus();
        });
    }

    item.append(header, editSlot, sets, setFormSlot, footer);
    return item;
}

export function renderExerciseForm(workout, { onCancel }) {
    const form = document.createElement("form");
    form.className = "exercise-form inline-editor";
    form.innerHTML = `
        <label>
            <span>Exercise name</span>
            <input class="exercise-name-input" maxlength="120" placeholder="For example: Bench Press" required>
        </label>
        <div class="inline-form-actions">
            <button type="submit" class="primary-button">Add exercise</button>
            <button type="button" class="secondary-button">Cancel</button>
        </div>
        <p class="inline-form-status" aria-live="polite"></p>
    `;

    const saveButton = form.querySelector('[type="submit"]');
    const cancelButton = form.querySelector('[type="button"]');
    const status = form.querySelector(".inline-form-status");
    cancelButton.addEventListener("click", onCancel);

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        const name = form.querySelector("input").value.trim();

        if (!name) {
            status.textContent = "Enter an exercise name.";
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = "Adding...";

        try {
            const response = await createExercise(workout.id, name);
            if (!response.ok) {
                throw new Error(await readApiError(response, "Exercise was not created."));
            }
            await reloadWorkoutDetails(workout.id, true);
        } catch (error) {
            saveButton.disabled = false;
            saveButton.textContent = "Add exercise";
            status.textContent = error.message;
        }
    });

    return form;
}

export function renderEditExerciseForm(exercise, workout, { onCancel }) {
    const form = document.createElement("form");
    form.className = "edit-exercise-form inline-editor";
    form.innerHTML = `
        <label>
            <span>Exercise name</span>
            <input class="edit-exercise-name-input" maxlength="120" required>
        </label>
        <div class="inline-form-actions">
            <button type="submit" class="primary-button">Save changes</button>
            <button type="button" class="secondary-button">Cancel</button>
        </div>
        <p class="inline-form-status" aria-live="polite"></p>
    `;

    const input = form.querySelector("input");
    const saveButton = form.querySelector('[type="submit"]');
    const cancelButton = form.querySelector('[type="button"]');
    const status = form.querySelector(".inline-form-status");
    input.value = exercise.name;
    cancelButton.addEventListener("click", onCancel);

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        const name = input.value.trim();

        if (!name) {
            status.textContent = "Exercise name cannot be empty.";
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {
            const response = await updateExercise(exercise.id, name);
            if (!response.ok) {
                throw new Error(await readApiError(response, "Exercise was not updated."));
            }
            await reloadWorkoutDetails(workout.id, true);
        } catch (error) {
            saveButton.disabled = false;
            saveButton.textContent = "Save changes";
            status.textContent = error.message;
        }
    });

    return form;
}
