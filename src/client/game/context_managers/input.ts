import {
  defaultMouseSensitivity,
  defaultTouchscreenSensitivity,
  defaultVirtualJoystickSensitivity,
} from "@/client/components/modals/GameSettingsScreen";
import type { ClientContext } from "@/client/game/context";
import {
  addTypedStorageChangeListener,
  getTypedStorageItem,
  removeTypedStorageChangeListener,
} from "@/client/util/typed_local_storage";
import type { RegistryLoader } from "@/shared/registry";
import EventEmitter from "events";

// TODO: Consider supporting left/right modifiers separately.
export enum Modifiers {
  None = 0,
  Ctrl = 1,
  Alt = 2,
  Shift = 4,
}

function encode(ctrl: boolean, alt: boolean, shift: boolean) {
  let ret = Modifiers.None;
  ret |= ctrl ? Modifiers.Ctrl : Modifiers.None;
  ret |= alt ? Modifiers.Alt : Modifiers.None;
  ret |= shift ? Modifiers.Shift : Modifiers.None;
  return ret;
}

type Action = string;
type Motion = string;
type Trigger = string;

interface ActionBinding {
  name: Action;
  mods: number;
}

interface MotionBinding {
  name: Motion;
  mods: number;
  scale: number;
  phase: MotionPhase;
}

export type MotionPhase = "script" | "render";

// TODO: Add binding API to bind multiple inputs to the same action / motion.
export class Bindings<ActionsAndMotions extends string> {
  actions = new Map<Trigger, ActionBinding[]>();
  motions = new Map<Trigger, MotionBinding[]>();

  bindKey(code: string, mods: Modifiers = Modifiers.None) {
    const trigger = `/keyboard/${code}`;
    return {
      toAction: (name: ActionsAndMotions) => {
        const b = { name: name, mods: mods };
        this.actions.get(trigger)?.push(b) || this.actions.set(trigger, [b]);
      },
      toMotion: (
        name: ActionsAndMotions,
        scale?: number,
        phase?: MotionPhase
      ) => {
        const b = {
          name: name,
          mods: mods,
          scale: scale ?? 1,
          phase: phase ?? "script",
        };
        this.motions.get(trigger)?.push(b) || this.motions.set(trigger, [b]);
      },
    };
  }

  bindMouseClick(button: number, mods: Modifiers = Modifiers.None) {
    const trigger = `/mouse/click/${button}`;
    return {
      toAction: (name: ActionsAndMotions) => {
        const b = { name: name, mods: mods };
        this.actions.get(trigger)?.push(b) || this.actions.set(trigger, [b]);
      },
      toMotion: (
        name: ActionsAndMotions,
        scale?: number,
        phase?: MotionPhase
      ) => {
        const b = {
          name: name,
          mods: mods,
          scale: scale ?? 1,
          phase: phase ?? "script",
        };
        this.motions.get(trigger)?.push(b) || this.motions.set(trigger, [b]);
      },
    };
  }

  bindMouseMove(axis: "x" | "y", mods: Modifiers = Modifiers.None) {
    const trigger = `/mouse/move/${axis}`;
    return {
      toMotion: (
        name: ActionsAndMotions,
        scale?: number,
        phase?: MotionPhase
      ) => {
        const b = {
          name: name,
          mods: mods,
          scale: scale ?? 1,
          phase: phase ?? "script",
        };
        this.motions.get(trigger)?.push(b) || this.motions.set(trigger, [b]);
      },
    };
  }

  bindVirtualJoyconMove(
    joyconName: string,
    axis: "x" | "y",
    mods: Modifiers = Modifiers.None
  ) {
    const trigger = `/joycon/virtual/${joyconName}/move/${axis}`;
    return {
      toMotion: (
        name: ActionsAndMotions,
        scale?: number,
        phase?: MotionPhase
      ) => {
        const b = {
          name: name,
          mods: mods,
          scale: scale ?? 1,
          phase: phase ?? "script",
        };
        this.motions.get(trigger)?.push(b) || this.motions.set(trigger, [b]);
      },
    };
  }

