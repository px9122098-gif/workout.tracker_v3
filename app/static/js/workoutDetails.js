import {
    getWorkoutDetails,
    updateWorkout,
    completeWorkout,
    createExercise,
    updateExercise,
    deleteExercise,
} from "./api.js";
import {
    renderSet,
    renderSetForm,
    calculateExerciseVolume,
} from "./sets.js";
import { formatDate } from "./utils.js";

const workoutDetails = document.querySelector("#workoutDetails");

export function renderWorkoutDetails(workout) {
    const notesText = workout.notes ? workout.notes : "No notes yet";

    workoutDetails.innerHTML  = `
        <h2>Workout Details</h2>
        <h3 class="workout-details-title"></h3>
        <p>Date: ${formatDate(workout.date)}</p>
        <div class="workout-notes">
            <p class="workout-notes-text"></p>
            <button type="button" class="edit-notes-btn">Edit notes</button>
        </div>
        <div class="exercises-list"></div>
        <button type="button" class="add-exercise-btn">Add exercise</button>
    `;

    workoutDetails
        .querySelector(".workout-details-title")
        .textContent = workout.title

    workoutDetails
        .querySelector(".workout-notes-text")
        .textContent = notesText

    const workoutNotes = workoutDetails.querySelector(".workout-notes");
    const editNotesBtn = workoutDetails.querySelector(".edit-notes-btn");

    editNotesBtn.addEventListener("click", function () {
        workoutNotes.innerHTML = `
            <textarea class="notes-input"></textarea>
            <div class="notes-actions">
                <button type="button" class="save-notes-btn">Save</button>
                <button type="button" class="cancel-notes-btn">Cancel</button>
            </div>
        `;

        const notesInput = workoutNotes.querySelector(".notes-input");
        notesInput.value = workout.notes || "";
        const saveNotesBtn = workoutNotes.querySelector(".save-notes-btn");

        saveNotesBtn.addEventListener("click", async () => {
            const notes = notesInput.value.trim() || null;

            saveNotesBtn.disabled = true;
            saveNotesBtn.textContent = "Saving...";

            const response = await updateWorkout(workout.id, {notes: notes});

            if (!response.ok) {
                saveNotesBtn.disabled = false;
                saveNotesBtn.textContent = "Save";
                alert("Failed to update notes");
                return;
            }

            await reloadWorkoutDetails(workout.id)
        })

        const cancelNotesBtn = workoutNotes.querySelector(".cancel-notes-btn");
        cancelNotesBtn.addEventListener("click", () => {
            renderWorkoutDetails(workout);
        });
    });

    const exerciseList = workoutDetails.querySelector(".exercises-list");

    let workoutTotalVolume = 0

    if (workout.exercises.length === 0) {
        exerciseList.textContent = "No exercises yet";
    } else {
        workout.exercises.forEach(function (exercise) {
            const renderedExercise = renderExercise(exercise, workout);

            exerciseList.appendChild(renderedExercise.element);
            workoutTotalVolume += renderedExercise.volume;
        });
    }

    const endWorkoutForm = document.createElement("div");
    endWorkoutForm.classList.add("end-workout-form");

    const totalVolumeElement = document.createElement("span");
    totalVolumeElement.textContent = `Total: ${workoutTotalVolume} kg`;

    workoutDetails.appendChild(endWorkoutForm);
    endWorkoutForm.appendChild(totalVolumeElement);

    const workoutEffort = renderWorkoutEffort(workout);
    endWorkoutForm.appendChild(workoutEffort);

    const workoutCompletion = renderWorkoutCompletion(workout);
    endWorkoutForm.appendChild(workoutCompletion);

    const addExerciseBtn = workoutDetails.querySelector(".add-exercise-btn");

    addExerciseBtn.addEventListener("click", function () {
        renderExerciseForm(workout, addExerciseBtn);
    });
}

