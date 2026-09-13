document.addEventListener("DOMContentLoaded", () =>
{
    const toggles = document.querySelectorAll(".timeline-toggle");

    toggles.forEach(toggle =>
    {
        const item = toggle.closest(".timeline-item");

        toggle.addEventListener("click", () =>
        {
            const willOpen = !item.classList.contains("open");

            // only one company open at a time
            toggles.forEach(other =>
            {
                other.setAttribute("aria-expanded", "false");
                other.closest(".timeline-item").classList.remove("open");
            });

            item.classList.toggle("open", willOpen);
            toggle.setAttribute("aria-expanded", willOpen);
        });
    });
});