  bindTouchscreenMove(
    name: string,
    axis: "x" | "y",
    mods: Modifiers = Modifiers.None
  ) {
    const trigger = `/touchscreen/${name}/move/${axis}`;
    return {
      toMotion: (
        name: ActionsAndMotions,
        scale?: number,
        phase?: MotionPhase
      ) => {
        const b = {
          name: name,
          mods: mods,
          scale: scale ?? 1,
          phase: phase ?? "script",
        };
        this.motions.get(trigger)?.push(b) || this.motions.set(trigger, [b]);
      },
    };
  }
}

export class Input<ActionsAndMotions extends string> {
  private bindings: Bindings<ActionsAndMotions>;
  private actions: Map<string, boolean>;
  private motions: Map<
    string,
    { fixed: number; delta: number; phase: MotionPhase }
  >;
  private active_triggers: Set<string>;
  private active_mods: number;
  private detach_fns: (() => void)[];
  attachedToElement?: HTMLElement;
  emitter: EventEmitter;

  constructor(bindings: Bindings<ActionsAndMotions>) {
    this.bindings = bindings;
    this.actions = new Map();
    this.motions = new Map();
    this.active_triggers = new Set();
    this.active_mods = Modifiers.None;
    this.detach_fns = [];
    this.emitter = new EventEmitter();
    this.updateInputMaps();
  }

  protected hotHandoff(old: Input<ActionsAndMotions>) {
    this.emitter = old.emitter;
    old.detach();
    if (old.attachedToElement) {
      this.attach(old.attachedToElement);
    }
  }

  private updateInputMaps() {
    // Initialize actions map.
    this.actions.clear();
    for (const binding of this.bindings.actions.values()) {
      binding.forEach((action) => this.actions.set(action.name, false));
    }

    // Initialize motions map.
    this.motions.clear();
    for (const binding of this.bindings.motions.values()) {
      binding.forEach((motion) =>
        this.motions.set(motion.name, {
          fixed: 0,
          delta: 0,
          phase: motion.phase,
        })
      );
    }
  }

  private setAction(trigger: string, mods: number, active: boolean) {
    for (const binding of this.bindings.actions.get(trigger) || []) {
      if (binding.mods == (binding.mods & mods)) {
        this.actions.set(binding.name, active);
        if (active) {
          this.emitter.emit(binding.name);
        }
      }
    }
  }

  private setMotion(trigger: string, mods: number, active: boolean) {
    this.active_mods = mods;
    if (active) {
      this.active_triggers.add(trigger);
    } else {
      this.active_triggers.delete(trigger);
    }
    for (const motion of this.motions.values()) {
      motion.fixed = 0;
    }
    for (const trigger of this.active_triggers) {
      for (const binding of this.bindings.motions.get(trigger) || []) {
        if (binding.mods == (binding.mods & this.active_mods)) {
          this.motions.get(binding.name)!.fixed = binding.scale;
        }
      }
    }
  }

  private addMotion(trigger: string, mods: number, delta: number) {
    for (const binding of this.bindings.motions.get(trigger) || []) {
      if (binding.mods == (binding.mods & mods)) {
        this.motions.get(binding.name)!.delta += binding.scale * delta;
      }
    }
  }

  bind(bindings: Bindings<ActionsAndMotions>) {
    this.bindings = bindings;
    this.updateInputMaps();
  }

  action(name: ActionsAndMotions) {
    return this.actions.get(name)!;
  }

  motion(name: ActionsAndMotions) {
    const motion = this.motions.get(name)!;
    return motion.fixed + motion.delta;
  }

