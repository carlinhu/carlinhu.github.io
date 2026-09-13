document.addEventListener("DOMContentLoaded", () =>
{
    const targets = document.querySelectorAll("[data-reveal]");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion)
    {
        targets.forEach(element => element.classList.add("is-visible"));
        return;
    }

    const options = {
        // 0 so elements taller than the viewport still trigger
        threshold: 0,
        rootMargin: "0px 0px -10% 0px"
    };

    const observer = new IntersectionObserver(entries =>
    {
        entries.forEach(entry =>
        {
            if (!entry.isIntersecting)
            {
                return;
            }

            const element = entry.target;
            const siblings = [...element.parentElement.querySelectorAll(":scope > [data-reveal]")];
            const index = Math.max(0, siblings.indexOf(element));

            element.style.setProperty("--reveal-delay", `${index * 90}ms`);
            element.classList.add("is-visible");
            observer.unobserve(element);
        });
    }, options);

    targets.forEach(element => observer.observe(element));
});
