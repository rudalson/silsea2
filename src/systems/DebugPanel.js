import {
  DEBUG_TUNING_CONTROLS,
  DEBUG_TUNING_PRESETS,
  applyDebugTuningPreset,
  getDebugTuningPreset,
  getDebugTuningPresetChanges
} from "../data/debugTuningPresets.js";

const OBJECTIVE_LABELS = Object.freeze({
  defeat_boss: "임시 보스 격파",
  reach_gate: "무지개 게이트 도달",
  collect_stars: "별 수집",
  find_secrets: "비밀 공간 발견",
  clear_time: "제한 시간",
  no_damage: "무피해"
});

const stopGameKeyboard = (event) => event.stopPropagation();

export class DebugPanel {
  constructor(scene, options) {
    this.scene = scene;
    this.tuning = options.tuning;
    this.defaults = { ...options.tuning };
    this.level = options.level;
    this.objectives = options.objectives;
    this.getEnvironmentSnapshot = options.getEnvironmentSnapshot;
    this.getBreathSnapshot = options.getBreathSnapshot;
    this.onWarp = options.onWarp;
    this.onReload = options.onReload;
    this.hotReloadAvailable = Boolean(options.hotReloadAvailable);
    this.visible = true;
    this.nextMetricsAt = 0;
    this.inputs = new Map();
    this.selectedPresetId = DEBUG_TUNING_PRESETS[0].id;
    this.root = this.build();
    document.body.appendChild(this.root);
    this.renderPresetPreview();
    this.setReloadState({
      state: this.hotReloadAvailable ? "idle" : "unavailable",
      message: this.hotReloadAvailable
        ? "레벨 파일을 저장한 뒤 다시 읽을 수 있습니다."
        : "개발 서버에서만 사용할 수 있습니다."
    });
  }

