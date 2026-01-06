import { COLORS, GAME_CONFIG, PLATFORM_COLORS } from './constants';
import { GameState, Particle, FloatingText } from '../types';
import { audioController } from '../utils/audio';

class Platform {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    vx: number = 0; // Horizontal velocity
    passed: boolean = false;
    landedOn: boolean = false;

    constructor(x: number, y: number, width: number, color: string) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = GAME_CONFIG.PLATFORM_HEIGHT;
        this.color = color;
    }
}

class Player {
    x: number = 0;
    y: number = 0;
    vx: number = 0;
    vy: number = 0;
    width: number = GAME_CONFIG.PLAYER_SIZE;
    height: number = GAME_CONFIG.PLAYER_SIZE;
    color: string = COLORS.WHITE;
    jumps: number = 0;
    currentPlatform: Platform | null = null;
    
    // Juice
    scaleX: number = 1;
    scaleY: number = 1;
    targetScaleX: number = 1;
    targetScaleY: number = 1;
    
    constructor(startX: number, startY: number) {
        this.x = startX;
        this.y = startY;
    }

    update() {
        // Physics
        if (this.currentPlatform) {
            // Stick to platform
            this.vy = 0;
            this.y = this.currentPlatform.y - this.height/2;
            
            // Check if walked off (or platform moved away)
            // Use a small buffer zone for edge tolerance
            const edgeTolerance = 5;
            if (this.x < this.currentPlatform.x - edgeTolerance || 
                this.x > this.currentPlatform.x + this.currentPlatform.width + edgeTolerance) {
                this.currentPlatform = null;
            }
        } else {
            // Gravity
            this.vy += GAME_CONFIG.GRAVITY;
            this.y += this.vy;
        }

        // Scaling Juice recovery
        this.scaleX += (this.targetScaleX - this.scaleX) * 0.2;
        this.scaleY += (this.targetScaleY - this.scaleY) * 0.2;

        // Reset target scale slowly
        this.targetScaleX = 1 + Math.sin(Date.now() / 100) * 0.05; // Idle breathing
        this.targetScaleY = 1 + Math.cos(Date.now() / 100) * 0.05;

        // Velocity stretch (only when moving vertically)
        if (Math.abs(this.vy) > 1) {
            this.scaleY = 1 + Math.abs(this.vy) * 0.05;
            this.scaleX = 1 - Math.abs(this.vy) * 0.03;
        }
    }

    jump(force: number) {
        this.currentPlatform = null; // Detach from platform
        this.vy = force;
        this.jumps++;
        // Juice: Squash on jump start
        this.scaleX = 0.6;
        this.scaleY = 1.4;
        audioController.playJump();
    }

    land(platform: Platform) {
        this.currentPlatform = platform;
        this.vy = 0;
        this.jumps = 0;
        this.y = platform.y - this.height/2;
        // Juice: Squash on impact
        this.scaleX = 1.5;
        this.scaleY = 0.5;
        audioController.playLand();
    }
}

