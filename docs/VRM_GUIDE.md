# 3D anime avatar (VRM): setup guide & technical spec

WaterBuddy can use any **VRM** anime avatar (VRM 0.x or 1.0) as its buddy. This guide covers how to prepare a model so it moves and emotes well, and how the app's avatar system works.

- **Make an avatar:** [VRoid Studio](https://vroid.com/en/studio) is free (Windows / macOS). Design a character, then **Export → VRM**.
- **Use it:** 💧 → Settings… → *Your buddy* → **🧊 3D anime** → *Import 3D avatar (.vrm)*.
- **Code:** `src/vrm/` (`VrmAvatar.ts`, `rig.ts`, `expressions.ts`, `locomotion.ts`), built on [three.js](https://threejs.org) and [@pixiv/three-vrm](https://github.com/pixiv/three-vrm).

---

## 1. Rigging & VRM setup

### 1.1 Humanoid skeleton

VRM requires a Unity-style **humanoid** bone map. WaterBuddy drives these bones (the required ones in **bold**):

| Group | Bones |
|---|---|
| Body | **hips**, **spine**, chest, upperChest, neck, **head** |
| Legs | **leftUpperLeg**, **leftLowerLeg**, **leftFoot** (and right), toes |
| Arms | leftShoulder, **leftUpperArm**, **leftLowerArm**, **leftHand** (and right) |
| Eyes | leftEye, rightEye (for bone-type look-at) |

- **Rest pose must be a T-pose**, facing **+Z** (VRM 1.0) or **−Z** (VRM 0.x). The app calls `VRMUtils.rotateVRM0`, so both face the viewer.
- Bones are animated through three-vrm's **normalized humanoid** (`getNormalizedBoneNode`). Rotations are relative to the T-pose and use the same axes on every model, so one procedural rig works with any avatar.
- **Avoid** custom twist rigs that skin the forearm to constraint-driven helper bones. Elbow and wrist poses may not show up on the mesh. Standard VRoid exports are fine.

### 1.2 Spring bones (hair & clothes physics)

Spring bones give hair, skirts, ribbons and ears secondary motion when the avatar walks, turns, hops or tracks the cursor. three-vrm simulates them every frame in `vrm.update(dt)`. Set them up in VRoid Studio (*Look → Hair / Clothes → Sway*) or in UniVRM (`VRMSpringBone` / `VRM10SpringBoneJoint`):

| Part | Stiffness | Gravity power | Drag | Hit radius | Notes |
|---|---|---|---|---|---|
| Long hair (back) | 0.6–0.9 | 0.1–0.2 | 0.4–0.5 | 0.02 | Root joint at the head; 4–6 joints per strand |
| Bangs / side hair | 1.0–1.5 | 0.05 | 0.5–0.6 | 0.015 | Stiffer, so bangs don't flop into the eyes |
| Ponytail / twin tails | 0.5–0.8 | 0.2 | 0.35 | 0.025 | Low drag gives a lively bounce when walking |
| Skirt | 1.2–2.0 | 0.1 | 0.6 | 0.03 | Collide with leg colliders (below) |
| Coat tails / ribbons | 0.4–0.7 | 0.15 | 0.3 | 0.02 | |

**Colliders** (sphere or capsule groups) stop hair and clothes passing through the body:

- head (r ≈ 0.09), neck (0.05), upperChest (0.11)
- left/right shoulder & upperArm capsules (0.05)
- left/right upperLeg capsules (0.08) and lowerLeg (0.06) for skirts

**Tuning tips**

- Walk the avatar in the Settings preview (**🚶 Walk**) and turn it (**👋 Wave**, **😲 Surprise**). Hair should settle within about 0.5 s after a stop. Raise drag if it jiggles; lower stiffness if it looks rigid.
- The surprise reaction makes a small hop and the walk has a vertical bob. Both are good tests for skirts clipping into legs: add or enlarge leg colliders if they do.

### 1.3 Expressions (blend shapes / morph targets)

The app uses these presets. VRoid exports all of them; for custom models, map your morphs in UniVRM's *Expression* / *BlendShapeProxy*:

| Spec name | VRM 1.0 preset | VRM 0.x preset | Typical morphs (VRoid) | Used by WaterBuddy for |
|---|---|---|---|---|
| Joy | `happy` | `Joy` | `Fcl_ALL_Joy` | Yes answer, wave |
| Sorrow | `sad` | `Sorrow` | `Fcl_ALL_Sorrow` | No answer, sad walk home |
| Angry | `angry` | `Angry` | `Fcl_ALL_Angry` | Settings preview |
| Fun | `relaxed` | `Fun` | `Fcl_ALL_Fun` | Asking the question (gentle smile) |
| Surprised | `surprised` | — (use `Fcl_ALL_Surprised`) | `Fcl_ALL_Surprised` | Surprise reaction |
| Blink | `blink` | `Blink` | `Fcl_EYE_Close` | Auto-blink |
| A / E / I / O / U | `aa` `ee` `ih` `oh` `ou` | `A` `E` `I` `O` `U` | `Fcl_MTH_A` … `Fcl_MTH_U` | Lip flap while the bubble talks |

**Setup rules**

- **Override blink when smiling.** Set `overrideBlink: block` on *happy* (VRM 1.0) so the closed-eye smile isn't fought by blinks. The app also suppresses blinks while joy is strong.
- **Override mouth when sad or angry.** Set `overrideMouth: blend` on *sad* and *angry* if the visemes distort those mouths.
- **Mark binary expressions.** Use `isBinary: false` for everything above (smooth fades). Only toggle-style extras such as tears or blush should be binary.
- **Look-at:** use **bone** type for eye bones, or **expression** type (`lookUp/Down/Left/Right`) for texture eyes. Keep the ranges at about ±10° vertical and ±15° horizontal.

### 1.4 Locomotion animation clips

WaterBuddy **doesn't need animation files**. `src/vrm/rig.ts` generates every clip procedurally on the normalized skeleton, so it works with any avatar and has no licensing issues. If you author clips anyway (for another engine, or to replace the procedural ones), here's the set and how to prepare it:

| Clip | Length | Loop | Content |
|---|---|---|---|
| `Idle` | 4–6 s | ✅ | Breathing (chest ±1.5°), slight weight shift, occasional look-around |
| `Walk_Forward` | 1 cycle (≈1.1 s) | ✅ | In place. Left heel strike at frame 0, right at 50% |
| `Walk_Left` / `Walk_Right` | 1 cycle | ✅ | Strafe or crab-walk in place, or rotate the Walk_Forward root ±90° |
| `Turn_around` | 0.5–0.7 s | ❌ | 180° pivot on the spot, head leading the body |
| `React_Surprise` | 1.0–1.2 s | ❌ | Startle: small hop back, hands up, upper body recoils |

**Authoring and retargeting**

1. **Make all clips in place.** Disable or bake out root motion: the app moves the avatar across the screen itself (§2).
2. **Match the loop pose.** The first and last frames must be identical (Walk, Idle). Set *Loop Time* + *Loop Pose* in Unity, or `LoopRepeat` in three.js.
3. **Retarget to the VRM humanoid.**
   - **Unity:** import the FBX as *Humanoid* (Avatar Definition: *Create From This Model*). Any clip then plays on any VRM through the humanoid muscle space.
   - **three.js:** use **VRMA** (VRM Animation, `.vrma`), which is already in VRM humanoid space, with `@pixiv/three-vrm-animation`: `createVRMAnimationClip(vrmAnimation, vrm)`.
   - **From Mixamo:** retarget the FBX through a Humanoid avatar in Unity and export as VRMA (UniVRM ≥ 0.120), or convert bone-by-bone with the rest-pose correction shown in three-vrm's `loadMixamoAnimation` example.
4. **Mask the upper-body reactions.** Wave, think and surprise should only key spine/chest/arms/head, so they can play over the walk (§3.4).

---

## 2. Movement & walking on the desktop

Implemented in `src/vrm/locomotion.ts` (the `Wanderer` class) and `src/vrm/VrmAvatar.ts`.

### 2.1 Screen-space locomotion

The avatar renders into a small transparent canvas (200 × 300 px). The canvas is moved across the desktop, which keeps GPU cost tiny compared with a full-screen 3D scene.

- **Bounds:** `left = 20`, `right = screenWidth − canvasWidth − 20`, and a walkable band near the bottom (`top = screenHeight − h − 110`, `bottom = screenHeight − h − 40`), so it never covers the taskbar or Dock.
- **Walking from (x₁, y₁) to (x₂, y₂):**
  1. Turn toward the destination: `face(yaw)`, wait until `avatar.turned`.
  2. Walk: `setSpeed(1)` plays the gait and the canvas moves at 95 px/s, matched to the stride so feet don't slide.
  3. Arrive: `setSpeed(0)`, then `face(viewer)`.
- **Reminder story:** the walk in, the stop and the walk off use the same avatar API, timed by `Scene.tsx`.

### 2.2 Smooth rotation and facing

Every frame the body yaw is **quaternion-slerped** toward the target:

```ts
const target = new THREE.Quaternion().setFromAxisAngle(UP, targetYaw);
facing.slerp(target, Math.min(1, dt * 7));   // ≈ 0.3 s to settle
vrm.scene.quaternion.copy(facing);
```

Facing values: `FACING.viewer = 0`, `right = +90°`, `left = −90°`. Walking starts only once the turn is done, so the avatar never moonwalks.

### 2.3 Random wandering (desktop-pet mode)

```
        ┌──────── idle 3–8 s (breathe, blink, look around) ────────┐
        │   12% wave · 10% think · 78% walk somewhere new           │
        ▼                                                           │
   turning ──(turned)──► walking ──(arrived)──► arriving ──(turned)─┘
```

Targets are at least 160 px away, so every walk is visible. Rendering is capped at **30 fps** in pet mode. If the pointer dashes right up to the avatar, it does `reactSurprise()`, at most once every 4 s.

### 2.4 Mouse-cursor tracking (head and eyes)

The overlay window is click-through but **forwards mouse moves**, so the avatar sees the system cursor anywhere on screen.

1. The cursor position, relative to the canvas, is unprojected with a raycaster onto a plane 0.6 m in front of the avatar.
2. **Eyes:** `vrm.lookAt.target` is set to that point. three-vrm's LookAt applies the per-model eye range maps (bone or blend-shape eyes).
3. **Head:** yaw and pitch toward the point are computed in avatar-local space, then clamped (yaw ±43°, pitch −26°…+20°). They're smoothed with a critically-damped lerp (rate 7/s) and split **40% neck / 60% head**.
4. Points behind the avatar are ignored, so the head eases back to centre.

---

## 3. Expression & reaction controller

Implemented in `src/vrm/expressions.ts` and the upper layer of `src/vrm/rig.ts`. Public API (`VrmAvatar`):

| Call | Effect |
|---|---|
| `setExpression('joy', 1, 0.3)` | Blend to Joy over 0.3 s and hold; every other emotion fades out at the same time |
| `reactWave()` | Right arm waves (3 waves over 2.4 s) + Joy |
| `reactSurprise()` | Quick hop back + hands up + recoil + Surprised + blink |
| `reactThink()` | Hand to chin, head tilt, eyes and head up (look-at overridden) |
| `expressions.talk(1.4)` | A/E/I/O/U lip flap for speech bubbles |
| `face(yaw)`, `setSpeed(0 / 1 / 2)` | Turn (slerp) / stand · walk · run |

### 3.1 Expression blending

Each preset has its own fade `{from, to, t, duration}`. Weights follow a smoothstep curve (ease-in-out), so there are no pops even when a new emotion interrupts a running fade.

### 3.2 Micro-expressions

- **Auto-blink:** every 3–6 s (random), 160 ms close-and-open, 20% chance of a double blink. It's suppressed in proportion to Joy (closed-eye smiles).
- **Breathing:** the chest pitches ±1.5° at 0.25 Hz, with a tiny lateral sway when standing. It's reduced to half while walking.

### 3.3 Reaction library

Reactions are upper-body poses defined per bone, with an envelope:

```
weight(t) = smoothstep(t / fadeIn) × smoothstep((length − t) / 0.3)
```

`fadeIn` is 0.25 s, or 0.12 s for the snappy surprise. The surprise hop and recoil move the **root**, through `rootOffset`, which is rotated with the body's facing.

### 3.4 Animation layering

```
lower layer  hips · legs · feet        locomotion only (stand ↔ walk ↔ run), never interrupted
upper layer  spine · arms · hands      walkArmSwing ⊕ reactionPose, blended by the reaction weight
head layer   neck · head · eyes        look-at on top of everything (fades out during "think")
```

The final bone rotation is `walk + (gesture − walk) × weight`, which is equivalent to an Animator **upper-body Avatar Mask** layer with *Override* blending at that weight. So you can call `reactWave()` mid-walk: the arm waves while the legs keep stepping. Bones used by a finished reaction (such as the hand) are reset to rest, so poses never stick.

### 3.5 Unity (C#) equivalent

For a Unity build with UniVRM 1.0, the same design maps to:

```csharp
// Facing: slerp the body toward the walk direction before moving.
transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(dir), 7f * Time.deltaTime);

// Expressions: lerp weights, Vrm10Instance.Runtime.Expression.SetWeight(ExpressionKey.Happy, w).
// Head/eye tracking: Vrm10Instance.LookAtTargetType = LookAtTargetTypes.SpecifiedTransform;
//                    LookAtTarget = cursorProxy (Camera.ScreenToWorldPoint of the OS cursor).
// Layering: Animator layer 0 = locomotion blend tree (Idle/Walk/Run),
//           layer 1 = reactions with an upper-body AvatarMask, weight tweened 0→1→0.
```
