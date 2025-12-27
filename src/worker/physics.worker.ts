import * as CANNON from 'cannon-es';

// Tipos de mensajes
type WorkerMessage =
	| { type: 'INIT'; params: { gravity: [number, number, number] } }
	| {
			type: 'ADD_BODY';
			params: {
				id: string;
				mass: number;
				position: [number, number, number];
				shape: 'box' | 'plane';
				size?: [number, number, number];
			};
	  }
	| { type: 'STEP'; params: { dt: number; timeSinceLastCalled?: number } }
	| {
			type: 'APPLY_IMPULSE';
			params: { id: string; impulse: [number, number, number]; point: [number, number, number] };
	  }
	| { type: 'APPLY_TORQUE'; params: { id: string; torque: [number, number, number] } }
	| { type: 'RESET_POSITION'; params: { id: string; position: [number, number, number] } };

const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

// Configuración de Sueño ("Sleep") para detección de parada
world.allowSleep = true;

const defaultMaterial = new CANNON.Material('default');
const defaultContactMaterial = new CANNON.ContactMaterial(defaultMaterial, defaultMaterial, {
	friction: 0.3,
	restitution: 0.5 // Rebote moderado
});
world.addContactMaterial(defaultContactMaterial);

const bodies: Map<string, CANNON.Body> = new Map();
let isResting = false;
let restFrameCount = 0;

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
	const { type, params } = e.data;

	switch (type) {
		case 'INIT':
			world.gravity.set(params.gravity[0], params.gravity[1], params.gravity[2]);
			break;

		case 'ADD_BODY':
			let shape: CANNON.Shape;
			if (params.shape === 'box' && params.size) {
				shape = new CANNON.Box(new CANNON.Vec3(params.size[0], params.size[1], params.size[2]));
			} else {
				shape = new CANNON.Plane();
			}

			const body = new CANNON.Body({
				mass: params.mass,
				shape: shape,
				position: new CANNON.Vec3(params.position[0], params.position[1], params.position[2]),
				material: defaultMaterial
			});

			// Parámetros de sueño agresivos para detectar parada rápida
			body.sleepSpeedLimit = 0.5;
			body.sleepTimeLimit = 0.5;

			if (params.shape === 'plane') {
				body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
			} else {
				body.linearDamping = 0.5;
				body.angularDamping = 0.5;
			}

			world.addBody(body);
			bodies.set(params.id, body);
			break;

		case 'STEP':
			// Paso fijo de física (60Hz)
			world.step(1 / 60, params.dt, 10);

			const positions: { [id: string]: [number, number, number] } = {};
			const quaternions: { [id: string]: [number, number, number, number] } = {};

			// Comprobación de estado de reposo
			let totalVelocity = 0;
			let movingBodies = 0;

			bodies.forEach((b, id) => {
				if (b.mass > 0) {
					// Calcular magnitud de velocidad total (lineal + angular)
					const vel = b.velocity.length() + b.angularVelocity.length();
					totalVelocity += vel;

					if (vel > 0.1) {
						movingBodies++;
					}

					positions[id] = [b.position.x, b.position.y, b.position.z];
					quaternions[id] = [b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w];
				}
			});

			// Lógica de detección de parada
			if (movingBodies === 0 && totalVelocity < 0.1) {
				restFrameCount++;
			} else {
				restFrameCount = 0;
				isResting = false;
			}

			// Si ha estado quieto por ~30 frames y no habíamos notificado
			let messageType = 'UPDATE';
			if (restFrameCount > 30 && !isResting) {
				isResting = true;
				messageType = 'REST_DETECTED';
			}

			self.postMessage({
				type: messageType,
				positions,
				quaternions,
				time: performance.now()
			});
			break;

		case 'APPLY_IMPULSE': {
			const b = bodies.get(params.id);
			if (b) {
				b.wakeUp();
				isResting = false;
				restFrameCount = 0;
				b.applyImpulse(new CANNON.Vec3(...params.impulse), new CANNON.Vec3(...params.point));
			}
			break;
		}

		case 'APPLY_TORQUE': {
			const b = bodies.get(params.id);
			if (b) {
				b.wakeUp();
				isResting = false;
				restFrameCount = 0;
				b.angularVelocity.x += params.torque[0] / b.mass;
				b.angularVelocity.y += params.torque[1] / b.mass;
				b.angularVelocity.z += params.torque[2] / b.mass;
			}
			break;
		}

		case 'RESET_POSITION': {
			const b = bodies.get(params.id);
			if (b) {
				isResting = false;
				restFrameCount = 0;
				b.position.set(params.position[0], params.position[1], params.position[2]);
				b.velocity.set(0, 0, 0);
				b.angularVelocity.set(0, 0, 0);
				b.quaternion.set(0, 0, 0, 1);
				b.wakeUp();
			}
			break;
		}
	}
};