export class GameEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private rafId: number = 0;
    private lastTime: number = 0;
    
    // Callbacks
    private onScoreUpdate: (score: number) => void;
    private onGameStateChange: (state: GameState) => void;
    private onFeverChange: (fever: boolean) => void;
    private onComboChange: (combo: number) => void;

    // Game Objects
    private player: Player;
    private platforms: Platform[] = [];
    private particles: Particle[] = [];
    private floatingTexts: FloatingText[] = [];
    
    // State
    private state: GameState = 'start';
    private score: number = 0;
    private gameSpeed: number = GAME_CONFIG.MOVE_SPEED_INITIAL;
    private shakeTimer: number = 0;
    private perfectStreak: number = 0;
    private isFever: boolean = false;
    private viewportWidth: number = 0;
    private viewportHeight: number = 0;

    constructor(
        canvas: HTMLCanvasElement, 
        onScoreUpdate: (score: number) => void,
        onGameStateChange: (state: GameState) => void,
        onFeverChange: (fever: boolean) => void,
        onComboChange: (combo: number) => void
    ) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false })!;
        this.onScoreUpdate = onScoreUpdate;
        this.onGameStateChange = onGameStateChange;
        this.onFeverChange = onFeverChange;
        this.onComboChange = onComboChange;

        this.viewportWidth = window.innerWidth;
        this.viewportHeight = window.innerHeight;

        this.player = new Player(0, 0); // Pos set in resetGame
        
        // Input bindings
        this.handleInput = this.handleInput.bind(this);
        window.addEventListener('keydown', this.handleInput);
        window.addEventListener('touchstart', this.handleInput, { passive: false });
        window.addEventListener('mousedown', this.handleInput);
    }

    resize() {
        this.viewportWidth = window.innerWidth;
        this.viewportHeight = window.innerHeight;
        this.canvas.width = this.viewportWidth;
        this.canvas.height = this.viewportHeight;
        
        // On resize, we might want to ensure the base platform logic stays valid if mid-game,
        // but for now simple resize is fine.
    }

    startLoop() {
        this.lastTime = performance.now();
        this.rafId = requestAnimationFrame(this.loop.bind(this));
    }

    cleanup() {
        cancelAnimationFrame(this.rafId);
        window.removeEventListener('keydown', this.handleInput);
        window.removeEventListener('touchstart', this.handleInput);
        window.removeEventListener('mousedown', this.handleInput);
    }

    startGame() {
        this.resetGame();
        this.state = 'playing';
        this.onGameStateChange('playing');
        audioController.init();
    }

    resetGame() {
        this.score = 0;
        this.onScoreUpdate(0);
        this.gameSpeed = GAME_CONFIG.MOVE_SPEED_INITIAL;
        this.perfectStreak = 0;
        this.onComboChange(0);
        this.isFever = false;
        this.onFeverChange(false);
        this.particles = [];
        this.floatingTexts = [];
        
        this.player = new Player(this.viewportWidth / 2, this.viewportHeight * 0.8);
        this.player.color = COLORS.NEON_CYAN;

        // Init platforms
        this.platforms = [];
        
        // Base platform position
        const basePlatformY = this.viewportHeight * 0.8 + 40;

        // Base platform
        const basePlat = new Platform(
            this.viewportWidth / 2 - 100, 
            basePlatformY, 
            200, 
            COLORS.NEON_MAGENTA
        );
        this.platforms.push(basePlat);
        
        // Make the player stand on the first platform initially if in position
        this.player.currentPlatform = basePlat;
        this.player.y = basePlat.y - this.player.height/2;

        // Spawn initial set relative to base platform to ensure consistent gap
        for (let i = 1; i < 6; i++) {
            this.spawnPlatform(basePlatformY - (i * GAME_CONFIG.PLATFORM_SPACING));
        }
    }

    spawnPlatform(y: number) {
        const width = GAME_CONFIG.PLATFORM_WIDTH_MIN + Math.random() * (GAME_CONFIG.PLATFORM_WIDTH_MAX - GAME_CONFIG.PLATFORM_WIDTH_MIN);
        // Random X position
        const x = Math.random() * (this.viewportWidth - width);
        const color = PLATFORM_COLORS[Math.floor(Math.random() * PLATFORM_COLORS.length)];
        const p = new Platform(x, y, width, color);
        // We'll attach velocity to platform for horizontal movement
        p.vx = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 3);
        this.platforms.push(p);
    }

    handleInput(e: Event) {
        if (e.type === 'touchstart') e.preventDefault(); // Prevent scrolling
        
        if (this.state === 'start') {
            // Handled by UI mostly, but backup
        } else if (this.state === 'playing') {
             // Jump logic
             if (this.player.jumps < 2) {
                 const force = this.player.jumps === 0 ? GAME_CONFIG.JUMP_FORCE : GAME_CONFIG.DOUBLE_JUMP_FORCE;
                 this.player.jump(force);
                 
                 // Spawn jump particles
                 this.createParticles(this.player.x, this.player.y + this.player.height/2, 5, COLORS.WHITE);
             }
        } else if (this.state === 'gameover') {
            // Handled by UI
        }
    }

    loop(time: number) {
        const deltaTime = (time - this.lastTime) / 16.67; // Normalize to 60fps
        this.lastTime = time;

        if (this.state === 'playing') {
            this.update(deltaTime);
        }
        this.draw();

        this.rafId = requestAnimationFrame(this.loop.bind(this));
    }

    update(dt: number) {
        const speedMultiplier = (1 + (this.score * 0.05));

        // Update Platforms (Horizontal Movement)
        this.platforms.forEach(p => {
            if (p.vx !== 0) {
                const moveX = p.vx * speedMultiplier;
                p.x += moveX;
                
                // CRITICAL FIX: Move player if they are standing on this platform
                if (this.player.currentPlatform === p) {
                    this.player.x += moveX;
                }

                // Bounce off walls
                if (p.x <= 0) {
                    p.x = 0;
                    p.vx *= -1;
                } else if (p.x + p.width >= this.viewportWidth) {
                    p.x = this.viewportWidth - p.width;
                    p.vx *= -1;
                }
            }
        });

        // Update Player (Physics & Scaling)
        this.player.update();

        // World Scrolling (The player stays at bottom 20% effectively)
        // If player goes above 60% of screen, move everything down
        const threshold = this.viewportHeight * 0.6;
        if (this.player.y < threshold) {
            const diff = threshold - this.player.y;
            this.player.y = threshold;
            
            // Move platforms down
            this.platforms.forEach(p => {
                p.y += diff;
            });

            // Cleanup and Spawn
            if (this.platforms[0].y > this.viewportHeight + 100) {
                this.platforms.shift();
                const lastP = this.platforms[this.platforms.length - 1];
                this.spawnPlatform(lastP.y - GAME_CONFIG.PLATFORM_SPACING);
            }
        }

        // Collision Detection (Only needed if falling or not attached to platform)
        if (this.player.vy > 0 && !this.player.currentPlatform) { 
            for (let p of this.platforms) {
                // AABB Check
                const pLeft = p.x;
                const pRight = p.x + p.width;
                const playerBottom = this.player.y + this.player.height/2;
                const playerLeft = this.player.x - this.player.width/4; // Forgiving hitbox
                const playerRight = this.player.x + this.player.width/4;
                
                // Check Y overlap (pass through top)
                // We use prevY to ensure we don't tunnel through in one frame if moving fast
                const prevY = this.player.y - this.player.vy;
                
                // Condition: Was above platform last frame, and is below/on it this frame
                const crossedPlatform = (prevY + this.player.height/2 <= p.y + 15) && (playerBottom >= p.y);

                if (crossedPlatform && playerRight > pLeft && playerLeft < pRight) {
                    // Landed
                    this.player.land(p);
                    
                    if (!p.landedOn) {
                        p.landedOn = true;
                        this.score++;
                        this.onScoreUpdate(this.score * (this.isFever ? GAME_CONFIG.FEVER_MULTIPLIER : 1));
                        
                        // Check Perfect
                        const pCenter = p.x + p.width/2;
                        const dist = Math.abs(this.player.x - pCenter);
                        
                        if (dist < GAME_CONFIG.PERFECT_TOLERANCE) {
                            this.triggerPerfect(p);
                        } else {
                            if (this.perfectStreak > 0) {
                                this.perfectStreak = 0;
                                this.onComboChange(0);
                            }
                            if (this.isFever) {
                                this.isFever = false;
                                this.onFeverChange(false);
                            }
                        }
                    }
                    break;
                }
            }
        }

        // Fall off screen
        if (this.player.y > this.viewportHeight + 100) {
            this.gameOver();
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= 0.02;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // Gravity
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Update Text
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const t = this.floatingTexts[i];
            t.life -= 0.02;
            t.y -= 1;
            t.scale += 0.01;
            if (t.life <= 0) this.floatingTexts.splice(i, 1);
        }

        // Screenshake decay
        if (this.shakeTimer > 0) this.shakeTimer--;
    }

    triggerPerfect(platform: Platform) {
        this.perfectStreak++;
        this.onComboChange(this.perfectStreak);
        audioController.playPerfect();
        
        // Visuals
        this.player.color = platform.color;
        this.shakeTimer = 10;
        this.createParticles(this.player.x, this.player.y + this.player.height/2, 20, platform.color);
        this.floatingTexts.push({
            x: this.player.x,
            y: this.player.y - 50,
            text: 'PERFECT!',
            life: 1.0,
            color: platform.color,
            scale: 1
        });

        if (this.perfectStreak >= GAME_CONFIG.FEVER_THRESHOLD) {
            this.isFever = true;
            this.onFeverChange(true);
        }
    }

    createParticles(x: number, y: number, count: number, color: string) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10 - 5,
                life: 1.0,
                maxLife: 1.0,
                color: color,
                size: Math.random() * 6 + 2,
                type: 'confetti'
            });
        }
    }

    gameOver() {
        this.state = 'gameover';
        this.onGameStateChange('gameover');
        audioController.playShatter();
        // Shatter particles
        this.createParticles(this.player.x, this.player.y, 50, this.player.color);
    }

    draw() {
        // Clear
        this.ctx.fillStyle = COLORS.BACKGROUND;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();

        // Screen Shake
        if (this.shakeTimer > 0) {
            const dx = (Math.random() - 0.5) * 10;
            const dy = (Math.random() - 0.5) * 10;
            this.ctx.translate(dx, dy);
        }

        // Draw Platforms
        this.platforms.forEach(p => {
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = p.color;
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, p.width, p.height);
            
            // Platform inner detail
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
            this.ctx.fillRect(p.x, p.y, p.width, 2);
        });

        // Draw Trail (if fever or moving fast)
        if (this.state === 'playing') {
             // Simple Ghost trail logic could go here, but for perf lets just use particles
        }

        // Draw Particles
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        });

        // Draw Player (Jelly)
        if (this.state !== 'gameover') {
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = this.player.color;
            this.ctx.fillStyle = this.player.color;
            
            const w = this.player.width * this.player.scaleX;
            const h = this.player.height * this.player.scaleY;
            const x = this.player.x - w/2;
            const y = this.player.y - h/2;

            // Rounded rectangle for Jelly look
            this.ctx.beginPath();
            this.ctx.roundRect(x, y, w, h, 10);
            this.ctx.fill();
            
            // Cute eyes
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = '#000';
            const eyeOffsetX = w * 0.2;
            const eyeOffsetY = h * 0.2;
            this.ctx.beginPath();
            this.ctx.arc(this.player.x - eyeOffsetX, this.player.y - eyeOffsetY, 3, 0, Math.PI*2);
            this.ctx.arc(this.player.x + eyeOffsetX, this.player.y - eyeOffsetY, 3, 0, Math.PI*2);
            this.ctx.fill();
        }

        // Draw Floating Text
        this.floatingTexts.forEach(t => {
            this.ctx.save();
            this.ctx.translate(t.x, t.y);
            this.ctx.scale(t.scale, t.scale);
            this.ctx.fillStyle = t.color;
            this.ctx.font = '900 30px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = t.color;
            this.ctx.shadowBlur = 10;
            this.ctx.fillText(t.text, 0, 0);
            this.ctx.restore();
        });

        this.ctx.restore();
    }
}