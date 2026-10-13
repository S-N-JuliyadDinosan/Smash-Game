import {
  Component,
  Suspense,
  createRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  ContactShadows,
  Grid,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";
import {
  Physics,
  RigidBody,
  CuboidCollider,
  BallCollider,
  useRevoluteJoint,
  useSphericalJoint,
  interactionGroups,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  PARTS,
  makeParts,
  disposeParts,
  type Part,
  type PartName,
} from "../avatar/model";
import type { AvatarData } from "../avatar/types";
import { TOOLS, useGame, playBonk, type ToolId } from "../store";
type Bodies = Record<PartName, RefObject<RapierRigidBody>>;
function anchors(part: Part) {
  const parent = PARTS.find((p) => p.name === part.parent)!;
  return [
    part.anchor!.map((x, i) => x - parent.position[i]),
    part.anchor!.map((x, i) => x - part.position[i]),
  ] as [[number, number, number], [number, number, number]];
}
function BallJoint({ part, bodies }: { part: Part; bodies: Bodies }) {
  const joint = useSphericalJoint(
    bodies[part.parent!],
    bodies[part.name],
    anchors(part),
  );
  useEffect(() => {
    joint.current?.setContactsEnabled(false);
  }, [joint]);
  return null;
}
function HingeJoint({ part, bodies }: { part: Part; bodies: Bodies }) {
  const [a, b] = anchors(part);
  const joint = useRevoluteJoint(bodies[part.parent!], bodies[part.name], [
    a,
    b,
    [1, 0, 0],
  ]);
  useEffect(() => {
    joint.current?.setLimits(-1.5, 0.3);
    joint.current?.setContactsEnabled(false);
  }, [joint]);
  return null;
}
type Burst = { id: number; point: THREE.Vector3; tool: ToolId };
function Confetti({ burst }: { burst: Burst }) {
  const ref = useRef<THREE.Group>(null);
  const age = useRef(0);
  const vectors = useMemo(
    () =>
      Array.from(
        { length: burst.tool === "confetti" ? 70 : 22 },
        () =>
          new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            Math.random() * 5,
            (Math.random() - 0.5) * 5,
          ),
      ),
    [burst],
  );
  useFrame((_, dt) => {
    age.current += dt;
    if (!ref.current) return;
    ref.current.visible = age.current < 1.4;
    ref.current.children.forEach((c, i) => {
      c.position
        .copy(vectors[i])
        .multiplyScalar(age.current)
        .add(new THREE.Vector3(0, -3 * age.current ** 2, 0));
      c.rotation.x = age.current * 5;
      c.rotation.z = age.current * 7;
      c.scale.setScalar(Math.max(0, 1 - age.current / 1.4));
    });
  });
  return (
    <group ref={ref} position={burst.point}>
      {vectors.map((_, i) => (
        <mesh key={i}>
          <boxGeometry args={[0.045, 0.09, 0.025]} />
          <meshBasicMaterial
            color={["#d5ff70", "#a68bfa", "#ffb6d2", "#f8fafc"][i % 4]}
          />
        </mesh>
      ))}
    </group>
  );
}
function Projectile({ target }: { target: THREE.Vector3 }) {
  const ref = useRef<RapierRigidBody>(null);
  const origin = useMemo(
    () => new THREE.Vector3(target.x, target.y + 0.7, target.z + 4),
    [target],
  );
  useEffect(() => {
    ref.current?.setLinvel(
      target.clone().sub(origin).normalize().multiplyScalar(15),
      true,
    );
  }, [target, origin]);
  return (
    <RigidBody
      ref={ref}
      position={origin}
      colliders={false}
      restitution={0.85}
      ccd
      collisionGroups={interactionGroups(2, [0, 1, 2])}
    >
      <BallCollider args={[0.18]} mass={1.3} />
      <mesh castShadow>
        <sphereGeometry args={[0.18, 20, 16]} />
        <meshStandardMaterial color="#d5ff70" roughness={0.5} />
      </mesh>
    </RigidBody>
  );
}
function ToolVisual({ burst }: { burst: Burst }) {
  const ref = useRef<THREE.Group>(null),
    age = useRef(0);
  useFrame((_, dt) => {
    age.current += dt;
    if (ref.current) {
      ref.current.visible = age.current < 0.45;
      ref.current.rotation.z = Math.sin(age.current * 9) * -0.8;
      ref.current.position.z = burst.point.z + 0.25 + age.current * 0.8;
      ref.current.scale.setScalar(Math.max(0.01, 1 - age.current * 1.7));
    }
  });
  return (
    <group ref={ref} position={burst.point}>
      {burst.tool === "hammer" ? (
        <>
          <RoundedBox
            args={[0.8, 0.42, 0.42]}
            radius={0.1}
            position={[0.3, 0.25, 0]}
          >
            <meshStandardMaterial color="#b297ff" />
          </RoundedBox>
          <mesh position={[0.3, -0.22, 0]}>
            <cylinderGeometry args={[0.07, 0.09, 0.65]} />
            <meshStandardMaterial color="#d5ff70" />
          </mesh>
        </>
      ) : burst.tool === "banana" ? (
        <mesh rotation={[0, 0, 1]}>
          <torusGeometry args={[0.28, 0.075, 8, 20, Math.PI]} />
          <meshStandardMaterial color="#ffde57" />
        </mesh>
      ) : burst.tool === "glove" || burst.tool === "hand" ? (
        <mesh>
          <sphereGeometry args={[0.35, 16, 12]} />
          <meshStandardMaterial
            color={burst.tool === "glove" ? "#fa88b4" : "#c5ff69"}
          />
        </mesh>
      ) : (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.42, 0.035, 8, 28]} />
          <meshBasicMaterial color="#d5ff70" />
        </mesh>
      )}
    </group>
  );
}
function Character({
  data,
  playable,
  onMotion,
  onReady,
}: {
  data?: AvatarData;
  playable: boolean;
  onMotion: (moving: boolean) => void;
  onReady: () => void;
}) {
  const parts = useMemo(() => makeParts(data), [data]);
  const bodies = useMemo(
    () =>
      Object.fromEntries(
        PARTS.map((p) => [p.name, createRef<RapierRigidBody>()]),
      ) as Bodies,
    [],
  );
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [balls, setBalls] = useState<{ id: number; target: THREE.Vector3 }[]>(
    [],
  );
  const active = useRef(false),
    gravityUntil = useRef(0),
    lastHit = useRef(0),
    motionReported = useRef(false);
  const readyReported=useRef(false);
  useEffect(() => () => disposeParts(parts), [parts]);
  useFrame(({ clock }) => {
    if(!readyReported.current){readyReported.current=true;onReady();}
    if (
      active.current &&
      performance.now() > gravityUntil.current &&
      gravityUntil.current
    ) {
      Object.values(bodies).forEach((ref) =>
        ref.current?.setGravityScale(1, true),
      );
      gravityUntil.current = 0;
    }
    if (active.current && !motionReported.current) {
      const head = bodies.head.current?.translation();
      if (head && Math.hypot(head.x, head.y - 2.83, head.z) > 0.12) {
        motionReported.current = true;
        onMotion(true);
      }
    }
    if (!active.current) {
      const wave = Math.sin(clock.elapsedTime * 1.5) * 0.008;
      PARTS.forEach((p) => {
        bodies[p.name].current?.setTranslation(
          { x: p.position[0], y: p.position[1] + wave, z: p.position[2] },
          false,
        );
      });
    }
  });
  const hit = (event: ThreeEvent<PointerEvent>, name: PartName) => {
    if (!playable || event.button !== 0 || event.delta > 5) return;
    event.stopPropagation();
    if (performance.now() - lastHit.current < 180) return;
    lastHit.current = performance.now();
    const { tool } = useGame.getState();
    const selected = TOOLS.find((t) => t.id === tool)!;
    const body = bodies[name].current;
    if (!body) return;
    active.current = true;
    Object.values(bodies).forEach((ref) =>
      ref.current?.setGravityScale(tool === "gravity" ? -0.18 : 1, true),
    );
    const direction = new THREE.Vector3().copy(event.ray.direction).normalize();
    direction.y = Math.max(0.25, direction.y);
    const p = selected.power;
    gravityUntil.current = tool === "gravity" ? performance.now() + 3000 : 0;
    if (tool === "spring") {
      bodies.hips.current?.applyImpulse({ x: 0, y: 13, z: 0 }, true);
    } else if (tool === "banana") {
      bodies.shinL.current?.applyImpulse({ x: -3, y: 0, z: 5 }, true);
      bodies.hips.current?.applyTorqueImpulse({ x: 1.6, y: 0, z: 0.7 }, true);
    } else if (tool === "wind") {
      Object.values(bodies).forEach((ref) =>
        ref.current?.applyImpulse(
          { x: direction.x * 0.7, y: 0.15, z: direction.z * 1.5 },
          true,
        ),
      );
    } else if (tool === "ball") {
      setBalls((prev) => [
        ...prev.slice(-7),
        { id: Date.now(), target: event.point.clone() },
      ]);
    } else {
      body.applyImpulseAtPoint(
        {
          x: direction.x * p,
          y: tool === "gravity" ? 3 : p * 0.5,
          z: direction.z * p,
        },
        event.point,
        true,
      );
    }
    setBursts((prev) => [
      ...prev.slice(-4),
      { id: Date.now(), point: event.point.clone(), tool },
    ]);
    useGame.getState().hit();
    playBonk(tool);
  };
  return (
    <>
      {PARTS.map((part) => (
        <RigidBody
          ref={bodies[part.name]}
          key={part.name}
          name={part.name}
          position={part.position}
          gravityScale={0}
          colliders={false}
          linearDamping={0.45}
          angularDamping={1.2}
          restitution={0.35}
          friction={0.65}
          ccd
          canSleep
          collisionGroups={interactionGroups(1, [0, 2])}
        >
          <CuboidCollider
            args={part.size.map((v) => v / 2) as [number, number, number]}
            mass={
              part.name === "chest"
                ? 2
                : part.name === "hips"
                  ? 1.5
                  : part.name === "head"
                    ? 0.7
                    : 0.45
            }
          />
          <primitive
            object={parts[part.name]}
            onClick={(e: ThreeEvent<PointerEvent>) => hit(e, part.name)}
            onPointerOver={() => {
              if (playable) document.body.style.cursor = "crosshair";
            }}
            onPointerOut={() => (document.body.style.cursor = "auto")}
          />
        </RigidBody>
      ))}
      {PARTS.filter((p) => p.parent).map((part) =>
        part.hinge ? (
          <HingeJoint key={part.name} part={part} bodies={bodies} />
        ) : (
          <BallJoint key={part.name} part={part} bodies={bodies} />
        ),
      )}
      {bursts.map((b) => (
        <group key={b.id}>
          <Confetti burst={b} />
          <ToolVisual burst={b} />
        </group>
      ))}
      {balls.map((b) => (
        <Projectile key={b.id} target={b.target} />
      ))}
    </>
  );
}
function Camera({ view }: { view: string }) {
  const ref = useRef<OrbitControlsImpl>(null);
  useEffect(() => {
    if (!ref.current) return;
    const v = view.split(":")[0];
    ref.current.object.position.set(
      ...((v === "side"
        ? [6, 3.1, 0]
        : v === "back"
          ? [0, 3.1, -6]
          : [0, 3.1, 6.7]) as [number, number, number]),
    );
    ref.current.target.set(0, 1.6, 0);
    ref.current.update();
  }, [view]);
  return (
    <OrbitControls
      ref={ref}
      makeDefault
      target={[0, 1.6, 0]}
      minDistance={3.3}
      maxDistance={10}
      maxPolarAngle={Math.PI / 2 + 0.12}
      enablePan={false}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
    />
  );
}
class SceneBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="scene-error">
        The 3D arena could not start. Enable WebGL in your browser, then reload.
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function Scene({
  data,
  playable,
  reset,
  view,
  onMotion,
  onReady,
}: {
  data?: AvatarData;
  playable: boolean;
  reset: number;
  view: string;
  onMotion: (moving: boolean) => void;
  onReady: () => void;
}) {
  return (
    <SceneBoundary>
      <Canvas
        shadows
        dpr={[1, 1.6]}
        camera={{ position: [0, 3.1, 6.7], fov: 40 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        fallback={
          <div className="scene-error">
            This game needs a browser with WebGL enabled.
          </div>
        }
      >
        <color attach="background" args={["#1d1e23"]} />
        <fog attach="fog" args={["#1d1e23", 9, 22]} />
        <ambientLight intensity={1.4} />
        <directionalLight
          position={[3, 7, 5]}
          intensity={3}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-7}
          shadow-camera-right={7}
          shadow-camera-top={7}
          shadow-camera-bottom={-7}
        />
        <pointLight position={[-4, 3, -2]} color="#a78bfa" intensity={30} />
        <pointLight position={[3, 1, 3]} color="#dcff9b" intensity={8} />
        <Grid
          position={[0, -0.06, 0]}
          args={[40, 40]}
          cellSize={0.65}
          cellThickness={0.5}
          cellColor="#35363b"
          sectionSize={3.25}
          sectionColor="#44464c"
          sectionThickness={0.7}
          fadeDistance={18}
          infiniteGrid
        />
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.04, 0]}
          receiveShadow
        >
          <circleGeometry args={[2.2, 64]} />
          <meshStandardMaterial color="#27282e" roughness={1} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]}>
          <ringGeometry args={[2.15, 2.17, 80]} />
          <meshBasicMaterial color="#baf15c" transparent opacity={0.6} />
        </mesh>
        <ContactShadows
          position={[0, -0.02, 0]}
          opacity={0.4}
          scale={12}
          blur={2}
          far={5}
        />
        <Suspense fallback={null}>
          <Physics
            timeStep={1 / 60}
            gravity={[0, -9.81, 0]}
            numSolverIterations={10}
          >
            <RigidBody type="fixed" colliders={false}>
              <CuboidCollider
                position={[0, -0.2, 0]}
                args={[12, 0.2, 12]}
                restitution={0.45}
              />
              {[
                [0, 3, -7],
                [0, 3, 7],
                [-7, 3, 0],
                [7, 3, 0],
              ].map((p, i) => (
                <CuboidCollider
                  key={i}
                  position={p as [number, number, number]}
                  args={i < 2 ? [7, 3, 0.2] : [0.2, 3, 7]}
                />
              ))}
            </RigidBody>
            <Character
              key={`${data?.id || "demo"}:${reset}`}
              data={data}
              playable={playable}
              onMotion={onMotion}
              onReady={onReady}
            />
          </Physics>
        </Suspense>
        <Camera view={view} />
      </Canvas>
    </SceneBoundary>
  );
}
