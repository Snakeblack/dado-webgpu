import * as THREE from 'three/webgpu';
import { Config } from '../Config';

/**
 * Gestor de Escena (SceneManager)
 *
 * Responsabilidad: Crear y gestionar los elementos estáticos del mundo 3D (Luces, Suelo, Escenario).
 */
export class SceneManager {
	public scene: THREE.Scene;
	public camera: THREE.PerspectiveCamera;

	constructor() {
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(Config.SCENE_BG_COLOR);

		// Necesitamos un vector temporal para el lookAt ya que Config usa un objeto literal o Vector3
		const lookAtPos = new THREE.Vector3(0, 0, 0);

		this.camera = new THREE.PerspectiveCamera(Config.CAMERA_FOV, 1, 0.1, 100);
		this.camera.position.set(0, 15, 0.1); // Posición fija superior
		this.camera.lookAt(lookAtPos);

		this.setupLights();
		this.setupEnvironment();
	}

	/**
	 * Configura la iluminación de la escena.
	 */
	private setupLights() {
		const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
		hemiLight.position.set(0, 20, 0);
		this.scene.add(hemiLight);

		const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
		dirLight.position.set(5, 10, 5);
		dirLight.castShadow = true;

		dirLight.shadow.mapSize.width = Config.SHADOW_MAP_SIZE;
		dirLight.shadow.mapSize.height = Config.SHADOW_MAP_SIZE;
		dirLight.shadow.camera.left = -10;
		dirLight.shadow.camera.right = 10;
		dirLight.shadow.camera.top = 10;
		dirLight.shadow.camera.bottom = -10;

		this.scene.add(dirLight);
	}

	/**
	 * Configura el entorno físico/visual (Suelo, Bandeja).
	 */
	private setupEnvironment() {
		// Suelo base
		const floorGeo = new THREE.PlaneGeometry(20, 20);
		const floorMat = new THREE.MeshStandardMaterial({
			color: Config.FLOOR_COLOR,
			roughness: 0.9,
			metalness: 0.1
		});
		const floor = new THREE.Mesh(floorGeo, floorMat);
		floor.rotation.x = -Math.PI / 2;
		floor.position.y = -0.01;
		floor.receiveShadow = true;
		this.scene.add(floor);

		// Bandeja de dados
		const trayGeo = new THREE.PlaneGeometry(8, 8);
		const trayMat = new THREE.MeshStandardMaterial({
			color: Config.TRAY_COLOR,
			roughness: 0.5,
			metalness: 0.2
		});
		const tray = new THREE.Mesh(trayGeo, trayMat);
		tray.rotation.x = -Math.PI / 2;
		tray.receiveShadow = true;
		this.scene.add(tray);
	}
}