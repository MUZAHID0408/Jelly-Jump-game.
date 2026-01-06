export const COLORS = {
    BACKGROUND: '#1a0b2e',
    NEON_CYAN: '#00f3ff',
    NEON_MAGENTA: '#ff00ff',
    NEON_LIME: '#00ff9d',
    NEON_YELLOW: '#ffea00',
    WHITE: '#ffffff',
    SHADOW: 'rgba(0,0,0,0.5)',
};

export const PLATFORM_COLORS = [
    COLORS.NEON_CYAN,
    COLORS.NEON_MAGENTA,
    COLORS.NEON_LIME,
    COLORS.NEON_YELLOW,
];

export const GAME_CONFIG = {
    GRAVITY: 0.5,
    JUMP_FORCE: -15,
    DOUBLE_JUMP_FORCE: -12,
    MOVE_SPEED_INITIAL: 3,
    MOVE_SPEED_MAX: 12,
    PLATFORM_SPACING: 150, // Reduced from 200 to 150 to ensure reachability
    PLATFORM_WIDTH_MIN: 80,
    PLATFORM_WIDTH_MAX: 180,
    PLATFORM_HEIGHT: 20,
    PLAYER_SIZE: 40,
    PERFECT_TOLERANCE: 15, // Pixels from center to count as perfect
    FEVER_THRESHOLD: 3, // Consecutive perfects for fever
    FEVER_MULTIPLIER: 2,
};