  build() {
    const root = document.createElement("aside");
    root.className = "debug-panel";
    root.setAttribute("aria-label", "Graybox 실시간 튜닝 패널");
    root.innerHTML = `
      <h2>Graybox Lab</h2>
      <p>값은 플레이 중 즉시 반영됩니다. <kbd>\`</kbd> 키로 패널을 숨길 수 있어요.</p>
      <div data-controls></div>
      <section class="debug-preset" aria-labelledby="debug-preset-title">
        <h3 id="debug-preset-title">튜닝 preset</h3>
        <label class="debug-preset-select">검수 기준
          <select data-preset aria-label="튜닝 preset"></select>
        </label>
        <p data-preset-description></p>
        <ul class="debug-preset-changes" data-preset-changes aria-label="적용 전 변경값"></ul>
        <button type="button" data-preset-apply>선택값 적용</button>
        <p class="debug-preset-status" data-preset-status role="status"></p>
      </section>
      <h3>구간 워프</h3>
      <select data-warp aria-label="구간 워프"></select>
      <div class="debug-actions">
        <button type="button" data-export>JSON 내보내기</button>
        <button type="button" data-reset>기본값</button>
        <button type="button" data-reload>레벨 데이터 다시 읽기</button>
      </div>
      <p class="debug-reload-status" data-reload-status role="status"></p>
      <h3>실시간 상태</h3>
      <p data-metrics>FPS —</p>
      <ul class="debug-objectives" data-objectives></ul>
    `;

    const controls = root.querySelector("[data-controls]");
    for (const control of DEBUG_TUNING_CONTROLS) {
      const wrapper = document.createElement("label");
      wrapper.className = "debug-control";
      wrapper.innerHTML = `<span>${control.label}</span><output>${this.tuning[control.key]}</output>`;
      const input = document.createElement("input");
      input.type = "range";
      input.min = String(control.min);
      input.max = String(control.max);
      input.step = String(control.step);
      input.value = String(this.tuning[control.key]);
      input.addEventListener("input", () => {
        this.tuning[control.key] = Number(input.value);
        wrapper.querySelector("output").value = input.value;
        this.renderPresetPreview();
      });
      wrapper.appendChild(input);
      controls.appendChild(wrapper);
      this.inputs.set(control.key, { input, output: wrapper.querySelector("output") });
    }

    const presetSelect = root.querySelector("[data-preset]");
    for (const preset of DEBUG_TUNING_PRESETS) {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.name;
      presetSelect.appendChild(option);
    }
    presetSelect.value = this.selectedPresetId;
    presetSelect.addEventListener("change", () => {
      this.selectedPresetId = presetSelect.value;
      this.renderPresetPreview();
    });
    presetSelect.addEventListener("keydown", (event) => {
      const moves = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      if (!(event.key in moves) && event.key !== "Home" && event.key !== "End") return;
      event.preventDefault();
      const lastIndex = DEBUG_TUNING_PRESETS.length - 1;
      const nextIndex = event.key === "Home"
        ? 0
        : event.key === "End"
          ? lastIndex
          : Math.max(0, Math.min(lastIndex, presetSelect.selectedIndex + moves[event.key]));
      presetSelect.selectedIndex = nextIndex;
      this.selectedPresetId = presetSelect.value;
      this.renderPresetPreview();
    });
    const presetApply = root.querySelector("[data-preset-apply]");
    presetApply.addEventListener("click", () => this.applyPreset());
    presetApply.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      this.applyPreset();
    });

    const warp = root.querySelector("[data-warp]");
    this.populateWarp(warp);
    warp.addEventListener("change", () => this.onWarp?.(warp.value));
    root.querySelector("[data-export]").addEventListener("click", () => this.exportJson());
    root.querySelector("[data-reset]").addEventListener("click", () => this.reset());
    root.querySelector("[data-reload]").addEventListener("click", () => this.handleReload());
    for (const control of root.querySelectorAll("input, select, button")) {
      control.addEventListener("keydown", stopGameKeyboard);
      control.addEventListener("keyup", stopGameKeyboard);
    }
    return root;
  }

  populateWarp(warp = this.root?.querySelector("[data-warp]")) {
    if (!warp) return;
    const selected = warp.value;
    warp.replaceChildren();
    for (const section of this.level.sections) {
      const option = document.createElement("option");
      option.value = section.id;
      option.textContent = `${section.id} · ${section.type}`;
      warp.appendChild(option);
    }
    if ([...warp.options].some(({ value }) => value === selected)) warp.value = selected;
  }

  async handleReload() {
    if (!this.hotReloadAvailable) return false;
    this.setReloadState({ state: "loading", message: "레벨 데이터를 다시 읽는 중…" });
    const result = await this.onReload?.();
    if (result === false && this.root.dataset.reloadState === "loading") {
      this.setReloadState({ state: "error", message: "적용하지 않았습니다." });
    }
    return result;
  }

  setReloadState({ state = "idle", message = "" } = {}) {
    if (!this.root) return;
    this.root.dataset.reloadState = state;
    const status = this.root.querySelector("[data-reload-status]");
    if (status) status.textContent = message;
    const button = this.root.querySelector("[data-reload]");
    if (button) button.disabled = state === "loading" || state === "unavailable";
  }

  replaceRuntime({ level, objectives }) {
    this.level = level;
    this.objectives = objectives;
    this.populateWarp();
    this.nextMetricsAt = 0;
    this.renderPresetPreview();
  }

  renderPresetPreview(message = "") {
    if (!this.root) return [];
    const preset = getDebugTuningPreset(this.selectedPresetId);
    const changes = getDebugTuningPresetChanges(this.tuning, this.selectedPresetId);
    this.root.querySelector("[data-preset-description]").textContent = preset.description;
    const list = this.root.querySelector("[data-preset-changes]");
    list.replaceChildren();
    if (changes.length === 0) {
      const item = document.createElement("li");
      item.textContent = "현재 값과 같습니다.";
      list.appendChild(item);
    } else {
      for (const change of changes) {
        const item = document.createElement("li");
        item.textContent = `${change.label}: ${change.from} → ${change.to}`;
        list.appendChild(item);
      }
    }
    this.root.dataset.presetState = changes.length ? "changed" : "same";
    this.root.querySelector("[data-preset-apply]").disabled = changes.length === 0;
    this.root.querySelector("[data-preset-status]").textContent = message
      || (changes.length ? `${preset.name} 적용 시 ${changes.length}개 값 변경` : `${preset.name} 적용 상태`);
    return changes;
  }

  applyPreset() {
    const changes = getDebugTuningPresetChanges(this.tuning, this.selectedPresetId);
    if (changes.length === 0) return false;
    const preset = getDebugTuningPreset(this.selectedPresetId);
    applyDebugTuningPreset(this.tuning, this.selectedPresetId);
    this.syncInputs();
    this.renderPresetPreview(`${preset.name} 적용 완료 · ${changes.length}개 값`);
    return true;
  }

  update(player, fps, elapsed) {
    if (elapsed < this.nextMetricsAt) return;
    this.nextMetricsAt = elapsed + 0.25;
    const metrics = this.root.querySelector("[data-metrics]");
    const performance = this.scene.getPerformanceSnapshot?.();
    const pool = performance?.poolTotals;
    const particles = performance?.particles?.totals;
    const runtimeCounts = pool && particles
      ? ` · Pool ${pool.activeCount}/${pool.size}/${pool.maxSize} · FX ${particles.activeCount}/${particles.size}/${particles.maxSize}`
      : "";
    const environment = this.getEnvironmentSnapshot?.();
    const breath = this.getBreathSnapshot?.();
    const environmentStatus = environment
      ? ` · 진행 ${environment.direction === "left" ? "←" : "→"} · 파도 ${environment.waveState}${environment.secondsUntilWave === null ? "" : ` ${environment.secondsUntilWave.toFixed(1)}초`}${environment.mistZone ? ` · 안개 ${environment.mistZone} ${Math.round(environment.mistDensity * 100)}% / ${Math.round(environment.visibilityRadius)}px` : ""}`
      : "";
    const breathStatus = breath
      ? ` · 숨 ${Math.round(breath.ratio * 100)}% · 물 ${breath.zoneId ?? "없음"}`
      : "";
    metrics.textContent = `FPS ${Math.round(fps)} · x ${Math.round(player.x)} · y ${Math.round(player.y)} · ${elapsed.toFixed(1)}초${environmentStatus}${breathStatus}${runtimeCounts}`;
    const list = this.root.querySelector("[data-objectives]");
    list.replaceChildren();
    for (const objective of this.objectives.getSnapshot()) {
      const item = document.createElement("li");
      item.textContent = `${objective.complete ? "✓" : "○"} ${OBJECTIVE_LABELS[objective.type] ?? objective.type}`;
      list.appendChild(item);
    }
  }

  toggle() {
    this.visible = !this.visible;
    this.root.hidden = !this.visible;
  }

  reset() {
    Object.assign(this.tuning, this.defaults);
    this.syncInputs();
    this.renderPresetPreview("캐릭터 기본값 복원 완료");
  }

  syncInputs() {
    for (const [key, field] of this.inputs) {
      field.input.value = String(this.tuning[key]);
      field.output.value = String(this.tuning[key]);
    }
  }

  async exportJson() {
    const value = JSON.stringify({ tuning: this.tuning }, null, 2);
    try {
      await navigator.clipboard.writeText(value);
      this.root.querySelector("[data-export]").textContent = "복사 완료";
    } catch {
      const blob = new Blob([value], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "character-tuning.json";
      link.click();
      URL.revokeObjectURL(link.href);
    }
  }

  destroy() {
    this.root.remove();
  }
}
