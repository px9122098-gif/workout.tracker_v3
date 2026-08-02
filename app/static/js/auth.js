import { registerUser, loginUser, getCurrentUser } from "./api.js";
import { loadWorkouts, resetWorkoutsView } from "./workouts.js"
import { loadDashboard } from "./dashboard.js";


const authView = document.querySelector("#authView");
const dashboardView = document.querySelector("#dashboardView");

const registerForm = document.querySelector("#registerForm");
const loginForm = document.querySelector("#loginForm");
const showRegisterBtn = document.querySelector("#showRegisterBtn");
const showLoginBtn = document.querySelector("#showLoginBtn");
const logoutBtn = document.querySelector("#logoutBtn");
const authCard = document.querySelector("#authCard");

const registerEmailInput = document.querySelector("#registerEmailInput");
const registerPasswordInput = document.querySelector("#registerPasswordInput");
const loginEmailInput = document.querySelector("#loginEmailInput");
const loginPasswordInput = document.querySelector("#loginPasswordInput");

function showAuthView() {
    authView.hidden = false;
    dashboardView.hidden = true;
}

function showDashboardView() {
    authView.hidden = true;
    dashboardView.hidden = false;
}

function showLoginForm() {
    authCard.classList.remove("register-mode")
}

function showRegisterForm() {
    authCard.classList.add("register-mode")
}

export async function initializeApp() {
    const token = localStorage.getItem("access_token");

    if (!token) {
        showAuthView();
        return;
    }

    try {
        const response = await getCurrentUser();

        if (!response.ok) {
            localStorage.removeItem("access_token");
            showLoginForm();
            showAuthView();
            return;
        }
    } catch (error) {
        console.error("Authentication check failed:", error);
        showAuthView();
        return;
    }

    showDashboardView();

    try {
        await Promise.all([
            loadWorkouts(),
            loadDashboard(),
        ])
    } catch (error) {
        console.error("Failed to load workouts:", error);
    }
}

export function setupAuth() {
    showLoginBtn.addEventListener("click", showLoginForm);
    showRegisterBtn.addEventListener("click", showRegisterForm);

    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();
    
        const email = registerEmailInput.value.trim();
        const password = registerPasswordInput.value;
    
        if (email === "" || password === "") {
            alert("Enter email and password");
            return;
        }
    
        const response = await registerUser(email, password);
        if (!response.ok) {
            alert("Registration failed");
            return;
        }
    
        alert("Account created. Now sign in.");
    
        registerForm.reset();
        showLoginForm();
    });
    
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
    
        const email = loginEmailInput.value.trim();
        const password = loginPasswordInput.value;
    
        if (email === "" || password === "") {
            alert("Enter email and password");
            return;
        }
    
        const response = await loginUser(email, password);
        if (!response.ok) {
            alert("Login failed");
            return;
        }
    
        const data = await response.json();
        localStorage.setItem("access_token", data.access_token);
    
        loginForm.reset();
        showDashboardView();
        await Promise.all([
            loadWorkouts(),
            loadDashboard(),
        ]);
    });
    
    logoutBtn.addEventListener("click", function () {
        localStorage.removeItem("access_token");

        resetWorkoutsView();
        showLoginForm();
        showAuthView();
    });
}


