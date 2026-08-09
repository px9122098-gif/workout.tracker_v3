import {
    getCurrentUser,
    loginUser,
    readApiError,
    registerUser,
} from "./api.js";
import { loadDashboard } from "./dashboard.js";
import { loadWorkouts, resetWorkoutsView } from "./workouts.js";


const authView = document.querySelector("#authView");
const appStateView = document.querySelector("#appStateView");
const dashboardView = document.querySelector("#dashboardView");

const registerForm = document.querySelector("#registerForm");
const loginForm = document.querySelector("#loginForm");
const showRegisterBtn = document.querySelector("#showRegisterBtn");
const showLoginBtn = document.querySelector("#showLoginBtn");
const logoutBtn = document.querySelector("#logoutBtn");
const authCard = document.querySelector("#authCard");
const authStatus = document.querySelector("#authStatus");

const registerEmailInput = document.querySelector("#registerEmailInput");
const registerPasswordInput = document.querySelector("#registerPasswordInput");
const loginEmailInput = document.querySelector("#loginEmailInput");
const loginPasswordInput = document.querySelector("#loginPasswordInput");

const appStateTitle = document.querySelector("#appStateTitle");
const appStateMessage = document.querySelector("#appStateMessage");
const retryAppBtn = document.querySelector("#retryAppBtn");
const userAvatar = document.querySelector("#userAvatar");
const userEmail = document.querySelector("#userEmail");

function showOnly(view) {
    [authView, appStateView, dashboardView].forEach(function (candidate) {
        candidate.hidden = candidate !== view;
    });
}

function showAuthView(message = "") {
    authStatus.textContent = message;
    showOnly(authView);
}

function showDashboardView() {
    authStatus.textContent = "";
    showOnly(dashboardView);
}

function showAppState(title, message, canRetry = false) {
    appStateTitle.textContent = title;
    appStateMessage.textContent = message;
    retryAppBtn.hidden = !canRetry;
    showOnly(appStateView);
}

function showLoginForm() {
    authCard.classList.remove("register-mode");
}

function showRegisterForm() {
    authCard.classList.add("register-mode");
}

function renderCurrentUser(user) {
    const email = user.email || "Account";
    userEmail.textContent = email;
    userAvatar.textContent = email.charAt(0).toUpperCase() || "U";
}

function endSession(message = "") {
    localStorage.removeItem("access_token");
    resetWorkoutsView();
    showLoginForm();
    showAuthView(message);
}

async function loadApplicationData() {
    const results = await Promise.allSettled([
        loadWorkouts(),
        loadDashboard(),
    ]);

    results.forEach(function (result) {
        if (result.status === "rejected") {
            console.error("Application section was not loaded:", result.reason);
        }
    });
}

export async function initializeApp() {
    const token = localStorage.getItem("access_token");

    if (!token) {
        showAuthView();
        return;
    }

    showAppState(
        "Checking your session",
        "Connecting to Workout Tracker...",
    );

    let response;

    try {
        response = await getCurrentUser();
    } catch (error) {
        console.error("Authentication check failed:", error);
        showAppState(
            "Workout Tracker is unavailable",
            "Your session is still saved. Check the server connection and try again.",
            true,
        );
        return;
    }

    if (response.status === 401) {
        endSession("Your session expired. Sign in again.");
        return;
    }

    if (!response.ok) {
        const message = await readApiError(
            response,
            "The account could not be checked. Try again.",
        );
        showAppState("Could not open the app", message, true);
        return;
    }

    const user = await response.json();
    renderCurrentUser(user);
    showDashboardView();
    await loadApplicationData();
}

async function submitWithState(form, pendingText, action) {
    const button = form.querySelector('button[type="submit"]');
    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = pendingText;
    authStatus.textContent = "";

    try {
        return await action();
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

export function setupAuth() {
    showLoginBtn.addEventListener("click", showLoginForm);
    showRegisterBtn.addEventListener("click", showRegisterForm);
    retryAppBtn.addEventListener("click", initializeApp);

    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = registerEmailInput.value.trim();
        const password = registerPasswordInput.value;

        try {
            const response = await submitWithState(
                registerForm,
                "Creating...",
                () => registerUser(email, password),
            );

            if (!response.ok) {
                authStatus.textContent = await readApiError(
                    response,
                    "Registration failed.",
                );
                return;
            }

            registerForm.reset();
            loginEmailInput.value = email;
            showLoginForm();
            authStatus.textContent = "Account created. Sign in to continue.";
        } catch (error) {
            authStatus.textContent = "The server is unavailable. Try again.";
        }
    });

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = loginEmailInput.value.trim();
        const password = loginPasswordInput.value;

        try {
            const response = await submitWithState(
                loginForm,
                "Signing in...",
                () => loginUser(email, password),
            );

            if (!response.ok) {
                authStatus.textContent = await readApiError(
                    response,
                    "Login failed.",
                );
                return;
            }

            const data = await response.json();
            localStorage.setItem("access_token", data.access_token);
            loginForm.reset();
            await initializeApp();
        } catch (error) {
            authStatus.textContent = "The server is unavailable. Try again.";
        }
    });

    logoutBtn.addEventListener("click", function () {
        endSession();
    });

    document.addEventListener("auth:expired", function () {
        if (localStorage.getItem("access_token")) {
            endSession("Your session expired. Sign in again.");
        }
    });
}
