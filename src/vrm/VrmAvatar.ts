// A VRM 3D anime avatar rendered into its own small transparent canvas.
//
// Loads the model (VRM 0.x or 1.0), runs spring-bone physics (hair / clothes), expressions,
// the procedural rig and cursor tracking, and exposes a small API used by the scene and the
// desktop-pet wanderer:
//   face(direction)              – smoothly rotate the body (quaternion slerp) toward a direction
//   setSpeed(0 | 1 | 2)           – stand / walk / run
//   setExpression(emotion, w, s)  – blend a facial expression in over s seconds and hold it
//   reactWave() / reactSurprise() / reactThink()
//   lookAtScreen(x, y)            – head + eye tracking of a point in screen pixels
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';
import { ExpressionController, type Emotion } from './expressions';
import { Rig } from './rig';

export { FACING } from './facing';

export class VrmAvatar {
  readonly expressions: ExpressionController;
  readonly rig: Rig;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private targetYaw = 0;
  private facing = new THREE.Quaternion();
  private lookTarget = new THREE.Object3D();
  private raf = 0;
  private disposed = false;
  private frameInterval = 0;
  private sinceFrame = 0;

  private constructor(
    private canvas: HTMLCanvasElement,
    readonly vrm: VRM,
    renderer: THREE.WebGLRenderer,
  ) {
    this.renderer = renderer;
    this.expressions = new ExpressionController(vrm);
    this.rig = new Rig(vrm);

    this.scene.add(vrm.scene);
    const key = new THREE.DirectionalLight(0xffffff, Math.PI * 0.9);
    key.position.set(0.6, 1.5, 1.6);
    this.scene.add(key, new THREE.AmbientLight(0xffffff, 0.9));

    // Frame the whole body, feet at the bottom of the canvas.
    const box = new THREE.Box3().setFromObject(vrm.scene);
    const height = box.max.y - box.min.y;
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    this.camera = new THREE.PerspectiveCamera(22, aspect, 0.1, 50);
    const dist = (height * 0.62) / Math.tan(THREE.MathUtils.degToRad(11));
    this.camera.position.set(0, box.min.y + height * 0.52, dist);
    this.camera.lookAt(0, box.min.y + height * 0.52, 0);
    this.scene.add(this.lookTarget);
    if (vrm.lookAt) vrm.lookAt.target = this.lookTarget;
    this.lookTarget.position.set(0, box.min.y + height * 0.9, dist);
  }

  /** Load a .vrm file (ArrayBuffer) into a new avatar drawing on `canvas`. */
  static async load(canvas: HTMLCanvasElement, data: ArrayBuffer): Promise<VrmAvatar> {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    const gltf = await loader.parseAsync(data, '');
    const vrm = gltf.userData.vrm as VRM | undefined;
    if (!vrm) throw new Error('This file is not a VRM avatar.');
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.combineSkeletons(gltf.scene);
    VRMUtils.rotateVRM0(vrm); // VRM 0.x faces the other way; make every model face the viewer
    vrm.scene.traverse((o) => (o.frustumCulled = false));

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    return new VrmAvatar(canvas, vrm, renderer);
  }

  /** Start the render loop. `fps` caps the frame rate (e.g. 30 while idling as a desktop pet). */
  start(fps = 60): void {
    this.frameInterval = 1 / fps;
    this.clock.start();
    const loop = () => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, this.clock.getDelta());
      this.sinceFrame += dt;
      if (this.sinceFrame < this.frameInterval * 0.95) return;
      this.tick(this.sinceFrame);
      this.sinceFrame = 0;
    };
    loop();
  }

  setFps(fps: number): void {
    this.frameInterval = 1 / fps;
  }

  /** Smoothly rotate the body to face a direction (radians, see FACING). */
  face(yaw: number): void {
    this.targetYaw = yaw;
  }

  /** True once the body has finished turning toward the last face() target. */
  get turned(): boolean {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.targetYaw);
    return this.facing.angleTo(q) < 0.08;
  }

  setSpeed(speed: 0 | 1 | 2 | number): void {
    this.rig.speed = speed;
  }

  setExpression(emotion: Emotion, weight = 1, seconds = 0.3): void {
    this.expressions.setExpression(emotion, weight, seconds);
  }

  reactWave(): void {
    this.rig.playReaction('wave');
    this.setExpression('joy', 1, 0.3);
  }

  reactSurprise(): void {
    this.rig.playReaction('surprise');
    this.setExpression('surprised', 1, 0.12);
    this.expressions.blink();
  }

  reactThink(): void {
    this.rig.playReaction('think');
    this.setExpression('neutral', 0, 0.3);
  }

  /** Track a point given in canvas-relative CSS pixels (can be outside the canvas). */
  lookAtScreen(x: number, y: number): void {
    const ndc = new THREE.Vector2((x / this.canvas.clientWidth) * 2 - 1, -(y / this.canvas.clientHeight) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    // Intersect with a plane a little in front of the avatar so eyes converge naturally.
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.6);
    const hit = new THREE.Vector3();
    if (ray.ray.intersectPlane(plane, hit)) {
      this.lookTarget.position.copy(hit);
      this.rig.lookAt(hit);
    }
  }

  resize(): void {
    this.camera.aspect = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    VRMUtils.deepDispose(this.vrm.scene);
    this.renderer.dispose();
  }

  private tick(dt: number): void {
    // Body facing: quaternion slerp toward the target yaw (smooth turn before walking).
    const target = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.targetYaw);
    this.facing.slerp(target, Math.min(1, dt * 7));
    this.vrm.scene.quaternion.copy(this.facing);
    this.vrm.scene.position.copy(this.rig.rootOffset.clone().applyQuaternion(this.facing));

    this.rig.update(dt);
    this.expressions.update(dt);
    this.vrm.update(dt); // spring bones (hair / clothes physics), look-at, expressions
    this.renderer.render(this.scene, this.camera);
  }
}
