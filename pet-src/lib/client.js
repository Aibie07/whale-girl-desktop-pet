window.__ModuleLoader__.load({
	id: "dsh-pet",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		// Injected by install-pet.cjs: { <skinName>: { idleA, idleB, thinking, output, done } }
		// each value is a `data:image/gif;base64,...` string. First key is the default skin.
		const ASSETS = __ASSETS__;

		const PET_SIZE_PX = 220;
		const MIN_SIZE_PX = 80;
		const MAX_SIZE_PX = 640;
		const ZOOM_STEP = 1.1;
		const LS_KEY = "dsh-pet:size";
		const LS_SKIN_KEY = "dsh-pet:skin";
		const CLICK_MOVE_TOLERANCE = 6;
		const DBLCLICK_MS = 250;
		const IDLE_FLIP_MS = 2500;
		const DONE_MS = 5000;
		const POLL_MS = 250;
		const REACTION_MS = 3000;
		const SEQ_MS = 2000;

		// Injected by install-pet.cjs: array of reaction GIF filenames, served by
		// the host /api/pet/reactions/<name> route. Used for the random left-click
		// reaction, the "动作" menu, and the "轮番播放" sequence.
		const REACTIONS = __REACTIONS__;

		// Idle cycle: the skin's idleA/idleB, then these specific extra frames.
		const IDLE_EXTRA_REACTIONS = [
			"蓝色大肥鱼_舞蹈(散味)_2026-08-18-14-08-18.gif",
			"蓝色大肥鱼_折扇_2026-08-18-14-12-51.gif",
			"蓝色大肥鱼_摇头_2026-08-18-14-15-27.gif",
			"蓝色大肥鱼_跳舞(低皮质醇)_2026-08-18-14-08-05.gif",
			"蓝色大肥鱼_跳舞(Helltaker)_2026-08-18-14-07-49.gif",
			"蓝色大肥鱼_跳舞(Caramelldansen)_2026-08-18-14-07-42.gif",
			"蓝色大肥鱼_跳舞 1_2026-08-18-14-07-32.gif",
			"蓝色大肥鱼_画板_2026-08-18-14-36-39.gif"
		];

		/**
		 * Map a model/agent state to one of the four pet modes:
		 *   idle     -> alternate idleA / idleB
		 *   thinking -> thinking
		 *   output   -> output
		 *   done     -> done (held for DONE_MS, then back to idle)
		 */
		function createPetState() {
			const lastTurnEndSeq = new Map(); // sessionId -> seq of freshest turn/end
			const doneAt = new Map();        // sessionId -> timestamp of that turn/end

			function runningState(events) {
				// Find the most recent assistant chunk while a turn is open.
				let lastChunk = null;
				for (let i = events.length - 1; i >= 0; i--) {
					const e = events[i];
					if (!e || typeof e.type !== "string") continue;
					if (e.type === "turn/end") break;
					if (e.type === "assistant/chunk") {
						lastChunk = e.data && e.data.chunk;
						break;
					}
				}
				if (!lastChunk) return "thinking";
				const t = lastChunk.type;
				if (t === "reasoning-delta") return "thinking";
				if (t === "text-delta" || t === "tool-call-delta") return "output";
				if (t === "block-start") return lastChunk.blockType === "reasoning" ? "thinking" : "output";
				if (t === "block-end" || t === "usage" || t === "finish") return "output";
				return "thinking";
			}

			function sessionState(session) {
				const events = Array.isArray(session.events) ? session.events : [];
				const last = events[events.length - 1];
				if (last && last.type === "turn/end") {
					const seq = typeof last.seq === "number" ? last.seq : (events.length - 1);
					const prev = lastTurnEndSeq.get(session.sessionId) ?? -1;
					if (seq > prev) {
						lastTurnEndSeq.set(session.sessionId, seq);
						doneAt.set(session.sessionId, Date.now());
					}
					return (Date.now() - (doneAt.get(session.sessionId) ?? 0) < DONE_MS) ? "done" : "idle";
				}
				if (session.running) return runningState(events);
				return "idle";
			}

			function compute(sessionsService) {
				if (!sessionsService || !sessionsService.manager) return "idle";
				const sessions = sessionsService.manager.sessions;
				if (!sessions || typeof sessions.values !== "function") return "idle";
				let best = "idle";
				const rank = { idle: 0, done: 1, thinking: 2, output: 3 };
				for (const session of sessions.values()) {
					if (!session) continue;
					const s = sessionState(session);
					if (rank[s] > rank[best]) best = s;
				}
				return best;
			}

			return { compute };
		}

		function mountDom(skin, reaction) {
			const wrap = document.createElement("div");
			wrap.id = "dsh-pet";
			wrap.title = "DSH 桌宠 · 拖拽移动 / 滚轮缩放 / 右键菜单 / 双击复位";
			const initialSize = loadSavedSize();
			wrap.style.cssText =
				"position:fixed;right:16px;bottom:16px;width:" + initialSize + "px;height:" + initialSize + "px;" +
				"z-index:2147483000;cursor:grab;user-select:none;-webkit-user-select:none;touch-action:none;";

			const img = document.createElement("img");
			img.id = "dsh-pet-img";
			img.draggable = false;
			img.alt = "";
			img.style.cssText =
				"width:100%;height:100%;object-fit:contain;pointer-events:none;" +
				"-webkit-user-drag:none;image-rendering:auto;";

			// Balance bubble shown above the pet on single click.
			const bubble = document.createElement("div");
			bubble.id = "dsh-pet-balance";
			bubble.style.cssText =
				"position:absolute;left:50%;bottom:100%;transform:translateX(-50%);" +
				"margin-bottom:10px;padding:10px 14px;border-radius:12px;" +
				"background:rgba(100,181,246,0.96);color:#ffffff;" +
				"font:12px/1.6 system-ui,-apple-system,'Segoe UI',sans-serif;" +
				"white-space:nowrap;text-align:left;display:none;" +
				"box-shadow:0 10px 28px rgba(33,150,243,0.45);" +
				"pointer-events:none;z-index:2147483001;";

			wrap.appendChild(img);
			wrap.appendChild(bubble);
			document.body.appendChild(wrap);
			const gestures = attachGestures(wrap, initialSize, () => {
				if (reaction && typeof reaction.play === "function") reaction.play();
			});
			const menuCtl = mountMenu(wrap, {
				applySize: gestures.applySize,
				toggleBalance: () => toggleBalance(bubble),
				skinNames: skin.names(),
				setSkin: (name) => skin.set(name),
				reactions: REACTIONS,
				playReaction: (name) => {
					if (reaction && typeof reaction.playByName === "function") reaction.playByName(name);
				},
				playSequence: () => {
					if (reaction && typeof reaction.playSequence === "function") reaction.playSequence();
				}
			});
			return { wrap, img, bubble, dispose: () => menuCtl.dispose() };
		}

		function balanceError(message) {
			const err = new Error(message);
			err.balanceError = true;
			return err;
		}

		async function fetchBalance() {
			const res = await fetch("/api/pet/balance");
			let payload;
			try {
				payload = await res.json();
			} catch (_) {
				throw balanceError("响应解析失败（HTTP " + res.status + "）");
			}
			if (!res.ok || !payload || payload.ok !== true) {
				throw balanceError((payload && payload.error) || ("HTTP " + res.status));
			}
			return payload.data;
		}

		function renderBalance(bubble, data) {
			bubble.textContent = "";
			const title = document.createElement("div");
			title.textContent = "DeepSeek 余额";
			title.style.cssText = "font-weight:600;margin-bottom:4px;color:#ffffff;";
			bubble.appendChild(title);

			const infos = data && Array.isArray(data.balance_infos) ? data.balance_infos : [];
			if (infos.length === 0) {
				const line = document.createElement("div");
				line.textContent = "暂无余额数据";
				bubble.appendChild(line);
				return;
			}
			for (const info of infos) {
				const line = document.createElement("div");
				line.textContent =
					info.currency + " · 总余额 " + info.total_balance +
					"（充值 " + info.topped_up_balance + " / 赠送 " + info.granted_balance + "）";
				bubble.appendChild(line);
			}
		}

		function toggleBalance(bubble) {
			if (!bubble) return;
			if (bubble.style.display !== "none") {
				bubble.style.display = "none";
				return;
			}
			bubble.style.display = "block";
			bubble.textContent = "查询余额中…";
			fetchBalance()
				.then((data) => renderBalance(bubble, data))
				.catch((err) => {
					bubble.textContent = "余额查询失败：" + (err && err.message ? err.message : String(err));
				});
		}

		function playReactionByName(renderer, name) {
			if (!name) return;
			renderer.playReaction("/api/pet/reactions/" + encodeURIComponent(name), REACTION_MS);
		}

		// Pick a random reaction GIF and play it for a short while, then revert
		// to the pet's current mode (the renderer owns the revert timer).
		function playRandomReaction(renderer) {
			if (!Array.isArray(REACTIONS) || REACTIONS.length === 0) return;
			playReactionByName(renderer, REACTIONS[Math.floor(Math.random() * REACTIONS.length)]);
		}

		// Human-readable label for a reaction filename (strip prefix + timestamp).
		function reactionLabel(name) {
			let s = String(name).replace(/\.gif$/i, "");
			s = s.replace(/^蓝色大肥鱼_/, "");
			s = s.replace(/_\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/, "");
			return s || String(name);
		}

		// Play every reaction GIF in sequence (looping) until the pet's state
		// changes or another action interrupts it.
		function playAllReactions(renderer) {
			if (!Array.isArray(REACTIONS) || REACTIONS.length === 0) return;
			const urls = REACTIONS.map((name) => "/api/pet/reactions/" + encodeURIComponent(name));
			renderer.playSequence(urls, SEQ_MS);
		}

		function loadSavedSize() {
			try {
				const v = parseInt(localStorage.getItem(LS_KEY), 10);
				if (Number.isFinite(v)) return Math.min(MAX_SIZE_PX, Math.max(MIN_SIZE_PX, v));
			} catch (_) {}
			return PET_SIZE_PX;
		}

		function skinNames() {
			return ASSETS ? Object.keys(ASSETS) : [];
		}

		function loadSavedSkin() {
			try {
				const v = localStorage.getItem(LS_SKIN_KEY);
				if (v && ASSETS && ASSETS[v]) return v;
			} catch (_) {}
			return skinNames()[0] || null;
		}

		// Skin state: which skin is active, its assets, and a change subscription
		// so the renderer can re-apply the current mode when the user switches.
		function createSkinState() {
			let current = loadSavedSkin();
			const listeners = [];
			return {
				names: skinNames,
				current: () => current,
				assets: () => (ASSETS && ASSETS[current]) || {},
				set(name) {
					if (!ASSETS || !ASSETS[name]) return;
					current = name;
					try { localStorage.setItem(LS_SKIN_KEY, name); } catch (_) {}
					for (const l of listeners.slice()) l(name);
				},
				onChange(l) {
					listeners.push(l);
					return () => {
						const i = listeners.indexOf(l);
						if (i >= 0) listeners.splice(i, 1);
					};
				}
			};
		}

		// Drag to move, wheel to zoom, pinch to zoom, single-click toggles the
		// balance bubble, double-click resets size.
		function attachGestures(el, initialSize, onSingleClick) {
			let size = initialSize;
			const pointers = new Map(); // pointerId -> { x, y }
			let dragPointer = null;
			let offX = 0;
			let offY = 0;
			let pinchDist = null;
			let downX = 0;
			let downY = 0;
			let moved = false;
			let lastClickAt = 0;
			let clickTimer = null;

			function applySize(next) {
				size = Math.min(MAX_SIZE_PX, Math.max(MIN_SIZE_PX, next));
				el.style.width = size + "px";
				el.style.height = size + "px";
				try { localStorage.setItem(LS_KEY, String(Math.round(size))); } catch (_) {}
			}

			function activePoints() {
				return Array.from(pointers.values());
			}

			el.addEventListener("pointerdown", (e) => {
				if (e.button !== 0 && e.pointerType === "mouse") return;
				pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
				try { el.setPointerCapture(e.pointerId); } catch (_) {}

				if (pointers.size === 1) {
					const rect = el.getBoundingClientRect();
					dragPointer = e.pointerId;
					offX = e.clientX - rect.left;
					offY = e.clientY - rect.top;
					downX = e.clientX;
					downY = e.clientY;
					moved = false;
					el.style.cursor = "grabbing";
				} else if (pointers.size === 2) {
					dragPointer = null;
					moved = true;
					const pts = activePoints();
					pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
					el.style.cursor = "grabbing";
				}
				e.preventDefault();
			});

			el.addEventListener("pointermove", (e) => {
				if (!pointers.has(e.pointerId)) return;
				pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

				if (pointers.size === 1 && dragPointer === e.pointerId) {
					if (Math.hypot(e.clientX - downX, e.clientY - downY) > CLICK_MOVE_TOLERANCE) moved = true;
					el.style.left = (e.clientX - offX) + "px";
					el.style.top = (e.clientY - offY) + "px";
					el.style.right = "auto";
					el.style.bottom = "auto";
				} else if (pointers.size === 2 && pinchDist != null) {
					const pts = activePoints();
					const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
					if (d > 0) {
						applySize(size * (d / pinchDist));
						pinchDist = d;
					}
				}
			});

			const end = (e) => {
				pointers.delete(e.pointerId);
				if (pointers.size < 2) pinchDist = null;
				if (pointers.size === 0) {
					dragPointer = null;
					el.style.cursor = "grab";
					if (!moved) {
						const now = Date.now();
						if (now - lastClickAt <= DBLCLICK_MS) {
							clearTimeout(clickTimer);
							clickTimer = null;
							lastClickAt = 0;
							applySize(PET_SIZE_PX);
						} else {
							lastClickAt = now;
							clickTimer = setTimeout(() => {
								clickTimer = null;
								if (typeof onSingleClick === "function") onSingleClick();
							}, DBLCLICK_MS);
						}
					}
				}
				try { if (e && typeof e.pointerId === "number" && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId); } catch (_) {}
			};
			el.addEventListener("pointerup", end);
			el.addEventListener("pointercancel", end);

			el.addEventListener("wheel", (e) => {
				e.preventDefault();
				const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
				applySize(size * factor);
			}, { passive: false });

			return { applySize, getSize: () => size };
		}

		// Right-click context menu (pink): adjust size, query balance, reset
		// position, hide/show. Also owns the "recall" button shown while hidden.
		function mountMenu(wrap, actions) {
			let style = document.getElementById("dsh-pet-menu-style");
			if (!style) {
				style = document.createElement("style");
				style.id = "dsh-pet-menu-style";
				style.textContent =
					"#dsh-pet-menu{position:fixed;background:#64b5f6;border-radius:10px;padding:6px;" +
					"box-shadow:0 10px 28px rgba(33,150,243,0.45);font:13px/1.6 system-ui,-apple-system,'Segoe UI',sans-serif;" +
					"color:#fff;user-select:none;-webkit-user-select:none;z-index:2147483010;min-width:132px;display:none;}" +
					"#dsh-pet-menu .item{padding:6px 12px;border-radius:6px;cursor:pointer;white-space:nowrap;}" +
					"#dsh-pet-menu .item:hover{background:#2196f3;}" +
					"#dsh-pet-menu .size-panel{display:none;padding:2px 0 4px;border-top:1px solid rgba(255,255,255,0.28);margin-top:2px;}" +
					"#dsh-pet-menu .action-panel{display:none;max-height:320px;overflow-y:auto;border-top:1px solid rgba(255,255,255,0.28);margin-top:2px;padding:2px 0;}" +
					"#dsh-pet-recall{position:fixed;right:16px;bottom:16px;z-index:2147483000;padding:8px 14px;border-radius:999px;" +
					"background:#64b5f6;color:#fff;font:13px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;cursor:pointer;" +
					"box-shadow:0 8px 20px rgba(33,150,243,0.4);display:none;user-select:none;-webkit-user-select:none;}";
				document.head.appendChild(style);
			}

			const menu = document.createElement("div");
			menu.id = "dsh-pet-menu";

			function hideMenu() {
				menu.style.display = "none";
			}
			function showMenuAt(x, y) {
				menu.style.display = "block";
				const mw = menu.offsetWidth;
				const mh = menu.offsetHeight;
				const vw = window.innerWidth;
				const vh = window.innerHeight;
				let left = x;
				let top = y;
				if (left + mw > vw - 8) left = Math.max(8, vw - mw - 8);
				if (top + mh > vh - 8) top = Math.max(8, vh - mh - 8);
				menu.style.left = left + "px";
				menu.style.top = top + "px";
			}

			function makeItem(label, onClick) {
				const el = document.createElement("div");
				el.className = "item";
				el.textContent = label;
				if (onClick) {
					el.addEventListener("click", (e) => {
						e.stopPropagation();
						hideMenu();
						onClick();
					});
				}
				menu.appendChild(el);
				return el;
			}

			// "调大小" — inline accordion of preset sizes.
			const sizeItem = document.createElement("div");
			sizeItem.className = "item";
			sizeItem.textContent = "调大小 ▾";
			menu.appendChild(sizeItem);

			const sizePanel = document.createElement("div");
			sizePanel.className = "size-panel";
			const presets = [["小", 120], ["标准", PET_SIZE_PX], ["大", 320], ["超大", 480]];
			for (const pair of presets) {
				const label = pair[0];
				const px = pair[1];
				const chip = document.createElement("div");
				chip.className = "item";
				chip.textContent = label + "（" + px + "px）";
				chip.addEventListener("click", (e) => {
					e.stopPropagation();
					hideMenu();
					actions.applySize(px);
				});
				sizePanel.appendChild(chip);
			}
			menu.appendChild(sizePanel);

			sizeItem.addEventListener("click", (e) => {
				e.stopPropagation();
				sizePanel.style.display = sizePanel.style.display === "none" ? "block" : "none";
			});

			// "换肤" — inline accordion of available skins.
			const skinItem = document.createElement("div");
			skinItem.className = "item";
			skinItem.textContent = "换肤 ▾";
			menu.appendChild(skinItem);

			const skinPanel = document.createElement("div");
			skinPanel.className = "size-panel";
			const skinList = Array.isArray(actions.skinNames) ? actions.skinNames : [];
			for (const name of skinList) {
				const chip = document.createElement("div");
				chip.className = "item";
				chip.textContent = name;
				chip.addEventListener("click", (e) => {
					e.stopPropagation();
					hideMenu();
					actions.setSkin(name);
				});
				skinPanel.appendChild(chip);
			}
			menu.appendChild(skinPanel);

			skinItem.addEventListener("click", (e) => {
				e.stopPropagation();
				skinPanel.style.display = skinPanel.style.display === "none" ? "block" : "none";
			});

			// "动作" — inline accordion listing every reaction GIF.
			const actionItem = document.createElement("div");
			actionItem.className = "item";
			actionItem.textContent = "动作 ▾";
			menu.appendChild(actionItem);

			const actionPanel = document.createElement("div");
			actionPanel.className = "action-panel";
			const reactionList = Array.isArray(actions.reactions) ? actions.reactions : [];
			for (const name of reactionList) {
				const chip = document.createElement("div");
				chip.className = "item";
				chip.textContent = reactionLabel(name);
				chip.addEventListener("click", (e) => {
					e.stopPropagation();
					hideMenu();
					actions.playReaction(name);
				});
				actionPanel.appendChild(chip);
			}
			menu.appendChild(actionPanel);

			actionItem.addEventListener("click", (e) => {
				e.stopPropagation();
				actionPanel.style.display = actionPanel.style.display === "none" ? "block" : "none";
			});

			makeItem("轮番播放", () => actions.playSequence());

			makeItem("查余额", () => actions.toggleBalance());
			makeItem("复位位置", () => {
				wrap.style.left = "auto";
				wrap.style.top = "auto";
				wrap.style.right = "16px";
				wrap.style.bottom = "16px";
			});
			makeItem("隐藏桌宠", () => hidePet());

			document.body.appendChild(menu);

			const recall = document.createElement("div");
			recall.id = "dsh-pet-recall";
			recall.textContent = "🐳 召回桌宠";
			recall.addEventListener("click", () => showPet());
			document.body.appendChild(recall);

			function hidePet() {
				wrap.style.display = "none";
				recall.style.display = "block";
			}
			function showPet() {
				wrap.style.display = "";
				recall.style.display = "none";
			}

			function onPetContext(e) {
				e.preventDefault();
				e.stopPropagation();
				showMenuAt(e.clientX, e.clientY);
			}
			function onDocContext(e) {
				if (!menu.contains(e.target)) hideMenu();
			}
			function onDocPointer(e) {
				if (menu.style.display !== "none" && !menu.contains(e.target)) hideMenu();
			}
			function onDocWheel(e) {
				// Scrolling inside the menu (e.g. the action list) must not close it.
				if (menu.contains(e.target)) return;
				hideMenu();
			}
			function onWinBlur() {
				hideMenu();
			}
			function onWinResize() {
				hideMenu();
			}
			function onKey(e) {
				if (e.key === "Escape") hideMenu();
			}

			wrap.addEventListener("contextmenu", onPetContext);
			document.addEventListener("contextmenu", onDocContext);
			document.addEventListener("pointerdown", onDocPointer);
			document.addEventListener("wheel", onDocWheel, { passive: true });
			window.addEventListener("blur", onWinBlur);
			window.addEventListener("resize", onWinResize);
			document.addEventListener("keydown", onKey);

			return {
				dispose() {
					wrap.removeEventListener("contextmenu", onPetContext);
					document.removeEventListener("contextmenu", onDocContext);
					document.removeEventListener("pointerdown", onDocPointer);
					document.removeEventListener("wheel", onDocWheel);
					window.removeEventListener("blur", onWinBlur);
					window.removeEventListener("resize", onWinResize);
					document.removeEventListener("keydown", onKey);
					if (menu.parentNode) menu.parentNode.removeChild(menu);
					if (recall.parentNode) recall.parentNode.removeChild(recall);
				}
			};
		}

		function createRenderer(dom, getAssets) {
			let mode = null;
			let idleTimer = null;
			let idleIndex = 0;
			let reactionTimer = null;
			let seqTimer = null;

			function assets() {
				const a = getAssets();
				return a || {};
			}

			function idleSources() {
				const a = assets();
				const list = [a.idleA, a.idleB].filter(Boolean);
				if (Array.isArray(IDLE_EXTRA_REACTIONS)) {
					for (const name of IDLE_EXTRA_REACTIONS) {
						list.push("/api/pet/reactions/" + encodeURIComponent(name));
					}
				}
				return list;
			}

			function applyIdle() {
				clearInterval(idleTimer);
				const srcs = idleSources();
				idleIndex = 0;
				dom.img.src = srcs.length ? srcs[0] : "";
				idleTimer = setInterval(() => {
					if (srcs.length === 0) return;
					idleIndex = (idleIndex + 1) % srcs.length;
					dom.img.src = srcs[idleIndex];
				}, IDLE_FLIP_MS);
			}

			function applyMode() {
				if (seqTimer) {
					clearInterval(seqTimer);
					seqTimer = null;
				}
				if (mode === "idle") {
					applyIdle();
					return;
				}
				clearInterval(idleTimer);
				idleTimer = null;
				dom.img.src = assets()[mode]; // thinking | output | done
			}

			function set(mode_) {
				if (mode_ === mode) return;
				mode = mode_;
				applyMode();
			}

			function refreshSkin() {
				applyMode();
			}

			function playReaction(src, durationMs) {
				clearInterval(idleTimer);
				idleTimer = null;
				if (reactionTimer) clearTimeout(reactionTimer);
				if (seqTimer) {
					clearInterval(seqTimer);
					seqTimer = null;
				}
				dom.img.src = src;
				reactionTimer = setTimeout(() => {
					reactionTimer = null;
					applyMode();
				}, durationMs);
			}

			// Loop through a list of GIF sources until the pet's state changes
			// (set) or another action interrupts it.
			function playSequence(urls, intervalMs) {
				clearInterval(idleTimer);
				idleTimer = null;
				if (reactionTimer) clearTimeout(reactionTimer);
				if (seqTimer) clearInterval(seqTimer);
				if (!Array.isArray(urls) || urls.length === 0) return;
				let i = 0;
				dom.img.src = urls[0];
				seqTimer = setInterval(() => {
					i = (i + 1) % urls.length;
					dom.img.src = urls[i];
				}, intervalMs);
			}

			function dispose() {
				clearInterval(idleTimer);
				if (reactionTimer) clearTimeout(reactionTimer);
				if (seqTimer) clearInterval(seqTimer);
			}

			return { set, refreshSkin, playReaction, playSequence, dispose };
		}

		function apply(ctx) {
			if (typeof document === "undefined") return;
			if (document.getElementById("dsh-pet")) return;

			const skin = createSkinState();
			const reaction = { play: null, playByName: null, playSequence: null };
			const dom = mountDom(skin, reaction);
			const state = createPetState();
			const renderer = createRenderer(dom, skin.assets);
			skin.onChange(() => renderer.refreshSkin());
			reaction.play = () => playRandomReaction(renderer);
			reaction.playByName = (name) => playReactionByName(renderer, name);
			reaction.playSequence = () => playAllReactions(renderer);
			renderer.set("idle");

			const getSessions = () => {
				try {
					return ctx.get("sessions") || null;
				} catch (_) {
					return null;
				}
			};

			const refresh = () => {
				const next = state.compute(getSessions());
				renderer.set(next);
			};

			refresh();
			const interval = setInterval(refresh, POLL_MS);

			// Best-effort snappier updates via the list/manager stores.
			try {
				const srv = getSessions();
				if (srv) {
					if (srv.list && typeof srv.list.subscribe === "function") srv.list.subscribe(refresh);
					if (srv.manager && typeof srv.manager.subscribe === "function") srv.manager.subscribe(refresh);
				}
			} catch (_) {}

			// Fiber-lifetime cleanup when the plugin unloads.
			try {
				ctx.effect(() => () => {
					clearInterval(interval);
					renderer.dispose();
					if (dom.wrap && dom.wrap.parentNode) dom.wrap.parentNode.removeChild(dom.wrap);
					if (typeof dom.dispose === "function") dom.dispose();
				}, "dsh-pet: lifecycle");
			} catch (_) {}
		}

		exports.apply = apply;
		exports.inject = [];
		return module.exports;
	}
});
