function color(rgba) {
    const [red, green, blue, alpha = 1] = rgba;
    return "rgba(" + [red * 255, green * 255, blue * 255, alpha].join(",") + ")";
}

function graphics(element) {
    const canvas = element instanceof HTMLCanvasElement ? element : null;
    const ctx = canvas?.getContext("2d");
    return {
        BrushType: { SOLID_COLOR: 0 },
        PenType: { SOLID_COLOR: 0 },
        newBrush: (_, rgba) => color(rgba),
        newPen: (_, rgba, width) => ({ color: color(rgba), width }),
        set backgroundColor(value) { element.style.backgroundColor = value; },
        set foregroundColor(value) { element.style.color = value.color; },
        newPath: () => ctx.beginPath(),
        moveTo: (x, y) => ctx.moveTo(x, y),
        lineTo: (x, y) => ctx.lineTo(x, y),
        closePath: () => ctx.closePath(),
        ellipsePath(x, y, width, height) {
            ctx.moveTo(x + width, y + height / 2);
            ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, 2 * Math.PI);
            ctx.closePath();
        },
        fillPath(brush) {
            ctx.fillStyle = brush;
            ctx.fill();
        },
        strokePath(pen) {
            ctx.strokeStyle = pen.color;
            ctx.lineWidth = pen.width;
            ctx.stroke();
        }
    };
}

