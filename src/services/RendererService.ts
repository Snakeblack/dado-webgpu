import * as THREE from 'three/webgpu';

/**
 * Servicio de Renderizado (RendererService)
 *
 * Responsabilidad: Gestionar el ciclo de vida del WebGPU Renderer, el redimensionamiento
 * automático y el montaje en el DOM.
 */
export class RendererService {
	public renderer: THREE.WebGPURenderer;
	private container: HTMLElement;
	private camera: THREE.PerspectiveCamera;

	/**
	 * Inicializa el servicio de renderizado.
	 * @param containerId ID del elemento DOM contenedor.
	 * @param camera Instancia de la cámara para actualizar su proyección al redimensionar.
	 */
	constructor(containerId: string, camera: THREE.PerspectiveCamera) {
		const el = document.getElementById(containerId);
		if (!el) throw new Error(`No se encontró el contenedor ${containerId}`);
		this.container = el;
		this.camera = camera;

		this.renderer = new THREE.WebGPURenderer({ antialias: true, forceWebGL: false });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.domElement.id = 'webgpu-canvas';

		// Montaje automático
		this.container.appendChild(this.renderer.domElement);

		// Observador de redimensionamiento
		this.initResizeObserver();
	}

	/**
	 * Configura el observador para ajustar el renderizador al tamaño del contenedor padre.
	 */
	private initResizeObserver() {
		const resizeObserver = new ResizeObserver(() => {
			const width = this.container.clientWidth;
			const height = this.container.clientHeight;

			this.camera.aspect = width / height;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize(width, height);
		});
		resizeObserver.observe(this.container);
	}

	/**
	 * Renderiza la escena actual.
	 * @param scene Escena de Three.js a renderizar.
	 */
	public render(scene: THREE.Scene) {
		this.renderer.render(scene, this.camera);
	}

	/**
	 * Inicia el bucle de animación del renderizador WebGPU.
	 * @param callback Función que se ejecutará en cada frame.
	 */
	public setAnimationLoop(callback: (time: number) => void) {
		this.renderer.setAnimationLoop(callback);
	}
}