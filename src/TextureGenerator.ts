import * as THREE from 'three/webgpu';

/**
 * Genera texturas proceduales para las caras de un dado.
 * Usa Canvas API para dibujar puntos (pips) negros sobre fondo blanco/hueso.
 */
export class TextureGenerator {
	private size: number = 512; // Resolución de la textura

	constructor(size: number = 512) {
		this.size = size;
	}

	createDiceTexture(number: number): THREE.CanvasTexture {
		const canvas = document.createElement('canvas');
		canvas.width = this.size;
		canvas.height = this.size;
		const ctx = canvas.getContext('2d');

		if (!ctx) {
			throw new Error('No se pudo obtener el contexto 2D del canvas');
		}

		// 1. Fondo: Color hueso con un poco de ruido sutil si fuera posible,
		// pero por ahora un color sólido limpio.
		ctx.fillStyle = '#fdfbf7'; // Hueso muy claro
		ctx.fillRect(0, 0, this.size, this.size);

		// Opcional: Añadir un borde sutil para dar sensación de profundidad en los bordes
		ctx.strokeStyle = '#e8e4dc';
		ctx.lineWidth = this.size * 0.05;
		ctx.strokeRect(0, 0, this.size, this.size);

		// 2. Dibujar Puntos (Pips)
		ctx.fillStyle = '#1a1a1a'; // Negro casi puro
		const radius = this.size * 0.1; // Radio de los puntos
		const center = this.size / 2;
		const offset = this.size * 0.25;

		// Helper para dibujar circulos
		const drawPip = (x: number, y: number) => {
			ctx.beginPath();
			ctx.arc(x, y, radius, 0, Math.PI * 2);
			ctx.fill();
			// Brillo especular falso en el punto para volumen
			ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
			ctx.beginPath();
			ctx.arc(x - radius * 0.2, y - radius * 0.2, radius * 0.3, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = '#1a1a1a';
		};

		// Lógica de posicionamiento estándar de dados
		// Centro
		if (number === 1 || number === 3 || number === 5) {
			drawPip(center, center);
		}

		// Esquina superior izquierda y inferior derecha
		if (number > 1 && number < 7) {
			drawPip(center - offset, center - offset);
			drawPip(center + offset, center + offset);
		}

		// Esquina superior derecha y inferior izquierda
		if (number === 4 || number === 5 || number === 6) {
			drawPip(center + offset, center - offset);
			drawPip(center - offset, center + offset);
		}

		// Centro izquierda y centro derecha (solo para el 6)
		if (number === 6) {
			drawPip(center - offset, center);
			drawPip(center + offset, center);
		}

		const texture = new THREE.CanvasTexture(canvas);
		texture.colorSpace = THREE.SRGBColorSpace;
		return texture;
	}
}