function renderWorkoutEffort(workout) {
    const effortOptions = [
        { value: "light", label: "Light" },
        { value: "moderate", label: "Moderate" },
        { value: "hard", label: "Hard" },
        { value: "very_hard", label: "Very hard" },
    ];

    const effortSection = document.createElement("section");
    effortSection.classList.add("workout-effort");

    const title = document.createElement("h3");
    title.textContent = "How did this workout feel?";

    const description = document.createElement("p");
    description.classList.add("workout-effort-description");
    description.textContent = "Choose the effort that best matches this session.";

    const effortOptionsElement = document.createElement("div");
    effortOptionsElement.classList.add("effort-options");

    const status = document.createElement("p");
    status.classList.add("effort-status");
    status.setAttribute("aria-live", "polite");

    const buttons = [];

    effortOptions.forEach(function (option) {
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = option.label;
        button.dataset.effort = option.value;
        button.classList.add("effort-option");

        const isSelected = workout.effort_level === option.value;

        if (isSelected) {
            button.classList.add("is-selected");
        }

        button.setAttribute("aria-pressed", String(isSelected));

        button.addEventListener("click", async function () {
            const effortLevel = button.dataset.effort;

            if (effortLevel === workout.effort_level) {
                return;
            }

            buttons.forEach(function (effortButton) {
                effortButton.disabled = true;
            });

            status.textContent = "Saving...";

            try {
                const response = await updateWorkout(workout.id, {
                    effort_level: effortLevel,
                });

                if (!response.ok) {
                    throw new Error("Effort was not updated");
                }

                await reloadWorkoutDetails(workout.id);

                document.dispatchEvent(
                    new CustomEvent("workout:updated")
                );
            } catch (error) {
                buttons.forEach(function (effortButton) {
                    effortButton.disabled = false;
                });

                status.textContent = error.message;
            }
        });

        buttons.push(button)
        effortOptionsElement.appendChild(button)
    });

    effortSection.appendChild(title);
    effortSection.appendChild(description);
    effortSection.appendChild(effortOptionsElement);
    effortSection.appendChild(status);

    return effortSection;
}

function renderWorkoutCompletion(workout) {
    const container = document.createElement("section");
    container.className = "workout-completion";

    if (workout.completed_at) {
        container.classList.add("is-completed");

        const title = document.createElement("strong");
        title.className = "workout-completion-title";
        title.textContent = "Workout completed";

        const date = document.createElement("span");
        date.className = "workout-completion-date";
        date.textContent = `Completed on ${formatDate(workout.completed_at)}`;

        container.append(title, date);

        return container;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "finish-workout-btn";
    button.textContent = "Finish workout";

    const status = document.createElement("p");
    status.className = "workout-completion-status";
    status.setAttribute("aria-live", "polite");

    button.addEventListener("click", async () => {
        button.disabled = true;
        button.textContent = "Finishing...";
        status.textContent = "";

        try {
            const response = await completeWorkout(
                workout.id,
                workout.effort_level
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);

                throw new Error(
                    errorData?.detail || "Could not finish the workout"
                );
            }

            await reloadWorkoutDetails(workout.id);

            document.dispatchEvent(
                new CustomEvent("workout:updated")
            );
        } catch (error) {
            button.disabled = false;
            button.textContent = "Finish workout";
            status.textContent = error.message;
        }
    });

    container.append(button, status);

    return container;
}

export async function reloadWorkoutDetails(workoutId) {
    const response = await getWorkoutDetails(workoutId);
    
    if (!response.ok) {
        alert("Workout details were not loaded");
        return;
    }

    const updatedWorkout = await response.json();
    renderWorkoutDetails(updatedWorkout);
}

