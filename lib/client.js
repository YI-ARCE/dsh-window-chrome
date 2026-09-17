window.__ModuleLoader__.load({
	id: "dsh-window-chrome",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		//#region client/windowChrome.js
		/**
		 * Desktop-shell window chrome, ported from the script strings main.go used
		 * to inject through ExecJS on every navigation:
		 *  - a transparent drag hotzone is mounted at the top of the centre column
		 *    only while the session header is being swapped (aria-hidden), so the
		 *    frameless window can still be dragged during the transition;
		 *  - a double-click on any `--wails-draggable: drag` region toggles
		 *    maximize, emitted through the wails bridge to the Go window process.
		 *
		 * The `<style>` toggles the hotzone's visibility through `body:has(...)`
		 * with zero latency, matching `aria-hidden` on the same frame; the interval
		 * only keeps the node mounted while the transition is in flight and removes
		 * it afterwards (no DOM corpses, and a fallback for old WebView2 without
		 * `:has()`).
		 *
		 * @returns a disposer that removes every node, listener, and timer.
		 */
		function mountWindowChrome() {
			const BAR_ID = "dsh-injected-drag-bar";
			const CSS_ID = "dsh-injected-drag-style";

			function ensureStyle() {
				if (document.getElementById(CSS_ID)) return;
				const st = document.createElement("style");
				st.id = CSS_ID;
				st.textContent =
					"#" + BAR_ID + "{position:absolute;top:0;left:0;width:100%;height:40px;" +
					"z-index:2147483647;--wails-draggable:drag;}" +
					'body:has([data-dsh-surface="session-header"] header[aria-hidden="true"]) #' +
					BAR_ID + "{display:block!important}";
				(document.head || document.documentElement).appendChild(st);
			}

			function isSwitching() {
				const sh = document.querySelector('[data-slot="conversation.session.header"]');
				return !!(sh && sh.querySelector('header[aria-hidden="true"]'));
			}

			function sync() {
				const host = document.querySelector('[data-slot="conversation.session.header"]');
				let bar = document.getElementById(BAR_ID);
				ensureStyle();
				if (!host || !isSwitching()) {
					if (bar && bar.parentElement) bar.parentElement.removeChild(bar);
					return;
				}
				if (bar && bar.parentElement === host) return;
				if (bar && bar.parentElement) bar.parentElement.removeChild(bar);
				bar = document.createElement("div");
				bar.id = BAR_ID;
				host.style.setProperty("position", "relative");
				host.appendChild(bar);
			}

			function emitToggle() {
				if (window._wails && window._wails.invoke) {
					window._wails.invoke("wails:event:emit:titlebar-dblclick");
				}
			}

			function onDblClick(e) {
				const t =
					e.target instanceof HTMLElement
						? e.target
						: e.target && e.target.parentElement;
				if (!(t instanceof HTMLElement)) return;
				const s = window.getComputedStyle(t);
				if (
					s.getPropertyValue("--wails-draggable").trim() === "drag" &&
					e.offsetX >= 0 &&
					e.offsetX < t.clientWidth &&
					e.offsetY >= 0 &&
					e.offsetY < t.clientHeight
				) {
					e.preventDefault();
					e.stopPropagation();
					emitToggle();
				}
			}

			const timer = setInterval(sync, 150);
			document.addEventListener("visibilitychange", sync);
			window.addEventListener("focus", sync);
			document.addEventListener("dblclick", onDblClick, true);
			sync();

			return function dispose() {
				clearInterval(timer);
				document.removeEventListener("visibilitychange", sync);
				window.removeEventListener("focus", sync);
				document.removeEventListener("dblclick", onDblClick, true);
				const bar = document.getElementById(BAR_ID);
				if (bar && bar.parentElement) bar.parentElement.removeChild(bar);
				const st = document.getElementById(CSS_ID);
				if (st && st.parentElement) st.parentElement.removeChild(st);
			};
		}
		//#endregion
		//#region client/panelCss.js
		/** Stylesheet id owned by this package. */
		const STYLE_ID = "dsh-window-chrome-style";

		/**
		 * Footer-action styling. Colors come from theme tokens so the control
		 * follows the active skin; `data-wide` switches between the wide sidebar
		 * (icon + label, left aligned) and the 56px rail (icon only, centred).
		 *
		 * Interaction states use the dedicated interactive tokens rather than a
		 * surface token: `--dsw-alias-bg-layer-1/2` resolve to solid `#fff`
		 * (light) / near-black (dark) and vanish against the sidebar's translucent
		 * fill, while `--dsw-alias-interactive-bg-hover` (`#2631480f` light /
		 * `#ffffff14` dark) and `--dsw-alias-interactive-bg-active`
		 * (`#2631481a` / `#ffffff24`) are the pair the design system reserves for
		 * exactly this, so they stay correct across themes and skins.
		 */
		const CSS =
			".dsh-window-chrome-action{display:flex;align-items:center;justify-content:center;" +
			"gap:8px;width:100%;height:32px;padding:0;margin:0 0 2px;background:transparent;" +
			"border:none;border-radius:6px;color:var(--dsw-alias-label-primary,inherit);" +
			"cursor:pointer;font:inherit;font-size:13px;line-height:1;" +
			"transition:background-color .12s var(--ds-ease-in-out,ease)}" +
			".dsh-window-chrome-action:hover{background:" +
			"var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12))}" +
			".dsh-window-chrome-action:active{background:" +
			"var(--dsw-alias-interactive-bg-active,rgba(127,127,127,.2))}" +
			".dsh-window-chrome-action:focus-visible{outline:2px solid " +
			"var(--dsw-alias-brand-primary,currentColor);outline-offset:1px}" +
			'.dsh-window-chrome-action[data-wide="true"]{justify-content:flex-start;padding:0 8px}' +
			".dsh-window-chrome-action-icon{display:inline-flex;flex:none;align-items:center;" +
			"justify-content:center;width:16px;height:16px}" +
			".dsh-window-chrome-action-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}";

		/**
		 * Insert the package stylesheet once.
		 * @returns a disposer removing the node this call created.
		 */
		function mountStyles() {
			if (document.getElementById(STYLE_ID)) return function () {};
			const st = document.createElement("style");
			st.id = STYLE_ID;
			st.textContent = CSS;
			(document.head || document.documentElement).appendChild(st);
			return function () {
				if (st.parentElement) st.parentElement.removeChild(st);
			};
		}
		//#endregion
		//#region client/DevToolsAction.js
		/**
		 * Sidebar-footer action opening the WebView devtools.
		 *
		 * The injected runtime exposes no devtools call on `window._wails` (only
		 * `invoke`), so the click is forwarded to the Go window process over the
		 * `wails:event:emit:` channel enabled by AllowSimpleEventEmit — the same
		 * path the titlebar double-click already uses. Go answers it with
		 * OpenDevTools().
		 *
		 * @param props - Owner share: `wide` is false while the sidebar is a rail.
		 * @returns the footer action button.
		 */
		function DevToolsAction(props) {
			const wide = !!(props && props.wide);
			return react.createElement(
				"button",
				{
					type: "button",
					className: "dsh-window-chrome-action",
					"data-wide": wide ? "true" : "false",
					title: "DevTools",
					"aria-label": "DevTools",
					onClick: () => {
						if (window._wails && window._wails.invoke) {
							window._wails.invoke("wails:event:emit:open-devtools");
						}
					},
				},
				react.createElement(
					"span",
					{ className: "dsh-window-chrome-action-icon", "aria-hidden": "true" },
					react.createElement(
						"svg",
						{ width: 16, height: 16, viewBox: "0 0 16 16", fill: "none" },
						react.createElement("path", {
							d: "M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5M9.25 2.5l-2.5 11",
							stroke: "currentColor",
							strokeWidth: 1.5,
							strokeLinecap: "round",
							strokeLinejoin: "round",
						}),
					),
				),
				wide
					? react.createElement(
							"span",
							{ className: "dsh-window-chrome-action-label" },
							"DevTools",
						)
					: null,
			);
		}
		//#endregion
		//#region client/index.js
		/** Required service: the UI slot registry. */
		const inject = ["slots"];

		/**
		 * Mount the desktop-shell chrome (DOM behavior) and contribute the sidebar
		 * footer "DevTools" action above Settings.
		 * @param ctx - Client root context.
		 */
		function apply(ctx) {
			if (ctx && typeof ctx.effect === "function") {
				ctx.effect(() => {
					const stopStyles = mountStyles();
					const stopChrome = mountWindowChrome();
					return () => {
						stopChrome();
						stopStyles();
					};
				});
			} else {
				// Defensive fallback for a context without `effect`: mount once per page.
				if (!window.__dshWindowChromeMounted) {
					window.__dshWindowChromeMounted = true;
					mountStyles();
					mountWindowChrome();
				}
			}

			const slots = ctx && ctx.slots;
			if (!slots || typeof slots.inject !== "function") return;
			// The sidebar foot renders `sidebar.footer.action` above
			// `sidebar.settings`, so a negative order puts DevTools first among the
			// footer actions — directly above the Settings row.
			slots.inject("sidebar.footer.action", () =>
				slots.register(
					{
						name: "sidebar.footer.action",
						id: "dsh-window-chrome-devtools",
						order: -1,
					},
					DevToolsAction,
				),
			);
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	},
});
