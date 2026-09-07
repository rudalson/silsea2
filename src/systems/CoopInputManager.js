import Phaser from "phaser";

const createPreviousState = () => ({ jump: false, special: false, confirm: false, pause: false });

const withEdges = (current, previous) => ({
  ...current,
  jumpPressed: current.jumpDown && !previous.jump,
  jumpReleased: !current.jumpDown && previous.jump,
  specialPressed: current.specialDown && !previous.special,
  confirmPressed: current.confirmDown && !previous.confirm,
  pausePressed: current.pauseDown && !previous.pause
});

const remember = (input) => ({
  jump: input.jumpDown,
  special: input.specialDown,
  confirm: input.confirmDown,
  pause: input.pauseDown
});

export class CoopInputManager {
  constructor(scene) {
    this.scene = scene;
    this.previous = { p1: createPreviousState(), p2: createPreviousState() };
    this.keys = scene.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      jumpSpace: Phaser.Input.Keyboard.KeyCodes.SPACE,
      jumpZ: Phaser.Input.Keyboard.KeyCodes.Z,
      specialShift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      specialX: Phaser.Input.Keyboard.KeyCodes.X,
      pause: Phaser.Input.Keyboard.KeyCodes.ESC
    });
    this.captured = [
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.SPACE
    ];
    scene.input.keyboard.addCapture(this.captured);
  }

  sample() {
    const p1Current = {
      connected: true,
      moveX: Number(this.keys.right.isDown || this.keys.d.isDown)
        - Number(this.keys.left.isDown || this.keys.a.isDown),
      moveY: Number(this.keys.down.isDown || this.keys.s.isDown)
        - Number(this.keys.up.isDown || this.keys.w.isDown),
      jumpDown: this.keys.jumpSpace.isDown || this.keys.jumpZ.isDown,
      specialDown: this.keys.specialShift.isDown || this.keys.specialX.isDown,
      confirmDown: this.keys.jumpSpace.isDown || this.keys.jumpZ.isDown,
      pauseDown: this.keys.pause.isDown
    };
    const pad = this.scene.input.gamepad?.getPad(0) ?? null;
    const connected = Boolean(pad?.connected ?? pad);
    const analogX = connected && Math.abs(pad.axes[0]?.getValue() ?? 0) > 0.2
      ? pad.axes[0].getValue()
      : 0;
    const analogY = connected && Math.abs(pad.axes[1]?.getValue() ?? 0) > 0.2
      ? pad.axes[1].getValue()
      : 0;
    const p2Current = {
      connected,
      moveX: Phaser.Math.Clamp(
        analogX || Number(Boolean(pad?.buttons[15]?.pressed)) - Number(Boolean(pad?.buttons[14]?.pressed)),
        -1,
        1
      ),
      moveY: Phaser.Math.Clamp(
        analogY || Number(Boolean(pad?.buttons[13]?.pressed)) - Number(Boolean(pad?.buttons[12]?.pressed)),
        -1,
        1
      ),
      jumpDown: Boolean(pad?.buttons[0]?.pressed),
      specialDown: Boolean(pad?.buttons[2]?.pressed),
      confirmDown: Boolean(pad?.buttons[0]?.pressed),
      pauseDown: Boolean(pad?.buttons[9]?.pressed)
    };

    const p1 = withEdges(p1Current, this.previous.p1);
    const p2 = withEdges(p2Current, this.previous.p2);
    this.previous = { p1: remember(p1), p2: remember(p2) };
    return { p1, p2 };
  }

  destroy() {
    this.scene.input.keyboard.removeCapture(this.captured);
  }
}
