import {
    createSet,
    deleteSet,
    readApiError,
    updateSet,
} from "./api.js";


function createSetFormFields(weight = "", reps = "") {
    const fields = document.createElement("div");
    fields.className = "set-form-fields";
    fields.innerHTML = `
        <label>
            <span>Weight (kg)</span>
            <input type="number" min="0" step="0.25" class="set-weight-input" inputmode="decimal" required>
        </label>
        <label>
            <span>Repetitions</span>
            <input type="number" min="1" step="1" class="set-reps-input" inputmode="numeric" required>
        </label>
    `;
    fields.querySelector(".set-weight-input").value = weight;
    fields.querySelector(".set-reps-input").value = reps;
    return fields;
}

function createFormActions(saveLabel, onCancel) {
    const actions = document.createElement("div");
    actions.className = "inline-form-actions";

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.className = "primary-button";
    saveButton.textContent = saveLabel;

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "secondary-button";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", onCancel);

    actions.append(saveButton, cancelButton);
    return { actions, saveButton };
}

export function renderSet(set, index, { onChanged }) {
    const setItem = document.createElement("article");
    setItem.className = "set-item";

    const number = document.createElement("strong");
    number.className = "set-number";
    number.textContent = index + 1;

    const weight = document.createElement("div");
    weight.className = "set-value";
    weight.innerHTML = `<strong></strong><span>kg</span>`;
    weight.querySelector("strong").textContent = Number(set.weight).toLocaleString();

    const reps = document.createElement("div");
    reps.className = "set-value";
    reps.innerHTML = `<strong></strong><span>reps</span>`;
    reps.querySelector("strong").textContent = set.reps;

    const volume = document.createElement("div");
    volume.className = "set-value";
    volume.innerHTML = `<strong></strong><span>volume</span>`;
    volume.querySelector("strong").textContent = Math.round(set.weight * set.reps).toLocaleString();

    const actions = document.createElement("div");
    actions.className = "set-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "icon-text-button";
    editButton.textContent = "Edit";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger-text-button";
    deleteButton.textContent = "Delete";

    actions.append(editButton, deleteButton);
    setItem.append(number, weight, reps, volume, actions);

    editButton.addEventListener("click", function () {
        editButton.disabled = true;
        deleteButton.disabled = true;

        const form = renderEditSetForm(set, {
            onChanged,
            onCancel() {
                form.remove();
                editButton.disabled = false;
                deleteButton.disabled = false;
            },
        });
        setItem.append(form);
        form.querySelector("input").focus();
    });

    deleteButton.addEventListener("click", async function () {
        if (!confirm("Delete this set?")) {
            return;
        }

        deleteButton.disabled = true;
        deleteButton.textContent = "Deleting...";

        try {
            const response = await deleteSet(set.id);
            if (!response.ok) {
                throw new Error(await readApiError(response, "Set was not deleted."));
            }
            await onChanged();
        } catch (error) {
            deleteButton.disabled = false;
            deleteButton.textContent = "Delete";
            alert(error.message);
        }
    });

    return setItem;
}

export function renderSetForm(exercise, { onChanged, onCancel }) {
    const form = document.createElement("form");
    form.className = "set-form inline-editor";

    const heading = document.createElement("strong");
    heading.textContent = "Add a working set";
    const fields = createSetFormFields();
    const status = document.createElement("p");
    status.className = "inline-form-status";
    status.setAttribute("aria-live", "polite");
    const { actions, saveButton } = createFormActions("Add set", onCancel);

    form.append(heading, fields, actions, status);
    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        const result = readAndValidateSetInputs(
            form.querySelector(".set-weight-input"),
            form.querySelector(".set-reps-input"),
        );

        if (!result.isValid) {
            status.textContent = result.message;
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = "Adding...";
        status.textContent = "";

        try {
            const response = await createSet(exercise.id, result.weight, result.reps);
            if (!response.ok) {
                throw new Error(await readApiError(response, "Set was not created."));
            }
            await onChanged();
        } catch (error) {
            saveButton.disabled = false;
            saveButton.textContent = "Add set";
            status.textContent = error.message;
        }
    });

    return form;
}

export function renderEditSetForm(set, { onChanged, onCancel }) {
    const form = document.createElement("form");
    form.className = "edit-set-form inline-editor set-item-editor";

    const fields = createSetFormFields(set.weight, set.reps);
    const status = document.createElement("p");
    status.className = "inline-form-status";
    status.setAttribute("aria-live", "polite");
    const { actions, saveButton } = createFormActions("Save changes", onCancel);
    form.append(fields, actions, status);

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        const result = readAndValidateSetInputs(
            form.querySelector(".set-weight-input"),
            form.querySelector(".set-reps-input"),
        );

        if (!result.isValid) {
            status.textContent = result.message;
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {
            const response = await updateSet(set.id, result.weight, result.reps);
            if (!response.ok) {
                throw new Error(await readApiError(response, "Set was not updated."));
            }
            await onChanged();
        } catch (error) {
            saveButton.disabled = false;
            saveButton.textContent = "Save changes";
            status.textContent = error.message;
        }
    });

    return form;
}

export function readAndValidateSetInputs(weightInput, repsInput) {
    const weightText = weightInput.value.trim();
    const repsText = repsInput.value.trim();

    if (!weightText || !repsText) {
        return { isValid: false, message: "Enter both weight and repetitions." };
    }

    const weight = Number(weightText);
    const reps = Number(repsText);

    if (!Number.isFinite(weight) || weight < 0) {
        return { isValid: false, message: "Weight must be zero or greater." };
    }

    if (!Number.isInteger(reps) || reps <= 0) {
        return { isValid: false, message: "Repetitions must be a positive integer." };
    }

    return { isValid: true, weight, reps };
}

export function calculateExerciseVolume(exercise) {
    return exercise.sets.reduce(
        (total, set) => total + Number(set.weight) * Number(set.reps),
        0,
    );
}
