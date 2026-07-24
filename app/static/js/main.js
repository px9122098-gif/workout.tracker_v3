import { setupAuth, initializeApp } from "./auth.js";
import { setupWorkouts } from "./workouts.js";
import { setupNavigation } from "./navigation.js";
import { setupProgress } from "./progress.js";


setupAuth();
setupWorkouts();
setupNavigation();
initializeApp();
setupProgress();