export function renderExercise(exercise, workout) {
    const exerciseItem = document.createElement("div");
    exerciseItem.classList.add("exercise-item");

    const exerciseHeader = document.createElement("div");
    exerciseHeader.classList.add("exercise-header");

    const exerciseText = document.createElement("span");
    exerciseText.textContent = exercise.name;

    const editExerciseBtn = document.createElement("button");
    editExerciseBtn.textContent = "Edit";
    editExerciseBtn.classList.add("edit-exercise-btn");

    editExerciseBtn.addEventListener("click", function () {
        editExerciseBtn.disabled = true;
        editExerciseBtn.textContent = "Editing...";

        renderEditExerciseForm(exercise, workout, exerciseItem)
    })

    const deleteExerciseBtn = document.createElement("button");
    deleteExerciseBtn.textContent = "Delete";
    deleteExerciseBtn.classList.add("delete-exercise-btn");

    const setsList = document.createElement("div");
    setsList.classList.add("sets-list");

    let exerciseTotalVolume = 0;

    exerciseTotalVolume = calculateExerciseVolume(exercise);

    if (exercise.sets.length === 0) {
        setsList.textContent = "No sets yet";
    } else {
        exercise.sets.forEach(function (set, index) {
            const setItem = renderSet(set, index, workout);
            setsList.appendChild(setItem);  
        });
    }
            
        const totalVolumeElement = document.createElement("span");
        totalVolumeElement.textContent = `Total: ${exerciseTotalVolume} kg`;

        const addSetBtn = document.createElement("button");
        addSetBtn.textContent = "Add set";
        addSetBtn.classList.add("add-set-btn");

        setsList.appendChild(addSetBtn);

        addSetBtn.addEventListener("click", function () {
            renderSetForm(exercise, workout, exerciseItem, addSetBtn);
        });

        deleteExerciseBtn.addEventListener("click", async function () {
            const confirmed = confirm("Delete this exercise?");

            if (!confirmed) {
                return;
            }

            deleteExerciseBtn.disabled = true;
            deleteExerciseBtn.textContent = "Deleting...";

            const response = await deleteExercise(exercise.id);

            if (!response.ok) {
                deleteExerciseBtn.disabled = false;
                deleteExerciseBtn.textContent = "Delete";

                alert("Exercise was not deleted");
                return;
            }

            await reloadWorkoutDetails(workout.id)
        });

    exerciseHeader.appendChild(exerciseText);
    exerciseHeader.appendChild(editExerciseBtn);
    exerciseHeader.appendChild(deleteExerciseBtn);

    exerciseItem.appendChild(exerciseHeader);
    exerciseItem.appendChild(setsList);
    exerciseItem.appendChild(totalVolumeElement);

    return {
        element: exerciseItem,
        volume: exerciseTotalVolume
    };
}

export function renderExerciseForm(workout, addExerciseBtn) {
    const exerciseForm = document.createElement("div");
        exerciseForm.classList.add("exercise-form");

        exerciseForm.innerHTML = `
            <input
                class="exercise-name-input"
                placeholder="Exercise name"
            >
            <button type="button" class="save-exercise-btn">Save</button>
        `;

        workoutDetails.appendChild(exerciseForm);

        addExerciseBtn.disabled = true;

        const saveExerciseBtn = exerciseForm.querySelector(".save-exercise-btn");

        saveExerciseBtn.addEventListener("click", async function () {
            const exerciseNameInput = exerciseForm.querySelector(".exercise-name-input");
            const exerciseName = exerciseNameInput.value.trim();

            if (exerciseName === "") {
                alert("Enter exercise name");
                return;
            }

            saveExerciseBtn.disabled = true;
            saveExerciseBtn.textContent = "Saving...";

            const response = await createExercise(workout.id, exerciseName);

            if (!response.ok) {
                saveExerciseBtn.disabled = false;
                saveExerciseBtn.textContent = "Save";

                alert("Exercise was not created");
                return;
            }

            await reloadWorkoutDetails(workout.id);
        });
    }

export function renderEditExerciseForm(exercise, workout, exerciseItem) {
    const editExerciseForm = document.createElement("div");
    editExerciseForm.classList.add("edit-exercise-form");

    editExerciseForm.innerHTML = `
    <input class="edit-exercise-name-input" value="${exercise.name}">
    <button type="button" class="save-edit-exercise-btn">Save</button>
    `;

    exerciseItem.appendChild(editExerciseForm);

    const saveEditExerciseBtn = editExerciseForm.querySelector(".save-edit-exercise-btn");

    saveEditExerciseBtn.addEventListener("click", async function () {
        const editExerciseNameInput = editExerciseForm.querySelector(".edit-exercise-name-input");
        const newName = editExerciseNameInput.value.trim();

        if (newName === "") {
            alert("Name cannot be empty");
            return;
        }

        saveEditExerciseBtn.disabled = true;
        saveEditExerciseBtn.textContent = "Saving...";
        
        const response = await updateExercise(exercise.id, newName);

        if (!response.ok) {
            saveEditExerciseBtn.disabled = false;
            saveEditExerciseBtn.textContent = "Save";

            alert("Exercise name was not changed");
            return;
        }

        await reloadWorkoutDetails(workout.id);
    });
}


