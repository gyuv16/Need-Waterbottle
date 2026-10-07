// Procedural humanoid animation for any VRM model, driven on the normalized humanoid skeleton.
//
// No animation files are needed (so no licensing issues): walking, idle breathing, turning and the
// reaction gestures are generated from the bone hierarchy that every VRM shares.
//
// Animation layering
//   lower layer  – hips, legs, feet: locomotion (idle stance ↔ walk ↔ run), never interrupted
//   upper layer  – spine, arms: walk arm-swing, blended with a reaction gesture by its weight
//   head layer   – neck + head look-at (cursor tracking) on top of everything
// So reactWave() can play while the legs keep walking.
import * as THREE from 'three';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';

export type Reaction = 'wave' | 'surprise' | 'think';

type Pose = Partial<Record<VRMHumanBoneName, [number, number, number]>>;

const REACTION_LENGTH: Record<Reaction, number> = { wave: 2.4, surprise: 1.2, think: 2.8 };

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export class Rig {
  /** 0 = standing, 1 = walking, 2 = running. Smoothed internally. */
  speed = 0;
  private speedNow = 0;
  private phase = 0;
  private time = 0;
  private reaction: { name: Reaction; t: number } | null = null;
  private head = { yaw: 0, pitch: 0 };
  private lookTarget = new THREE.Vector3(0, 1.4, 2);
  /** Offset applied to the whole body (used by the surprise jump-back). */
  readonly rootOffset = new THREE.Vector3();
  private baseHipsY: number | null = null;
  private touched = new Set<VRMHumanBoneName>();

  constructor(private vrm: VRM) {}

  playReaction(name: Reaction): void {
    this.reaction = { name, t: 0 };
  }

  get reacting(): Reaction | null {
    return this.reaction?.name ?? null;
  }

  /** World-space point to look at (cursor tracking). */
  lookAt(target: THREE.Vector3): void {
    this.lookTarget.copy(target);
  }

  update(dt: number): void {
    this.time += dt;
    this.speedNow += (this.speed - this.speedNow) * Math.min(1, dt * 6);
    const s = this.speedNow;
    const walk = clamp(s, 0, 1);
    const run = clamp(s - 1, 0, 1);
    // Steps per second grows with speed; phase drives the gait cycle.
    this.phase += dt * Math.PI * 2 * (0.9 + 0.9 * walk + 0.8 * run) * (s > 0.02 ? 1 : 0);

    const pose: Pose = {};
    const add = (bone: VRMHumanBoneName, x: number, y: number, z: number) => {
      const p = pose[bone] ?? [0, 0, 0];
      pose[bone] = [p[0] + x, p[1] + y, p[2] + z];
    };

    // ---- Lower layer: locomotion -------------------------------------------------------------
    const sw = Math.sin(this.phase);
    const legAmp = 0.45 * walk + 0.35 * run;
    add('leftUpperLeg', -sw * legAmp, 0, 0);
    add('rightUpperLeg', sw * legAmp, 0, 0);
    // Knee bends while the leg swings forward (lift), straight when planted.
    add('leftLowerLeg', Math.max(0, Math.sin(this.phase + 1.2)) * (0.8 * walk + 0.6 * run), 0, 0);
    add('rightLowerLeg', Math.max(0, Math.sin(this.phase + 1.2 + Math.PI)) * (0.8 * walk + 0.6 * run), 0, 0);
    add('leftFoot', sw * 0.15 * walk, 0, 0);
    add('rightFoot', -sw * 0.15 * walk, 0, 0);
    add('hips', 0, sw * 0.08 * walk, 0); // pelvis twist
    add('spine', 0.05 * walk + 0.15 * run, -sw * 0.06 * walk, 0); // lean into the walk, counter-twist
    const bob = Math.abs(Math.cos(this.phase)) * (0.025 * walk + 0.04 * run);

    // Idle breathing (always on, strongest when standing still).
    const breathe = Math.sin(this.time * 2 * Math.PI * 0.25);
    add('chest', breathe * 0.025 * (1 - walk * 0.5), 0, 0);
    add('spine', 0, 0, Math.sin(this.time * 0.6) * 0.015 * (1 - walk)); // subtle idle sway

    // ---- Upper layer: walk arm swing ⊕ reaction gesture --------------------------------------
    const armsDown = 1.32;
    const walkArms: Pose = {
      leftUpperArm: [sw * (0.35 * walk + 0.5 * run), 0, -armsDown],
      rightUpperArm: [-sw * (0.35 * walk + 0.5 * run), 0, armsDown],
      leftLowerArm: [0, -0.15 - 0.6 * run, 0],
      rightLowerArm: [0, 0.15 + 0.6 * run, 0],
    };
    let w = 0;
    let gesture: Pose = {};
    if (this.reaction) {
      const r = this.reaction;
      r.t += dt;
      const len = REACTION_LENGTH[r.name];
      w = smooth(clamp(r.t / (r.name === 'surprise' ? 0.12 : 0.25), 0, 1)) * smooth(clamp((len - r.t) / 0.3, 0, 1));
      gesture = this.gesture(r.name, r.t);
      if (r.t >= len) this.reaction = null;
    }
    for (const bone of new Set([...Object.keys(walkArms), ...Object.keys(gesture)]) as Set<VRMHumanBoneName>) {
      const a = walkArms[bone] ?? [0, 0, 0];
      const g = gesture[bone] ?? a;
      add(bone, a[0] + (g[0] - a[0]) * w, a[1] + (g[1] - a[1]) * w, a[2] + (g[2] - a[2]) * w);
    }

    // Surprise jump-back moves the whole body.
    if (this.reaction?.name === 'surprise') {
      const t = this.reaction.t;
      const hop = t < 0.45 ? Math.sin((t / 0.45) * Math.PI) : 0;
      this.rootOffset.set(0, hop * 0.1, -smooth(clamp(t / 0.3, 0, 1)) * 0.12 * w);
    } else {
      this.rootOffset.multiplyScalar(Math.max(0, 1 - dt * 6));
    }

    // ---- Head layer: look at the cursor -------------------------------------------------------
    const headNode = this.vrm.humanoid.getNormalizedBoneNode('head');
    if (headNode) {
      const headPos = headNode.getWorldPosition(new THREE.Vector3());
      const local = this.vrm.scene.worldToLocal(this.lookTarget.clone()).sub(this.vrm.scene.worldToLocal(headPos.clone()));
      let yaw = Math.atan2(local.x, local.z);
      let pitch = -Math.atan2(local.y, Math.hypot(local.x, local.z));
      // Only track things in front; ease back to centre otherwise.
      if (Math.abs(yaw) > 1.6) yaw = 0;
      yaw = clamp(yaw, -0.75, 0.75);
      pitch = clamp(pitch, -0.45, 0.35);
      const thinking = this.reaction?.name === 'think' ? w : 0;
      const k = Math.min(1, dt * 7);
      this.head.yaw += (yaw * (1 - thinking) - this.head.yaw) * k;
      this.head.pitch += (pitch * (1 - thinking) - 0.25 * thinking - this.head.pitch) * k;
      add('neck', this.head.pitch * 0.4, this.head.yaw * 0.4, 0);
      add('head', this.head.pitch * 0.6, this.head.yaw * 0.6, 0.18 * thinking);
    }

    // ---- Apply ---------------------------------------------------------------------------------
    // Bones a finished reaction used (e.g. the hand) go back to rest instead of staying posed.
    const hum = this.vrm.humanoid;
    for (const bone of this.touched) if (!(bone in pose)) hum.getNormalizedBoneNode(bone)?.rotation.set(0, 0, 0);
    for (const [bone, [x, y, z]] of Object.entries(pose) as [VRMHumanBoneName, [number, number, number]][]) {
      hum.getNormalizedBoneNode(bone)?.rotation.set(x, y, z);
      this.touched.add(bone);
    }
    const hips = hum.getNormalizedBoneNode('hips');
    if (hips) {
      if (this.baseHipsY === null) this.baseHipsY = hips.position.y;
      hips.position.y = this.baseHipsY + bob - 0.01 * walk;
    }
  }

  /** Upper-body pose for a reaction at time t (seconds into the reaction). */
  private gesture(name: Reaction, t: number): Pose {
    if (name === 'wave') {
      const wave = Math.sin(t * Math.PI * 2 * 1.6) * 0.35;
      return {
        rightUpperArm: [0, 0.2, -0.25],
        rightLowerArm: [0, 0, -1.35 + wave],
        rightHand: [0, 0, wave * 0.5],
        leftUpperArm: [0, 0, -1.15],
        spine: [0, 0, 0.04],
      };
    }
    if (name === 'surprise') {
      // Startle: hands fly up beside the face, upper body recoils backwards.
      return {
        leftUpperArm: [-0.35, 0, -0.15],
        rightUpperArm: [-0.35, 0, 0.15],
        leftLowerArm: [0, -1.5, 0],
        rightLowerArm: [0, 1.5, 0],
        leftHand: [0, 0, -0.3],
        rightHand: [0, 0, 0.3],
        spine: [-0.28, 0, 0],
        chest: [-0.14, 0, 0],
        neck: [-0.1, 0, 0],
      };
    }
    // think: right hand to chin, left arm across the waist
    return {
      rightUpperArm: [-0.55, 0.35, 1.05],
      rightLowerArm: [0, 2.1, 0],
      rightHand: [0, 0, -0.3],
      leftUpperArm: [-0.25, -0.2, -1.05],
      leftLowerArm: [0, -1.3, 0],
      spine: [0.02, 0, 0],
    };
  }
}
