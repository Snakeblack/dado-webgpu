/**
 * Configuración central del juego.
 * Contiene todas las constantes y parámetros ajustables del sistema.
 */
export const Config = {
	// Configuración de la Escena
	SCENE_BG_COLOR: 0x1a1a1a,

	// Configuración de la Cámara
	CAMERA_FOV: 45,
	CAMERA_LOOK_AT: { x: 0, y: 0, z: 0 }, // Usamos objeto literal para evitar dependencia dura de THREE aquí si fuera posible, pero Vector3 está bien.

	// Configuración de Física
	GRAVITY: [0, -9.82, 0] as [number, number, number],
	PHYSICS_RATE: 1 / 60,
	PHYSICS_DELAY: (1000 / 60) * 2, // Retraso del buffer de interpolación (2 frames)

	// Configuración del Dado
	DICE_SIZE: 0.5,
	DICE_RADIUS: 0.08,
	DICE_MASS: 1,
	DICE_ID: 'dice_1',
	DICE_INIT_POS: { x: 0, y: 3, z: 0 },
	DICE_COLOR: 0xeeeeee,

	// Entorno
	FLOOR_COLOR: 0x111111,
	TRAY_COLOR: 0x333333,
	WALL_HEIGHT: 10,

	// Sombras
	SHADOW_MAP_SIZE: 2048
};