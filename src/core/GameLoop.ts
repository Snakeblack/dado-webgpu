import * as THREE from 'three/webgpu';
import { RendererService } from '../services/RendererService';
import { PhysicsService } from '../services/PhysicsService';
import Stats from 'three/addons/libs/stats.module.js';

/**
 * Bucle de Juego (GameLoop)
 *
 * Responsabilidad: Orquestar el bucle de renderizado, estadísticas y actualizaciones.
 */
export class GameLoop {
	private rendererService: RendererService;
	private physicsService: PhysicsService;
	private scene: THREE.Scene;
	private clock: THREE.Clock;
	private stats: Stats;

	constructor(rendererService: RendererService, physicsService: PhysicsService, scene: THREE.Scene, stats: Stats) {
		this.rendererService = rendererService;
		this.physicsService = physicsService;
		this.scene = scene;
		this.stats = stats;
		this.clock = new THREE.Clock();
	}

	/**
	 * Inicia el bucle de animación.
	 */
	public start() {
		this.rendererService.setAnimationLoop(() => {
			this.tick();
		});
	}

	/**
	 * Se ejecuta en cada frame (tick).
	 */
	private tick() {
		const dt = this.clock.getDelta();

		this.stats.begin();

		// 1. Paso de Física
		this.physicsService.update(dt);

		// 2. Sincronización Visual (Interpolación)
		this.physicsService.syncVisuals();

		// 3. Renderizado
		this.rendererService.render(this.scene);

		this.stats.end();
	}
}