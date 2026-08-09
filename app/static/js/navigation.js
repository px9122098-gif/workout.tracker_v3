const navLinks = document.querySelectorAll(".nav-link");
const appPages = document.querySelectorAll(".app-page");
const brandHomeButton = document.querySelector("#brandHomeButton");

export function setupNavigation() {
    navLinks.forEach(function (navLink) {
        navLink.addEventListener("click", function () {
            const pageId = navLink.dataset.page;

            showPage(pageId);
        });
    });

    brandHomeButton.addEventListener("click", function () {
        showPage("dashboardPage");
    });
}

export function showPage(pageId) {
    appPages.forEach(function (page) {
        page.hidden = page.id !== pageId;
    });

    navLinks.forEach(function (navLink) {
        navLink.classList.toggle("active", navLink.dataset.page === pageId);
    });

    document.dispatchEvent(
        new CustomEvent("app:page-changed", { detail: { pageId } }),
    );
}
