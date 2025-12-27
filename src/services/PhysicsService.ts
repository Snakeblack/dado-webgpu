import PhysicsWorker from '../worker/physics.worker?worker';
import * as THREE from 'three/webgpu';
import { Config } from '../Config';

interface PhysicsState {
	position: [number, number, number];
	quaternion: [number, number, number, number];
	time: number;
}

/**
 * Servicio de Física (PhysicsService)
 *
 * Responsabilidad: Actuar como proxy para el Web Worker de física.
 * Gestiona el buffer de estados y la interpolación visual.
 */
export class PhysicsService {
	private worker: Worker;
	private bodies: Map<string, { mesh: THREE.Mesh | undefined; buffer: PhysicsState[] }> = new Map();

	// Lista de callbacks para detección de reposo (Eventos)
	private restListeners: ((id: string, quat: [number, number, number, number]) => void)[] = [];

	constructor() {
		this.worker = new PhysicsWorker();
		this.setupWorkerListeners();
		this.initWorld();
	}

	/**
	 * Suscribe un callback al evento de reposo del dado.
	 * @param callback Función a ejecutar cuando el dado se detiene.
	 */
	public onDiceRest(callback: (id: string, quat: [number, number, number, number]) => void) {
		this.restListeners.push(callback);
	}

	/**
	 * Configura los listeners para los mensajes del Worker.
	 */
	private setupWorkerListeners() {
		this.worker.onmessage = (e) => {
			const { type, positions, quaternions, time } = e.data;

			if (type === 'REST_DETECTED') {
				if (quaternions) {
					// Notificar listeners si existe el ID del dado configurado
					if (quaternions[Config.DICE_ID]) {
						this.restListeners.forEach((cb) => cb(Config.DICE_ID, quaternions[Config.DICE_ID]));
					}
				}
			}

			if (type === 'UPDATE' || type === 'REST_DETECTED') {
				for (const id in positions) {
					if (this.bodies.has(id)) {
						const bodyData = this.bodies.get(id)!;
						bodyData.buffer.push({
							position: positions[id],
							quaternion: quaternions[id],
							time: time
						});
						// Limitar tamaño del buffer para evitar fugas de memoria
						if (bodyData.buffer.length > 20) bodyData.buffer.shift();
					}
				}
			}
		};
	}

	private initWorld() {
		this.worker.postMessage({ type: 'INIT', params: { gravity: Config.GRAVITY } });
	}

	/**
	 * Avanza la simulación física.
	 * @param dt Delta time.
	 */
	public update(dt: number): void {
		this.worker.postMessage({ type: 'STEP', params: { dt } });
	}

	/**
	 * Añade un cuerpo físico y lo vincula opcionalmente a una malla visual.
	 */
	public addBody(
		id: string,
		mesh: THREE.Mesh | undefined,
		mass: number,
		shape: 'box' | 'plane',
		size?: [number, number, number],
		pos?: [number, number, number]
	): void {
		const initialState: PhysicsState = {
			position: [0, 0, 0],
			quaternion: [0, 0, 0, 1],
			time: performance.now()
		};

		this.bodies.set(id, {
			mesh,
			buffer: [initialState]
		});

		this.worker.postMessage({
			type: 'ADD_BODY',
			params: { id, mass, shape, size, position: pos || [0, 0, 0] }
		});
	}

	public addFloor(): void {
		this.addBody('floor', undefined, 0, 'plane', undefined, [0, 0, 0]);
	}

	/**
	 * Crea paredes invisibles alrededor del área de juego.
	 */
	public addWalls(size: number): void {
		const halfSize = size / 2;
		const wallHeight = Config.WALL_HEIGHT;
		const thickness = 0.5;

		const addWallDirect = (id: string, x: number, z: number, w: number, d: number) => {
			this.worker.postMessage({
				type: 'ADD_BODY',
				params: {
					id: `wall_${id}`,
					mass: 0,
					shape: 'box',
					size: [w / 2, wallHeight / 2, d / 2],
					position: [x, wallHeight / 2, z]
				}
			});
		};

		addWallDirect('back', 0, -halfSize, size, thickness);
		addWallDirect('front', 0, halfSize, size, thickness);
		addWallDirect('left', -halfSize, 0, thickness, size);
		addWallDirect('right', halfSize, 0, thickness, size);
	}

	public applyImpulse(id: string, impulse: [number, number, number], point: [number, number, number]): void {
		this.worker.postMessage({ type: 'APPLY_IMPULSE', params: { id, impulse, point } });
	}

	public applyTorque(id: string, torque: [number, number, number]): void {
		this.worker.postMessage({ type: 'APPLY_TORQUE', params: { id, torque } });
	}

	public resetBody(id: string, position: [number, number, number]) {
		this.worker.postMessage({ type: 'RESET_POSITION', params: { id, position } });
	}

	/**
	 * Sincroniza la posición visual de las mallas interpolando entre los estados del buffer.
	 * Utiliza un retraso fijo para asegurar una interpolación suave (LERP/SLERP).
	 */
	public syncVisuals(): void {
		const renderTime = performance.now() - Config.PHYSICS_DELAY;

		this.bodies.forEach((data) => {
			if (!data.mesh) return;

			const buffer = data.buffer;
			if (buffer.length === 0) return;

			let older: PhysicsState | null = null;
			let newer: PhysicsState | null = null;

			// Encontrar ventana de tiempo
			for (let i = buffer.length - 1; i >= 0; i--) {
				const state = buffer[i];
				if (state.time <= renderTime) {
					older = state;
					if (i + 1 < buffer.length) newer = buffer[i + 1];
					break;
				}
			}

			if (older && newer) {
				const timeDiff = newer.time - older.time;
				if (timeDiff > 0) {
					const alpha = (renderTime - older.time) / timeDiff;

					// Interpolación Lineal de Posición
					data.mesh.position.set(
						older.position[0] + (newer.position[0] - older.position[0]) * alpha,
						older.position[1] + (newer.position[1] - older.position[1]) * alpha,
						older.position[2] + (newer.position[2] - older.position[2]) * alpha
					);

					// Interpolación Esférica de Rotación
					const qOlder = new THREE.Quaternion(...older.quaternion);
					const qNewer = new THREE.Quaternion(...newer.quaternion);
					data.mesh.quaternion.copy(qOlder).slerp(qNewer, alpha);
				}
			} else if (buffer.length > 0) {
				// Extrapolación o Snap al último conocido si falta buffer
				const latest = buffer[buffer.length - 1];
				data.mesh.position.set(...latest.position);
				data.mesh.quaternion.set(...latest.quaternion);
			}
		});
	}
}