// Painting over the subtitle reveals the hidden text behind it.
document.addEventListener("DOMContentLoaded", () =>
{
    const host = document.querySelector(".paint-reveal");
    if (!host)
    {
        return;
    }

    const BRUSH_RADIUS = 16; // matches the cursor in css/paint.css

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    let width = 0;
    let height = 0;
    let painting = false;
    let lastPoint = null;
    let frameRequest = 0;
    let maskVersion = 0;
    let maskUrl = "";

    function resize()
    {
        const rect = host.getBoundingClientRect();
        const newWidth = Math.max(1, Math.round(rect.width));
        const newHeight = Math.max(1, Math.round(rect.height));

        if (newWidth === width && newHeight === height)
        {
            return;
        }

        // keep what was already painted
        let previous = null;
        if (width && height)
        {
            previous = document.createElement("canvas");
            previous.width = width;
            previous.height = height;
            previous.getContext("2d").drawImage(canvas, 0, 0);
        }

        width = newWidth;
        height = newHeight;
        canvas.width = width;
        canvas.height = height;

        if (previous)
        {
            context.drawImage(previous, 0, 0, width, height);
        }

        updateMask();
    }

    function stamp(x, y)
    {
        const gradient = context.createRadialGradient(x, y, 0, x, y, BRUSH_RADIUS);
        gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
        gradient.addColorStop(0.55, "rgba(0, 0, 0, 0.85)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x, y, BRUSH_RADIUS, 0, Math.PI * 2);
        context.fill();
    }

    function paintTo(x, y)
    {
        // fill the gap between pointer events so the stroke stays continuous
        if (lastPoint)
        {
            const dx = x - lastPoint.x;
            const dy = y - lastPoint.y;
            const distance = Math.hypot(dx, dy);
            const step = BRUSH_RADIUS * 0.3;

            for (let t = step; t < distance; t += step)
            {
                stamp(lastPoint.x + (dx * t) / distance, lastPoint.y + (dy * t) / distance);
            }
        }

        stamp(x, y);
        lastPoint = { x, y };
        requestMaskUpdate();
    }

    function requestMaskUpdate()
    {
        if (frameRequest)
        {
            return;
        }

        frameRequest = requestAnimationFrame(() =>
        {
            frameRequest = 0;
            updateMask();
        });
    }

    function applyMask(url, version)
    {
        // a later stroke already won, this one is stale
        if (version !== maskVersion)
        {
            URL.revokeObjectURL(url);
            return;
        }

        const previous = maskUrl;

        host.style.setProperty("--paint", `url("${url}")`);
        maskUrl = url;

        if (previous)
        {
            // let the new mask paint once before the old one is dropped
            requestAnimationFrame(() => URL.revokeObjectURL(previous));
        }
    }

    // Firefox and Safari decode a new mask asynchronously, so swapping the url right
    // away leaves a frame with no mask and the text blinks. Decode first, swap after.
    function updateMask()
    {
        const version = ++maskVersion;

        if (!canvas.toBlob)
        {
            host.style.setProperty("--paint", `url("${canvas.toDataURL()}")`);
            return;
        }

        canvas.toBlob(blob =>
        {
            if (!blob || version !== maskVersion)
            {
                return;
            }

            const url = URL.createObjectURL(blob);
            const image = new Image();
            image.src = url;

            image.decode().then(() => applyMask(url, version), () => applyMask(url, version));
        });
    }

    function pointerPosition(event)
    {
        const rect = host.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function stopPainting()
    {
        painting = false;
        lastPoint = null;
    }

    host.addEventListener("pointerdown", event =>
    {
        if (event.button !== 0)
        {
            return;
        }

        event.preventDefault();
        painting = true;
        lastPoint = null;
        host.setPointerCapture(event.pointerId);

        const point = pointerPosition(event);
        paintTo(point.x, point.y);
    });

    host.addEventListener("pointermove", event =>
    {
        if (!painting)
        {
            return;
        }

        const point = pointerPosition(event);
        paintTo(point.x, point.y);
    });

    host.addEventListener("pointerup", stopPainting);
    host.addEventListener("pointercancel", stopPainting);

    new ResizeObserver(resize).observe(host);

    resize();
    host.classList.add("is-ready");
});