  attach(element: HTMLElement) {
    this.attachedToElement = element;
    const listen = (name: string, fn: any) => {
      element.addEventListener(name, fn);
      this.detach_fns.push(() => {
        element.removeEventListener(name, fn);
      });
    };

    // Prevent default context menu behavior.
    listen("contextmenu", (e: MouseEvent) => {
      e.preventDefault();
    });

    // Handle keyboard events.
    const downKeys = new Set<string>();
    listen("keydown", (e: KeyboardEvent) => {
      if (!downKeys.has(e.code)) {
        downKeys.add(e.code);
        const trigger = `/keyboard/${e.code}`;
        const mods = encode(e.ctrlKey, e.altKey, e.shiftKey);
        this.setAction(trigger, mods, true);
        this.setMotion(trigger, mods, true);
      }
    });
    listen("keyup", (e: KeyboardEvent) => {
      downKeys.delete(e.code);
      const trigger = `/keyboard/${e.code}`;
      const mods = encode(e.ctrlKey, e.altKey, e.shiftKey);
      this.setAction(trigger, mods, false);
      this.setMotion(trigger, mods, false);
    });

    // Handle mouse events.
    listen("mousedown", (e: MouseEvent) => {
      // Let you click away from input without taking an action
      if (document.activeElement instanceof HTMLInputElement) {
        return;
      }
      const trigger = `/mouse/click/${e.button}`;
      const mods = encode(e.ctrlKey, e.altKey, e.shiftKey);
      this.setAction(trigger, mods, true);
      this.setMotion(trigger, mods, true);
    });
    listen("mouseup", (e: MouseEvent) => {
      const trigger = `/mouse/click/${e.button}`;
      const mods = encode(e.ctrlKey, e.altKey, e.shiftKey);
      this.setAction(trigger, mods, false);
      this.setMotion(trigger, mods, false);
    });
    listen("mousemove", (e: MouseEvent) => {
      const mods = encode(e.ctrlKey, e.altKey, e.shiftKey);
      this.addMotion("/mouse/move/x", mods, e.movementX);
      this.addMotion("/mouse/move/y", mods, e.movementY);
    });
  }

  moveTouchScreen(name: string, x: number, y: number) {
    const motionBase = `/touchscreen/${name}/move`;
    this.addMotion(`${motionBase}/x`, 0, x);
    this.addMotion(`${motionBase}/y`, 0, y);
  }

  moveVirtualJoycon(name: string, x: number, y: number) {
    const motionBase = `/joycon/virtual/${name}/move`;
    this.addMotion(`${motionBase}/x`, 0, x);
    this.addMotion(`${motionBase}/y`, 0, y);
  }

  detach() {
    this.detach_fns.forEach((fn) => fn());
    this.active_mods = Modifiers.None;
    this.active_triggers.clear();
    for (const action of this.actions.keys()) {
      this.actions.set(action, false);
    }
    for (const motion of this.motions.values()) {
      motion.fixed = 0;
      motion.delta = 0;
    }
  }

  tick(phase: MotionPhase) {
    // Reset motion accumuation.
    for (const motion of this.motions.values()) {
      if (motion.phase === phase) {
        motion.delta = 0;
      }
    }
  }
}

export type BiomesActions =
  | "jump"
  | "jump_hold"
  | "primary"
  | "primary_hold"
  | "secondary"
  | "secondary_hold"
  | "forward"
  | "lateral"
  | "run"
  | "crouch"
  | "flip"
  | "mirror"
  | "first_person_toggle"
  | "reverse_camera"
  | "cam_lateral"
  | "cam_forward"
  | "cam_up_toggle"
  | "view_x"
  | "view_y";

