import Phaser from "phaser";

export class InputManager {
  constructor(scene) {
    this.scene = scene;
    this.previous = {
      jump: false,
      special: false,
      confirm: false,
      pause: false,
      shakeToggle: false,
      muteToggle: false,
      exportReport: false,
      debug: false,
      menuUp: false,
      menuDown: false,
      menuLeft: false,
      menuRight: false
    };

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
      confirm: Phaser.Input.Keyboard.KeyCodes.ENTER,
      pause: Phaser.Input.Keyboard.KeyCodes.ESC,
      shakeToggle: Phaser.Input.Keyboard.KeyCodes.V,
      muteToggle: Phaser.Input.Keyboard.KeyCodes.M,
      exportReport: Phaser.Input.Keyboard.KeyCodes.E,
      debug: Phaser.Input.Keyboard.KeyCodes.BACKTICK
    });

    scene.input.keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.SPACE
    ]);
  }

  sample() {
    const pad = this.scene.input.gamepad?.getPad(0) ?? null;
    const keyboardAxis = Number(this.keys.right.isDown || this.keys.d.isDown) - Number(this.keys.left.isDown || this.keys.a.isDown);
    const analog = pad && Math.abs(pad.axes[0]?.getValue() ?? 0) > 0.2 ? pad.axes[0].getValue() : 0;
    const dpad = pad ? Number(pad.buttons[15]?.pressed) - Number(pad.buttons[14]?.pressed) : 0;
    const moveX = Phaser.Math.Clamp(keyboardAxis || analog || dpad, -1, 1);

    const jump = this.keys.jumpSpace.isDown || this.keys.jumpZ.isDown || Boolean(pad?.buttons[0]?.pressed);
    const special = this.keys.specialShift.isDown || this.keys.specialX.isDown || Boolean(pad?.buttons[2]?.pressed);
    const confirm = jump || this.keys.confirm.isDown;
    const pause = this.keys.pause.isDown || Boolean(pad?.buttons[9]?.pressed);
    const shakeToggle = this.keys.shakeToggle.isDown;
    const muteToggle = this.keys.muteToggle.isDown;
    const exportReport = this.keys.exportReport.isDown;
    const debug = this.keys.debug.isDown;
    const verticalAxis = pad?.axes[1]?.getValue() ?? 0;
    const menuUp = this.keys.up.isDown || this.keys.w.isDown || Boolean(pad?.buttons[12]?.pressed) || verticalAxis < -0.5;
    const menuDown = this.keys.down.isDown || this.keys.s.isDown || Boolean(pad?.buttons[13]?.pressed) || verticalAxis > 0.5;
    const menuLeft = this.keys.left.isDown || this.keys.a.isDown || Boolean(pad?.buttons[14]?.pressed) || analog < -0.5;
    const menuRight = this.keys.right.isDown || this.keys.d.isDown || Boolean(pad?.buttons[15]?.pressed) || analog > 0.5;

    const result = {
      moveX,
      moveY: Number(this.keys.down.isDown || this.keys.s.isDown) - Number(this.keys.up.isDown || this.keys.w.isDown),
      jumpDown: jump,
      jumpPressed: jump && !this.previous.jump,
      jumpReleased: !jump && this.previous.jump,
      specialDown: special,
      specialPressed: special && !this.previous.special,
      confirmPressed: confirm && !this.previous.confirm,
      pausePressed: pause && !this.previous.pause,
      shakeTogglePressed: shakeToggle && !this.previous.shakeToggle,
      muteTogglePressed: muteToggle && !this.previous.muteToggle,
      exportPressed: exportReport && !this.previous.exportReport,
      menuUpPressed: menuUp && !this.previous.menuUp,
      menuDownPressed: menuDown && !this.previous.menuDown,
      menuLeftPressed: menuLeft && !this.previous.menuLeft,
      menuRightPressed: menuRight && !this.previous.menuRight,
      debugPressed: debug && !this.previous.debug
    };

    this.previous = {
      jump,
      special,
      confirm,
      pause,
      shakeToggle,
      muteToggle,
      exportReport,
      debug,
      menuUp,
      menuDown,
      menuLeft,
      menuRight
    };
    return result;
  }

  destroy() {
    this.scene.input.keyboard.removeCapture([
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.SPACE
    ]);
  }
}
