// Desktop cursor effects: magnetic footer icons and timeline dots that react to proximity.
document.addEventListener("DOMContentLoaded", () =>
{
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (reducedMotion || !finePointer)
    {
        return;
    }

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    // frames since something last moved; after ~1s the loop stops doing work
    let idleFrames = 0;
    let rectsDirty = true;

    const magnets = [...document.querySelectorAll("[data-magnet]")].map(element => ({
        element,
        strength: Number(element.dataset.magnet) || 14,
        radius: Number(element.dataset.magnetRadius) || 150,
        x: 0,
        y: 0,
        rect: null
    }));

    const dots = [...document.querySelectorAll(".timeline-item .dot")].map(element => ({
        element,
        near: 0,
        rect: null
    }));

    function markDirty()
    {
        rectsDirty = true;
        idleFrames = 0;
    }

    function measure()
    {
        for (const magnet of magnets)
        {
            magnet.rect = magnet.element.getBoundingClientRect();
        }

        for (const dot of dots)
        {
            dot.rect = dot.element.getBoundingClientRect();
        }

        rectsDirty = false;
    }

    function isOnScreen(rect)
    {
        return rect && rect.bottom > 0 && rect.top < window.innerHeight;
    }

    function updateMagnet(magnet)
    {
        let targetX = 0;
        let targetY = 0;

        if (isOnScreen(magnet.rect))
        {
            const dx = pointer.x - (magnet.rect.left + magnet.rect.width / 2);
            const dy = pointer.y - (magnet.rect.top + magnet.rect.height / 2);
            const distance = Math.hypot(dx, dy);

            if (distance < magnet.radius && distance > 0.001)
            {
                const pull = (1 - distance / magnet.radius) ** 2;
                targetX = (dx / distance) * pull * magnet.strength;
                targetY = (dy / distance) * pull * magnet.strength;
            }
        }

        magnet.x += (targetX - magnet.x) * 0.16;
        magnet.y += (targetY - magnet.y) * 0.16;

        if (Math.abs(magnet.x) < 0.05 && Math.abs(magnet.y) < 0.05)
        {
            magnet.x = 0;
            magnet.y = 0;
            magnet.element.style.transform = "";
        }
        else
        {
            magnet.element.style.transform = `translate3d(${magnet.x.toFixed(2)}px, ${magnet.y.toFixed(2)}px, 0)`;
            idleFrames = 0;
        }
    }

    function updateDot(dot)
    {
        let target = 0;

        if (isOnScreen(dot.rect))
        {
            const distance = Math.hypot(
                pointer.x - (dot.rect.left + dot.rect.width / 2),
                pointer.y - (dot.rect.top + dot.rect.height / 2)
            );
            target = Math.max(0, 1 - distance / 190);
        }

        dot.near += (target - dot.near) * 0.18;

        if (dot.near < 0.01)
        {
            dot.near = 0;
            dot.element.style.removeProperty("--near");
        }
        else
        {
            dot.element.style.setProperty("--near", dot.near.toFixed(3));
            idleFrames = 0;
        }
    }

    function frame()
    {
        requestAnimationFrame(frame);

        if (idleFrames > 60)
        {
            return;
        }

        idleFrames++;

        if (rectsDirty)
        {
            measure();
        }

        magnets.forEach(updateMagnet);
        dots.forEach(updateDot);
    }

    window.addEventListener("pointermove", event =>
    {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        idleFrames = 0;
    }, { passive: true });

    window.addEventListener("scroll", markDirty, { passive: true });
    window.addEventListener("resize", markDirty, { passive: true });

    // the reveal animation moves elements, so measure again when it ends
    document.addEventListener("transitionend", event =>
    {
        if (event.propertyName === "transform")
        {
            markDirty();
        }
    }, true);

    requestAnimationFrame(frame);
});
