import * as THREE from 'three/webgpu';
import { PhysicsService } from './services/PhysicsService';
import { TextureGenerator } from './TextureGenerator';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Config } from './Config';

/**
 * Clase Dado (Dice)
 * Representa el objeto 3D del dado, su geometría y lógica de cálculo de resultados.
 */
export class Dice {
	public mesh: THREE.Mesh;
	private id: string = Config.DICE_ID;
	private physicsService: PhysicsService;

	// Mapeo de vectores locales ("Arriba") a valores de la cara.
	// Cuando el dado está alineado con los ejes:
	private faceNormals = [
		{ normal: new THREE.Vector3(0, 1, 0), value: 2 }, // +Y Arriba -> 2
		{ normal: new THREE.Vector3(0, -1, 0), value: 5 }, // -Y Abajo -> 5
		{ normal: new THREE.Vector3(1, 0, 0), value: 3 }, // +X Derecha -> 3
		{ normal: new THREE.Vector3(-1, 0, 0), value: 4 }, // -X Izquierda -> 4
		{ normal: new THREE.Vector3(0, 0, 1), value: 1 }, // +Z Frente -> 1
		{ normal: new THREE.Vector3(0, 0, -1), value: 6 } // -Z Atrás -> 6
	];

	constructor(physicsService: PhysicsService, scene: THREE.Scene, position: THREE.Vector3Like) {
		this.physicsService = physicsService;

		const size = Config.DICE_SIZE;
		const radius = Config.DICE_RADIUS;

		const geometry = new RoundedBoxGeometry(size, size, size, 4, radius);
		const texGen = new TextureGenerator(512);

		// Materiales para cada cara (orden estándar de Three.js BoxGeometry)
		const materials = [
			this.createFaceMaterial(texGen.createDiceTexture(3)), // Derecha (+x)
			this.createFaceMaterial(texGen.createDiceTexture(4)), // Izquierda (-x)
			this.createFaceMaterial(texGen.createDiceTexture(2)), // Arriba (+y)
			this.createFaceMaterial(texGen.createDiceTexture(5)), // Abajo (-y)
			this.createFaceMaterial(texGen.createDiceTexture(1)), // Frente (+z)
			this.createFaceMaterial(texGen.createDiceTexture(6)) // Atrás (-z)
		];

		this.mesh = new THREE.Mesh(geometry, materials);
		this.mesh.castShadow = true;
		this.mesh.receiveShadow = true;
		scene.add(this.mesh);

		physicsService.addBody(
			this.id,
			this.mesh,
			Config.DICE_MASS,
			'box',
			[size / 2, size / 2, size / 2],
			[position.x, position.y, position.z]
		);
	}

	private createFaceMaterial(map: THREE.Texture): THREE.MeshStandardMaterial {
		return new THREE.MeshStandardMaterial({
			map: map,
			color: Config.DICE_COLOR,
			roughness: 0.2,
			metalness: 0.0
		});
	}

	/**
	 * Lanza el dado aplicando una fuerza y torque aleatorios.
	 */
	public roll(): void {
		// Reiniciar posición arriba antes de lanzar
		this.physicsService.resetBody(this.id, [0, 5, 0]);

		const force = 8 + Math.random() * 5;
		const torque = 15;

		// Impulso lineal aleatorio
		this.physicsService.applyImpulse(
			this.id,
			[(Math.random() - 0.5) * force, force * 0.5, (Math.random() - 0.5) * force],
			[0, 0, 0]
		);

		// Torque angular aleatorio
		this.physicsService.applyTorque(this.id, [
			(Math.random() - 0.5) * torque,
			(Math.random() - 0.5) * torque,
			(Math.random() - 0.5) * torque
		]);
	}

	/**
	 * Calcula qué cara del dado está mirando hacia ARRIBA (World Y+) basándose en el cuaternión.
	 * @param quaternionArray Array del cuaternión [x, y, z, w]
	 */
	public getResult(quaternionArray: [number, number, number, number]): number {
		const q = new THREE.Quaternion(...quaternionArray);
		let maxDot = -Infinity;
		let result = 1;
		const worldUp = new THREE.Vector3(0, 1, 0);

		this.faceNormals.forEach((face) => {
			// Rotar la normal local de la cara al espacio mundial
			const worldNormal = face.normal.clone().applyQuaternion(q);
			// Producto punto con Vector Arriba (0,1,0)
			const dot = worldNormal.dot(worldUp);
			if (dot > maxDot) {
				maxDot = dot;
				result = face.value;
			}
		});

		return result;
	}
}