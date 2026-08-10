const CONTROLS = Object.freeze([
  { key: "gravity", label: "중력", min: 800, max: 3000, step: 25 },
  { key: "jumpVelocity", label: "점프 초기 속도", min: -1000, max: -300, step: 10 },
  { key: "jumpCutMultiplier", label: "Jump Cut", min: 0.2, max: 0.8, step: 0.01 },
  { key: "acceleration", label: "가속도", min: 500, max: 5000, step: 50 },
  { key: "deceleration", label: "감속도", min: 500, max: 6000, step: 50 },
  { key: "maxSpeed", label: "최대 이동 속도", min: 160, max: 640, step: 10 },
  { key: "coyoteTime", label: "Coyote Time", min: 0, max: 250, step: 5 },
  { key: "jumpBuffer", label: "Jump Buffer", min: 0, max: 250, step: 5 }
]);

const OBJECTIVE_LABELS = Object.freeze({
  defeat_boss: "임시 보스 격파",
  reach_gate: "무지개 게이트 도달",
  collect_stars: "별 수집",
  clear_time: "제한 시간",
  no_damage: "무피해"
});

export class DebugPanel {
  constructor(scene, options) {
    this.scene = scene;
    this.tuning = options.tuning;
    this.defaults = { ...options.tuning };
    this.level = options.level;
    this.objectives = options.objectives;
    this.onWarp = options.onWarp;
    this.onReload = options.onReload;
    this.visible = true;
    this.nextMetricsAt = 0;
    this.inputs = new Map();
    this.root = this.build();
    document.body.appendChild(this.root);
  }

  build() {
    const root = document.createElement("aside");
    root.className = "debug-panel";
    root.setAttribute("aria-label", "Graybox 실시간 튜닝 패널");
    root.innerHTML = `
      <h2>Graybox Lab</h2>
      <p>값은 플레이 중 즉시 반영됩니다. <kbd>\`</kbd> 키로 패널을 숨길 수 있어요.</p>
      <div data-controls></div>
      <h3>구간 워프</h3>
      <select data-warp aria-label="구간 워프"></select>
      <div class="debug-actions">
        <button type="button" data-export>JSON 내보내기</button>
        <button type="button" data-reset>기본값</button>
        <button type="button" data-reload>레벨 재구성</button>
      </div>
      <h3>실시간 상태</h3>
      <p data-metrics>FPS —</p>
      <ul class="debug-objectives" data-objectives></ul>
    `;

    const controls = root.querySelector("[data-controls]");
    for (const control of CONTROLS) {
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
      });
      wrapper.appendChild(input);
      controls.appendChild(wrapper);
      this.inputs.set(control.key, { input, output: wrapper.querySelector("output") });
    }

    const warp = root.querySelector("[data-warp]");
    for (const section of this.level.sections) {
      const option = document.createElement("option");
      option.value = section.id;
      option.textContent = `${section.id} · ${section.type}`;
      warp.appendChild(option);
    }
    warp.addEventListener("change", () => this.onWarp?.(warp.value));
    root.querySelector("[data-export]").addEventListener("click", () => this.exportJson());
    root.querySelector("[data-reset]").addEventListener("click", () => this.reset());
    root.querySelector("[data-reload]").addEventListener("click", () => this.onReload?.());
    return root;
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
    metrics.textContent = `FPS ${Math.round(fps)} · x ${Math.round(player.x)} · y ${Math.round(player.y)} · ${elapsed.toFixed(1)}초${runtimeCounts}`;
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