const keyNames = { " ": "Space", ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right" };

export function createHost(root, returnToCatalog) {
    const lifetime = new AbortController();
    const options = { signal: lifetime.signal };
    let timer = null;
    let dialog;
    let closed = false;
    const pressed = new Map();

    function stopHeartbeat() {
        clearInterval(timer);
        timer = null;
    }

    function dispose() {
        if (closed) return;
        closed = true;
        try {
            dialog?.onClose?.();
        } finally {
            stopHeartbeat();
            lifetime.abort();
        }
    }

    function control(type, label, items) {
        const tags = { dialog: "div", group: "div", button: "button", statictext: "div", dropdownlist: "select" };
        const element = document.createElement(tags[type]);
        const children = [];
        const listeners = new Map();
        let node = element;
        let draw;
        let painter;
        element.className = "game-" + type;
        if (type === "button") {
            element.type = "button";
            element.textContent = label;
        } else if (type === "statictext") {
            element.textContent = label;
        } else if (type === "dropdownlist") {
            element.setAttribute("aria-label", "Game language");
            for (const item of items) element.add(new Option(item));
        }
        const item = {
            children,
            listeners,
            preferredSize: [],
            minimumSize: [],
            maximumSize: [],
            get element() { return node; },
            get graphics() { return painter ??= graphics(node); },
            get text() { return node.textContent; },
            set text(value) {
                if (type === "dialog") node.setAttribute("aria-label", value);
                else node.textContent = value;
            },
            set visible(value) { node.hidden = !value; },
            set active(value) {
                // Give game keys a focus target without activating a native button on Space.
                if (value) dialog.element.focus({ preventScroll: true });
            },
            get selection() {
                return node.selectedIndex < 0 ? null : { index: node.selectedIndex };
            },
            set selection(value) { node.selectedIndex = value; },
            set onDraw(handler) {
                draw = handler;
                const canvas = document.createElement("canvas");
                canvas.className = "game-canvas";
                canvas.setAttribute("aria-label", "Game board");
                element.replaceWith(canvas);
                canvas.hidden = element.hidden;
                node = canvas;
            },
            add(childType, _bounds, content) {
                const child = control(childType, content, content);
                children.push(child);
                node.append(child.element);
                return child;
            },
            addEventListener(name, fn) {
                if (!listeners.has(name)) listeners.set(name, []);
                listeners.get(name).push(fn);
            },
            dispatch(name, event) {
                for (const listener of listeners.get(name) ?? []) listener.call(item, event);
            },
            hide() {},
            show() {},
            paint() {
                item.notify("onDraw");
                children.forEach((child) => child.paint());
            },
            notify(name) {
                if (name !== "onDraw" || !draw) return;
                const ctx = node.getContext("2d");
                ctx.clearRect(0, 0, node.width, node.height);
                draw.call(item);
            },
            mount() {
                if (draw) {
                    const [width, height] = item.preferredSize;
                    node.width = width;
                    node.height = height;
                } else if (type === "dialog" || type === "group") {
                    node.dataset.orientation = item.orientation || "column";
                    if (typeof item.spacing === "number") node.style.gap = item.spacing + "px";
                }
                node.addEventListener("click", () => item.onClick?.(), options);
                node.addEventListener("change", () => item.onChange?.(), options);
                for (const name of ["keydown", "keyup"]) {
                    if (!listeners.has(name)) continue;
                    node.addEventListener(name, (event) => {
                        if (event.ctrlKey || event.altKey || event.metaKey || node.tagName === "SELECT") return;
                        event.stopPropagation();
                        const input = {
                            keyName: keyNames[event.key] || event.key,
                            target: item,
                            currentTarget: item,
                            shiftKey: event.shiftKey,
                            preventDefault: () => event.preventDefault(),
                            stopPropagation: () => event.stopPropagation()
                        };
                        if (name === "keydown") pressed.set(event.code, input.keyName);
                        else pressed.delete(event.code);
                        item.dispatch(name, input);
                    }, options);
                }
                for (const name of ["mousedown", "mouseup", "mousemove"]) {
                    if (!listeners.has(name)) continue;
                    node.addEventListener(name.replace("mouse", "pointer"), (event) => {
                        if (draw && name === "mousedown" && listeners.has("mouseup")) {
                            node.setPointerCapture(event.pointerId);
                        }
                        const bounds = node.getBoundingClientRect();
                        const scaleX = draw ? node.width / bounds.width : 1;
                        const scaleY = draw ? node.height / bounds.height : 1;
                        item.dispatch(name, {
                            clientX: (event.clientX - bounds.left) * scaleX,
                            clientY: (event.clientY - bounds.top) * scaleY,
                            shiftKey: event.shiftKey,
                            button: event.button,
                            preventDefault: () => event.preventDefault(),
                            stopPropagation: () => event.stopPropagation()
                        });
                    }, options);
                }
                children.forEach((child) => child.mount());
            }
        };
        return item;
    }

    function Window(_type, title) {
        dialog = control("dialog");
        dialog.text = title;
        dialog.center = () => {};
        dialog.show = () => {
            dialog.element.tabIndex = -1;
            root.append(dialog.element);
            dialog.mount();
            dialog.element.focus({ preventScroll: true });
            dialog.onShow?.();
            dialog.paint();
        };
        dialog.close = () => {
            dispose();
            returnToCatalog();
        };
        return dialog;
    }

    const noop = () => {};
    window.addEventListener("blur", () => {
        for (const keyName of pressed.values()) {
            dialog?.dispatch("keyup", { keyName, target: dialog, currentTarget: dialog, preventDefault: noop, stopPropagation: noop });
        }
        pressed.clear();
    }, options);
    window.addEventListener("pagehide", dispose, options);
    return {
        Window,
        dispose,
        heartbeatStart(config) {
            stopHeartbeat();
            timer = setInterval(() => {
                dialog.dispatch("keydown", {
                    keyName: "F15",
                    target: dialog,
                    currentTarget: dialog,
                    preventDefault: noop,
                    stopPropagation: noop
                });
            }, config.tickMs || 35);
            return true;
        },
        heartbeatStop: stopHeartbeat,
        heartbeatLastError: () => "",
        getGameSaveFile: (token) => "relax-arcade:" + token,
        readKeyValueFile(key) {
            try { return JSON.parse(localStorage.getItem(key)); }
            catch { return null; }
        },
        writeKeyValueFile(key, pairs) {
            const values = {};
            for (const pair of pairs) {
                const separator = pair.indexOf("=");
                values[pair.slice(0, separator)] = pair.slice(separator + 1);
            }
            try {
                localStorage.setItem(key, JSON.stringify(values));
                return true;
            } catch { return false; }
        },
        perfNow: () => Date.now(),
        perfInit: noop,
        perfKey: noop,
        perfFrame: noop,
        perfNote: noop,
        perfClose: noop
    };
}
