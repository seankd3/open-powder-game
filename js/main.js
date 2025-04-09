/**
 * OpenPowderGame Main Module
 * Initializes the game and connects all components
 */

// Game configuration
const CONFIG = {
    // Grid dimensions - default 400×300
    GRID_WIDTH: 400,
    GRID_HEIGHT: 300,
    
    // Performance settings
    TARGET_FPS: 60,
    RENDER_INTERVAL_MS: 16, // ~60 FPS
    
    // Version
    VERSION: '1.0.0'
};

// Main game class
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        
        // Create core components
        this.engine = new Engine(CONFIG.GRID_WIDTH, CONFIG.GRID_HEIGHT);
        this.renderer = new Renderer(this.canvas, this.engine);
        this.ui = new UI(this.engine, this.renderer);
        
        // Performance tracking
        this.lastTime = 0;
        this.frameTimes = [];
        this.frameTimesIndex = 0;
        this.frameTimesSize = 60; // Calculate average over 60 frames
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize the game
     */
    init() {
        // Initial render
        this.renderer.render(true);
        
        // Start the simulation and rendering loops
        this.startGameLoop();
        this.startRenderLoop();
        
        // Set initial canvas size
        this.resizeCanvas();
        
        // Add window resize handler
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        console.log(`OpenPowderGame v${CONFIG.VERSION} initialized`);
    }
    
    /**
     * Start the main game loop for physics
     */
    startGameLoop() {
        let lastUpdateTime = 0;
        let accumulatedTime = 0;
        const timeStep = 1000 / CONFIG.TARGET_FPS;
        
        const gameLoop = (currentTime) => {
            if (!lastUpdateTime) lastUpdateTime = currentTime;
            
            // Calculate delta time
            const deltaTime = currentTime - lastUpdateTime;
            lastUpdateTime = currentTime;
            
            // Accumulate time and run as many updates as needed
            accumulatedTime += deltaTime;
            
            // Limit accumulated time to prevent spiral of death
            if (accumulatedTime > 200) {
                accumulatedTime = 200;
            }
            
            // Update simulation based on engine speed
            const updatesPerFrame = Math.ceil(this.engine.speed);
            let performedUpdates = 0;
            
            while (accumulatedTime >= timeStep && performedUpdates < updatesPerFrame) {
                this.engine.update();
                accumulatedTime -= timeStep;
                performedUpdates++;
            }
            
            // Update UI
            this.ui.updateParticleCount();
            
            // Track FPS
            this.calculateFPS(currentTime);
            
            // Request next frame
            requestAnimationFrame(gameLoop);
        };
        
        // Start the loop
        requestAnimationFrame(gameLoop);
    }
    
    /**
     * Start rendering loop (separate from physics for better performance)
     */
    startRenderLoop() {
        const renderLoop = () => {
            this.renderer.render();
            
            // Continue render loop
            setTimeout(renderLoop, CONFIG.RENDER_INTERVAL_MS);
        };
        
        // Start the render loop
        setTimeout(renderLoop, CONFIG.RENDER_INTERVAL_MS);
    }
    
    /**
     * Calculate and update FPS display
     * @param {number} currentTime - Current time from requestAnimationFrame
     */
    calculateFPS(currentTime) {
        if (this.lastTime === 0) {
            this.lastTime = currentTime;
            return;
        }
        
        // Calculate delta time
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Record frame time
        this.frameTimes[this.frameTimesIndex] = deltaTime;
        this.frameTimesIndex = (this.frameTimesIndex + 1) % this.frameTimesSize;
        
        // Calculate average FPS over the recorded frames
        if (this.frameTimes.filter(Boolean).length === this.frameTimesSize) {
            const averageFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimesSize;
            const fps = Math.round(1000 / averageFrameTime);
            
            // Update UI every 10 frames to avoid excessive DOM updates
            if (this.frameTimesIndex % 10 === 0) {
                this.ui.updateFPS(fps);
            }
        }
    }
    
    /**
     * Handle window resize
     */
    resizeCanvas() {
        // Get the container dimensions
        const container = document.querySelector('.main-content');
        
        if (!container) return;
        
        // Calculate maximum canvas size while maintaining aspect ratio
        const containerWidth = container.clientWidth - 150; // Subtract element panel width
        const containerHeight = container.clientHeight;
        
        const aspectRatio = CONFIG.GRID_WIDTH / CONFIG.GRID_HEIGHT;
        
        let width = containerWidth;
        let height = width / aspectRatio;
        
        // If height exceeds container, scale down
        if (height > containerHeight) {
            height = containerHeight;
            width = height * aspectRatio;
        }
        
        // Ensure the canvas CSS dimensions are set (actual rendering resolution doesn't change)
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
    }
}

// Initialize the game when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Create game instance
    window.game = new Game();
    
    console.log('Welcome to OpenPowderGame!');
});