export function defaultBindings({
  togglePrimaryClick,
  invertY,
  mouseSensitivity,
}: {
  togglePrimaryClick?: boolean;
  invertY?: boolean;
  mouseSensitivity?: number;
}): Bindings<BiomesActions> {
  const bindings = new Bindings<BiomesActions>();

  bindings.bindKey("Space").toAction("jump");
  bindings.bindKey("Space").toMotion("jump_hold");
  let [primaryMouse, secondaryMouse] = [0, 2];
  if (togglePrimaryClick ?? false) {
    [primaryMouse, secondaryMouse] = [2, 0];
  }
  bindings.bindMouseClick(primaryMouse).toAction("primary");
  bindings.bindMouseClick(primaryMouse).toMotion("primary_hold");
  bindings.bindMouseClick(secondaryMouse).toAction("secondary");
  bindings.bindMouseClick(secondaryMouse).toMotion("secondary_hold");

  bindings.bindKey("KeyW").toMotion("forward", 1);
  bindings.bindKey("KeyS").toMotion("forward", -1);
  bindings.bindKey("KeyA").toMotion("lateral", -1);
  bindings.bindKey("KeyD").toMotion("lateral", 1);

  bindings.bindKey("ShiftLeft").toMotion("run");
  bindings.bindKey("ShiftRight").toMotion("run");

  bindings.bindKey("KeyZ").toMotion("crouch");

  bindings.bindKey("KeyF").toAction("flip");
  bindings.bindKey("KeyG").toAction("mirror");

  bindings.bindKey("KeyT").toAction("first_person_toggle");
  bindings.bindMouseClick(1).toMotion("reverse_camera", 1, "render");
  bindings.bindKey("ArrowRight").toMotion("cam_lateral", 1, "render");
  bindings.bindKey("ArrowLeft").toMotion("cam_lateral", -1, "render");
  bindings.bindKey("ArrowUp").toMotion("cam_forward", 1, "render");
  bindings.bindKey("ArrowDown").toMotion("cam_forward", -1, "render");
  bindings.bindKey("ShiftLeft").toMotion("cam_up_toggle", 1, "render");
  bindings.bindKey("ShiftRight").toMotion("cam_up_toggle", 1, "render");

  // `mouseSensitivity` thats from 0-100 linearly interpolate to a value from 0-2.
  const mouseSensitivityMultiplier =
    (mouseSensitivity || defaultMouseSensitivity) / 50;

  const virtualJoystickMultiplier =
    (mouseSensitivity || defaultVirtualJoystickSensitivity) / 10;

  const touchscreenMultiplier =
    (mouseSensitivity || defaultTouchscreenSensitivity) / 25;

  bindings
    .bindMouseMove("x")
    .toMotion("view_x", 1 * mouseSensitivityMultiplier, "render");
  bindings
    .bindMouseMove("y")
    .toMotion(
      "view_y",
      (invertY ? -1 : 1) * mouseSensitivityMultiplier,
      "render"
    );

  bindings
    .bindVirtualJoyconMove("right", "x")
    .toMotion("view_x", 1 * virtualJoystickMultiplier, "render");
  bindings
    .bindVirtualJoyconMove("right", "y")
    .toMotion(
      "view_y",
      (invertY ? 1 : -1) * virtualJoystickMultiplier,
      "render"
    );

  bindings
    .bindTouchscreenMove("canvas", "x")
    .toMotion("view_x", 1 * touchscreenMultiplier, "render");

  bindings
    .bindTouchscreenMove("canvas", "y")
    .toMotion("view_y", 1 * touchscreenMultiplier, "render");

  bindings
    .bindVirtualJoyconMove("left", "x")
    .toMotion("lateral", 1 * virtualJoystickMultiplier, "render");
  bindings
    .bindVirtualJoyconMove("left", "y")
    .toMotion("forward", 1 * virtualJoystickMultiplier, "render");

  return bindings;
}

export type ClientInput = Input<BiomesActions>;

export class BiomesBoundInput extends Input<BiomesActions> {
  private stopCleanups: Array<() => unknown> = [];

  constructor() {
    const bindingsForStorage = () => {
      return defaultBindings({
        togglePrimaryClick:
          getTypedStorageItem("settings.mouse.togglePrimaryClick") ?? undefined,
        invertY: getTypedStorageItem("settings.mouse.invertY") ?? undefined,
        mouseSensitivity:
          getTypedStorageItem("settings.mouse.sensitivity") ?? undefined,
      });
    };

    super(bindingsForStorage());
    // Rebind every time local storage values change
    const rebindListener = () => {
      this.bind(bindingsForStorage());
    };

    addTypedStorageChangeListener(
      "settings.mouse.togglePrimaryClick",
      rebindListener
    );
    addTypedStorageChangeListener("settings.mouse.invertY", rebindListener);
    addTypedStorageChangeListener("settings.mouse.sensitivity", rebindListener);

    this.stopCleanups.push(() => {
      removeTypedStorageChangeListener(
        "settings.mouse.togglePrimaryClick",
        rebindListener
      );
      removeTypedStorageChangeListener(
        "settings.mouse.invertY",
        rebindListener
      );
      removeTypedStorageChangeListener(
        "settings.mouse.sensitivity",
        rebindListener
      );
    });
  }

  hotHandoff(old: Input<BiomesActions>) {
    this.stop();
    if (old.attachedToElement) {
      const toAttach = old.attachedToElement;
      old.detach();
      this.attach(toAttach);
    }
  }

  stop() {
    for (const item of this.stopCleanups) {
      item();
    }

    this.stopCleanups = [];
  }
}

export async function loadInput(_loader: RegistryLoader<ClientContext>) {
  return new BiomesBoundInput();
}
