const API_URL = "/api/v1";

export function authFetch(url, options = {}) {
    const token = localStorage.getItem("access_token");
    const headers = new Headers(options.headers);

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(url, {
        ...options,
        headers: headers,
    });
}

export async function registerUser(email, password) {
    return fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email: email,
            password: password,
        }),
    });
}

export async function loginUser(email, password) {
    return fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email: email,
            password: password,
        }),
    });
}

export async function createWorkout(workoutName) {
    const response = await authFetch(`${API_URL}/workouts`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            title: workoutName
        })
    });

    return response
}

export async function getWorkoutDetails(workoutId) {
    const response = await authFetch(`${API_URL}/workouts/${workoutId}`);

    return response;
}

export function getWorkoutsOverview(year, month) {
    const params = new URLSearchParams({
        year: String(year),
        month: String(month),
    });

    return authFetch(
        `${API_URL}/workouts/overview?${params.toString()}`
    );
}

export async function deleteWorkout(workoutId) {
    const response = await authFetch(`${API_URL}/workouts/${workoutId}`, {
        method: "DELETE"
    });

    return response;
}

export async function updateWorkout(workoutId, changes) {
    return authFetch(`${API_URL}/workouts/${workoutId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(changes),
    });
}

export function completeWorkout(workoutId, effortLevel) {
    return authFetch(
        `${API_URL}/workouts/${workoutId}/complete`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                effort_level: effortLevel,
            }),
        }
    );
}

export async function createExercise(workoutId, exerciseName) {
    const response = await authFetch(`${API_URL}/exercises`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            workout_id: workoutId,
            name: exerciseName
        })
    });

    return response;
}

export async function updateExercise(exerciseId, name) {
    return authFetch(`${API_URL}/exercises/${exerciseId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name
        })
    });
}

export async function deleteExercise(exerciseId) {
    const response = await authFetch(`${API_URL}/exercises/${exerciseId}`, {
        method: "DELETE"
    });

    return response;
}

export async function createSet(exerciseId, weight, reps) {
    const response = await authFetch(`${API_URL}/sets`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            exercise_id: exerciseId,
            weight: weight,
            reps: reps
        })
    });

    return response;
}

export async function updateSet(setId, weight, reps) {
    const response = await authFetch(`${API_URL}/sets/${setId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            weight: weight,
            reps: reps
        })
    });

    return response;
}

export async function deleteSet(setId) {
    const response = await authFetch(`${API_URL}/sets/${setId}`, {
        method: "DELETE"
    });

    return response;
}

export function getProgressOverview(months = 6) {
    const params = new URLSearchParams({
        months: String(months),
    });

    return authFetch(
        `${API_URL}/progress/overview?${params.toString()}`
    );
}

export function getProgressExercises() {
    return authFetch(`${API_URL}/progress/exercises`);
}

export function getStrengthProgress(exerciseName, months = 6) {
    const params = new URLSearchParams({
        exercise_name: exerciseName,
        months: String(months),
    });

    return authFetch(
        `${API_URL}/progress/strength?${params.toString()}`
    );
}

export function getPersonalRecords(limit = 3) {
    const params = new URLSearchParams({
        limit: String(limit),
    });

    return authFetch(
        `${API_URL}/progress/personal-records?${params.toString()}`
    );
}

export async function getWorkouts() {
    return authFetch(`${API_URL}/workouts`);
}

export async function getCurrentUser() {
    return authFetch(`${API_URL}/auth/me`);
}