import './style.css';
import { Config } from './Config';
import { RendererService } from './services/RendererService';
import { SceneManager } from './services/SceneManager';
import { PhysicsService } from './services/PhysicsService';
import { Dice } from './Dice';
import { GameLoop } from './core/GameLoop';
import Stats from 'three/addons/libs/stats.module.js';

/**
 * App (Raíz de Composición)
 *
 * Clase principal que inicializa y conecta todos los servicios y entidades del juego.
 * Mantiene la lógica limpia y centralizada.
 */
class App {
	private rendererService: RendererService;
	private sceneManager: SceneManager;
	private physicsService: PhysicsService;
	private gameLoop: GameLoop;
	private dice: Dice;

	// Elementos de UI
	private resultOverlay: HTMLElement | null;
	private rollButton: HTMLElement | null;

	constructor() {
		// 1. Inicializar Servicios
		this.sceneManager = new SceneManager();
		this.rendererService = new RendererService('canvas-wrapper', this.sceneManager.camera);
		this.physicsService = new PhysicsService();

		// 2. Inicializar Objetos de Juego
		this.physicsService.addFloor();
		this.physicsService.addWalls(10);
		this.dice = new Dice(this.physicsService, this.sceneManager.scene, Config.DICE_INIT_POS);

		// 3. Inicializar UI y Stats
		this.resultOverlay = document.getElementById('result-overlay');
		this.rollButton = document.getElementById('roll-btn');
		const stats = new Stats();
		stats.dom.style.position = 'absolute';
		stats.dom.style.top = '10px';
		stats.dom.style.left = '10px';
		document.getElementById('canvas-wrapper')?.appendChild(stats.dom);

		// 4. Inicializar Bucle de Juego
		this.gameLoop = new GameLoop(this.rendererService, this.physicsService, this.sceneManager.scene, stats);

		this.setupEvents();
	}

	/**
	 * Configura los eventos de interacción y lógica de juego.
	 */
	private setupEvents() {
		// Acción de Lanzar
		if (this.rollButton) {
			this.rollButton.addEventListener('click', () => {
				this.hideResult();
				this.dice.roll();
			});
		}

		// Eventos de Física (Detección de Reposo)
		this.physicsService.onDiceRest((id, quat) => {
			if (id === Config.DICE_ID) {
				const value = this.dice.getResult(quat);
				this.showResult(value);
			}
		});
	}

	private hideResult() {
		if (this.resultOverlay) {
			this.resultOverlay.classList.remove('show');
		}
	}

	private showResult(value: number) {
		if (this.resultOverlay) {
			this.resultOverlay.innerText = value.toString();
			this.resultOverlay.classList.add('show');
			console.log('[App] Resultado:', value);
		}
	}

	public run() {
		this.gameLoop.start();
	}
}

// Bootstrap (Arranque)
const app = new App();
app.run();
