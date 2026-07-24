import { createSet, updateSet, deleteSet } from "./api.js";
import { reloadWorkoutDetails } from "./workoutDetails.js";

export function renderSet(set, index, workout) {
    const setItem = document.createElement("div");
    setItem.classList.add("set-item");

    const setText = document.createElement("span");
    setText.textContent = `${index + 1}. ${set.weight} kg x ${set.reps} reps = ${set.weight * set.reps} kg`;

    const editSetBtn = document.createElement("button");
    editSetBtn.textContent = "Edit";
    editSetBtn.classList.add("edit-set-btn");

    const deleteSetBtn = document.createElement("button");
    deleteSetBtn.textContent = "Delete";
    deleteSetBtn.classList.add("delete-set-btn");

    setItem.appendChild(setText);
    setItem.appendChild(editSetBtn);
    setItem.appendChild(deleteSetBtn);

    editSetBtn.addEventListener("click", function () {
        editSetBtn.disabled = true;
        renderEditSetForm(set, workout, setItem);
    });
                    
    deleteSetBtn.addEventListener("click", async function () {
        const confirmed = confirm("Delete this set?");

        if (!confirmed) {
            return;
        }

        deleteSetBtn.disabled = true;
        deleteSetBtn.textContent = "Deleting...";

        const response = await deleteSet(set.id);

        if (!response.ok) {
            deleteSetBtn.disabled = false;
            deleteSetBtn.textContent = "Delete";

            alert("Set was not deleted");
            return;
        }

        await reloadWorkoutDetails(workout.id);
    });

    return setItem;
}

export function renderSetForm(exercise, workout, exerciseItem, addSetBtn) {
    const setForm = document.createElement("div");
    setForm.classList.add("set-form");

    setForm.innerHTML = `
        <input
        class="set-weight-input"
        placeholder="Weight"
        >
        <input
        class="set-reps-input"
        placeholder="Reps"
        >
        <button type="button" class="save-set-btn">Save</button>
        `;
        
    exerciseItem.appendChild(setForm);

    addSetBtn.disabled = true;

    const saveSetBtn = setForm.querySelector(".save-set-btn");

    saveSetBtn.addEventListener("click", async function () {
        const weightInput = setForm.querySelector(".set-weight-input");
        const repsInput = setForm.querySelector(".set-reps-input");

        const result = readAndValidateSetInputs(weightInput, repsInput);

        if (!result.isValid) {
            alert(result.message);
            return;
        }

        saveSetBtn.disabled = true;
        saveSetBtn.textContent = "Saving...";

        const response = await createSet(exercise.id, result.weight, result.reps);

            if (!response.ok) {
                saveSetBtn.disabled = false;
                saveSetBtn.textContent = "Save";

                alert("Set was not created");
                return;
            }

            await reloadWorkoutDetails(workout.id)
        });
}

export function renderEditSetForm(set, workout, setItem) {
    const editSetForm = document.createElement("div");
    editSetForm.classList.add("edit-set-form");

    editSetForm.innerHTML = `
    <input class="edit-set-weight-input" value="${set.weight}">
    <input class="edit-set-reps-input" value="${set.reps}">
    <button type="button" class="save-edit-set-btn">Save</button>
    `;

    setItem.appendChild(editSetForm);

    const saveEditSetBtn = editSetForm.querySelector(".save-edit-set-btn");

    saveEditSetBtn.addEventListener("click", async function () {
        const weightInput = editSetForm.querySelector(".edit-set-weight-input");
        const repsInput = editSetForm.querySelector(".edit-set-reps-input");

        const result = readAndValidateSetInputs(weightInput, repsInput);

        if (!result.isValid) {
            alert(result.message);
            return;
        }

        saveEditSetBtn.disabled = true;
        saveEditSetBtn.textContent = "Saving...";

        const response = await updateSet(set.id, result.weight, result.reps);

        if (!response.ok) {
            saveEditSetBtn.disabled = false;
            saveEditSetBtn.textContent = "Save";

            alert("Set was not updated");
            return;
        }

        await reloadWorkoutDetails(workout.id);
    });
}

export function readAndValidateSetInputs(weightInput, repsInput) {
    const weightText = weightInput.value.trim();
    const repsText = repsInput.value.trim();

    if (weightText === "") {
        return {
            isValid: false,
            message: "Value is empty"
        };
    }

    if (repsText === "") {
        return {
            isValid: false,
            message: "Value is empty"
        };
    }

    const weightNumber = Number(weightText);
    const repsNumber = Number(repsText);

    if (Number.isNaN(weightNumber)) {
        return {
            isValid: false,
            message: "Weight must be number"
        };
    }

    if (Number.isNaN(repsNumber)) {
        return {
            isValid: false,
            message: "Reps must be number"
        };
    }

    if (!Number.isInteger(repsNumber)) {
        return {
            isValid: false,
            message: "Reps must be an integer"
        };
    }

    if (weightNumber < 0) {
        return {
            isValid: false,
            message: "Weight must be positive"
        };
    }

    if (repsNumber <= 0) {
        return {
            isValid: false,
            message: "Reps must be positive"
        };
    }
    
    return {
        isValid: true,
        weight: weightNumber,
        reps: repsNumber
    }
}

export function calculateExerciseVolume(exercise) {
    let total = 0;

    exercise.sets.forEach(function (set) {
        total += set.weight * set.reps;
    });

    return total;
}
