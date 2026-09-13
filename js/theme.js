document.addEventListener("DOMContentLoaded", () =>
{
    const button = document.getElementById("theme-toggle");
    if (!button)
    {
        return;
    }

    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const browserColors = { dark: "#10151a", light: "#f0f0f0" };

    function currentTheme()
    {
        return root.dataset.theme === "light" ? "light" : "dark";
    }

    function updateButtonAndMeta()
    {
        const theme = currentTheme();
        button.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta)
        {
            meta.setAttribute("content", browserColors[theme]);
        }
    }

    function setTheme(theme)
    {
        root.dataset.theme = theme;

        try
        {
            localStorage.setItem("theme", theme);
        }
        catch (error)
        {
            // storage can be blocked (private mode)
        }

        updateButtonAndMeta();
        window.dispatchEvent(new CustomEvent("themechange"));
    }

    function switchTheme(originX, originY)
    {
        const nextTheme = currentTheme() === "dark" ? "light" : "dark";

        if (!document.startViewTransition || reducedMotion.matches)
        {
            setTheme(nextTheme);
            return;
        }

        const transition = document.startViewTransition(() => setTheme(nextTheme));

        transition.ready
            .then(() =>
            {
                // radius that reaches the farthest corner
                const radius = Math.hypot(
                    Math.max(originX, window.innerWidth - originX),
                    Math.max(originY, window.innerHeight - originY)
                );

                root.animate(
                    {
                        clipPath: [
                            `circle(0px at ${originX}px ${originY}px)`,
                            `circle(${radius}px at ${originX}px ${originY}px)`
                        ]
                    },
                    {
                        duration: 520,
                        easing: "cubic-bezier(.22, .8, .3, 1)",
                        pseudoElement: "::view-transition-new(root)"
                    }
                );
            })
            .catch(() =>
            {
                // the transition was skipped
            });
    }

    button.addEventListener("click", () =>
    {
        const rect = button.getBoundingClientRect();
        switchTheme(rect.left + rect.width / 2, rect.top + rect.height / 2);
    });

    updateButtonAndMeta();
});
