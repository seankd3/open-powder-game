/**
 * OpenPowderGame Engine Module
 * Core simulation engine that handles particle updates and physics
 */

class Engine {
    /**
     * Create a new simulation engine
     * @param {number} width - Width of the simulation grid
     * @param {number} height - Height of the simulation grid
     */
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = this._createGrid();
        this.active = true;  // Flag to track if simulation is running
        this.gravity = 'down'; // Default gravity direction
        this.speed = 1; // Simulation speed multiplier
        this.updateCount = 0; // Track how many updates we've done
        
        // Initialize undo/redo stacks
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = 10;
        
        // Particle stats
        this.particleCount = 0;
        
        // Performance tracking
        this.activeRegions = new Set(); // Set of active grid cells
    }
    
    /**
     * Create a new empty grid
     * @returns {Array} 2D array representing the grid
     * @private
     */
    _createGrid() {
        return Array(this.height).fill().map(() => Array(this.width).fill(null));
    }
    
    /**
     * Reset the simulation with a new empty grid
     */
    reset() {
        // Save current state for undo if needed
        this._saveUndoState();
        
        this.grid = this._createGrid();
        this.particleCount = 0;
        this.activeRegions.clear();
    }
    
    /**
     * Save the current grid state for undo
     * @private
     */
    _saveUndoState() {
        // Don't save if we just restored a state (would be redundant)
        if (this._skipNextUndo) {
            this._skipNextUndo = false;
            return;
        }
        
        // Create a compressed representation of the current grid state
        const compressedGrid = this.exportCompressedState();
        
        // Save to undo stack
        this.undoStack.push(compressedGrid);
        
        // Limit stack size
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
        
        // Clear redo stack since we've made a new change
        this.redoStack = [];
    }
    
    /**
     * Undo the last action
     * @returns {boolean} True if successfully undone
     */
    undo() {
        if (this.undoStack.length === 0) return false;
        
        // Move current state to redo stack
        const currentState = this.exportCompressedState();
        this.redoStack.push(currentState);
        
        // Restore previous state
        const previousState = this.undoStack.pop();
        this._skipNextUndo = true; // Don't save this restoration as an undo step
        this.importCompressedState(previousState);
        
        return true;
    }
    
    /**
     * Redo a previously undone action
     * @returns {boolean} True if successfully redone
     */
    redo() {
        if (this.redoStack.length === 0) return false;
        
        // Move current state to undo stack
        const currentState = this.exportCompressedState();
        this.undoStack.push(currentState);
        
        // Restore next state
        const nextState = this.redoStack.pop();
        this._skipNextUndo = true; // Don't save this restoration as an undo step
        this.importCompressedState(nextState);
        
        return true;
    }
    
    /**
     * Create a compressed representation of the current grid state
     * @returns {Object} Compressed state object
     */
    exportCompressedState() {
        const particles = [];
        
        // Only store non-empty cells
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const particle = this.grid[y][x];
                if (particle) {
                    // Store minimal needed information
                    particles.push({
                        x, y, 
                        type: particle.type,
                        // Preserve any special properties needed for behavior
                        ...(particle.life !== undefined && { life: particle.life }),
                        ...(particle.burning !== undefined && { burning: particle.burning }),
                        ...(particle.corrosion !== undefined && { corrosion: particle.corrosion })
                    });
                }
            }
        }
        
        return {
            particles,
            width: this.width,
            height: this.height,
            count: this.particleCount
        };
    }
    
    /**
     * Import a compressed state into the current grid
     * @param {Object} state - Compressed state object
     */
    importCompressedState(state) {
        // Reset grid
        this.grid = this._createGrid();
        this.particleCount = state.count;
        this.activeRegions.clear();
        
        // Add particles back
        for (const p of state.particles) {
            this.grid[p.y][p.x] = {
                type: p.type,
                x: p.x,
                y: p.y,
                updated: false,
                ...(p.life !== undefined && { life: p.life }),
                ...(p.burning !== undefined && { burning: p.burning }),
                ...(p.corrosion !== undefined && { corrosion: p.corrosion })
            };
            
            // Mark region as active
            this._markRegionActive(p.x, p.y);
        }
    }
    
    /**
     * Update the simulation by one step
     * @returns {number} Number of particles updated
     */
    update() {
        if (!this.active) return 0;
        
        // Reset updated flags
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x]) {
                    this.grid[y][x].updated = false;
                }
            }
        }
        
        // Track how many particles were updated
        let updatedCount = 0;
        
        // Determine update order based on gravity direction
        let updateOrder;
        if (this.gravity === 'down') {
            // Bottom to top, left to right
            updateOrder = this._getBottomToTopOrder();
        } else if (this.gravity === 'up') {
            // Top to bottom, left to right
            updateOrder = this._getTopToBottomOrder();
        } else if (this.gravity === 'left') {
            // Left to right, top to bottom
            updateOrder = this._getLeftToRightOrder();
        } else if (this.gravity === 'right') {
            // Right to left, top to bottom
            updateOrder = this._getRightToLeftOrder();
        } else {
            // No gravity, random order
            updateOrder = this._getRandomOrder();
        }
        
        // Track new active regions
        const newActiveRegions = new Set();
        
        // Process particles in determined order
        for (const [x, y] of updateOrder) {
            const particle = this.grid[y][x];
            
            // Skip empty cells or already updated particles
            if (!particle || particle.updated) continue;
            
            // Get element behavior
            const elementType = Particles.ELEMENTS[particle.type];
            if (!elementType) continue;
            
            // Consider this particle updated
            particle.updated = true;
            updatedCount++;
            
            // Check for interactions with neighbors
            if (Interactions.processParticleInteractions(this, x, y)) {
                this._markRegionActive(x, y, newActiveRegions);
                continue; // Skip further updates if interaction occurred
            }
            
            // Update according to element behavior
            if (elementType.update && elementType.update(this, x, y)) {
                this._markRegionActive(x, y, newActiveRegions);
            }
            
            // If static and no update occurred, remove from active regions
            if (elementType.static && this.activeRegions.has(`${x},${y}`)) {
                // Only keep it active if it's a special element that needs constant updates
                if (!(elementType.state === 'special')) {
                    this.activeRegions.delete(`${x},${y}`);
                }
            }
        }
        
        // Add new active regions to the tracking set
        for (const region of newActiveRegions) {
            this.activeRegions.add(region);
        }
        
        this.updateCount++;
        return updatedCount;
    }
    
    /**
     * Mark a region and its surroundings as active
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Set} [targetSet] - Optional target set to add to
     * @private
     */
    _markRegionActive(x, y, targetSet = this.activeRegions) {
        // Mark the cell itself
        targetSet.add(`${x},${y}`);
        
        // Mark adjacent cells as active (for next update)
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                    targetSet.add(`${nx},${ny}`);
                }
            }
        }
    }
    
    /**
     * Get update order from bottom to top
     * @returns {Array} Array of [x, y] coordinates
     * @private
     */
    _getBottomToTopOrder() {
        const coords = [];
        
        // If we have active regions, prioritize them
        if (this.activeRegions.size > 0 && this.updateCount % 5 !== 0) {
            // Only process active regions 4 out of 5 frames
            for (const region of this.activeRegions) {
                const [x, y] = region.split(',').map(Number);
                coords.push([x, y]);
            }
        } else {
            // Full update every 5th frame or if no active regions
            for (let y = this.height - 1; y >= 0; y--) {
                for (let x = 0; x < this.width; x++) {
                    coords.push([x, y]);
                }
            }
        }
        
        return coords;
    }
    
    /**
     * Get update order from top to bottom
     * @returns {Array} Array of [x, y] coordinates
     * @private
     */
    _getTopToBottomOrder() {
        const coords = [];
        
        // If we have active regions, prioritize them
        if (this.activeRegions.size > 0 && this.updateCount % 5 !== 0) {
            for (const region of this.activeRegions) {
                const [x, y] = region.split(',').map(Number);
                coords.push([x, y]);
            }
        } else {
            // Full update every 5th frame
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    coords.push([x, y]);
                }
            }
        }
        
        return coords;
    }
    
    /**
     * Get update order from left to right
     * @returns {Array} Array of [x, y] coordinates
     * @private
     */
    _getLeftToRightOrder() {
        const coords = [];
        
        // If we have active regions, prioritize them
        if (this.activeRegions.size > 0 && this.updateCount % 5 !== 0) {
            for (const region of this.activeRegions) {
                const [x, y] = region.split(',').map(Number);
                coords.push([x, y]);
            }
        } else {
            // Full update every 5th frame
            for (let x = 0; x < this.width; x++) {
                for (let y = 0; y < this.height; y++) {
                    coords.push([x, y]);
                }
            }
        }
        
        return coords;
    }
    
    /**
     * Get update order from right to left
     * @returns {Array} Array of [x, y] coordinates
     * @private
     */
    _getRightToLeftOrder() {
        const coords = [];
        
        // If we have active regions, prioritize them
        if (this.activeRegions.size > 0 && this.updateCount % 5 !== 0) {
            for (const region of this.activeRegions) {
                const [x, y] = region.split(',').map(Number);
                coords.push([x, y]);
            }
        } else {
            // Full update every 5th frame
            for (let x = this.width - 1; x >= 0; x--) {
                for (let y = 0; y < this.height; y++) {
                    coords.push([x, y]);
                }
            }
        }
        
        return coords;
    }
    
    /**
     * Get update order in random sequence
     * @returns {Array} Array of [x, y] coordinates
     * @private
     */
    _getRandomOrder() {
        const coords = [];
        
        // If we have active regions, prioritize them
        if (this.activeRegions.size > 0 && this.updateCount % 5 !== 0) {
            for (const region of this.activeRegions) {
                const [x, y] = region.split(',').map(Number);
                coords.push([x, y]);
            }
            
            // Shuffle the coordinates
            for (let i = coords.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [coords[i], coords[j]] = [coords[j], coords[i]];
            }
        } else {
            // Generate all coordinates
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    coords.push([x, y]);
                }
            }
            
            // Shuffle them
            for (let i = coords.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [coords[i], coords[j]] = [coords[j], coords[i]];
            }
        }
        
        return coords;
    }
    
    /**
     * Create a new particle at the specified position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} type - Element type
     * @returns {boolean} True if particle was created
     */
    createParticle(x, y, type) {
        // Ensure coordinates are in bounds
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }
        
        // Don't overwrite existing particles
        if (this.grid[y][x] !== null) {
            return false;
        }
        
        // Create the particle
        const particle = Particles.createParticle(type, x, y);
        if (particle) {
            this.grid[y][x] = particle;
            this.particleCount++;
            
            // Mark region as active
            this._markRegionActive(x, y);
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Remove a particle at the specified position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if particle was removed
     */
    removeParticle(x, y) {
        // Ensure coordinates are in bounds
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }
        
        // Check if there's a particle to remove
        if (this.grid[y][x] !== null) {
            this.grid[y][x] = null;
            this.particleCount--;
            
            // Mark region as active
            this._markRegionActive(x, y);
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Move a particle from one position to another
     * @param {number} fromX - Source X coordinate
     * @param {number} fromY - Source Y coordinate
     * @param {number} toX - Destination X coordinate
     * @param {number} toY - Destination Y coordinate
     * @returns {boolean} True if particle was moved
     */
    moveParticle(fromX, fromY, toX, toY) {
        // Ensure coordinates are in bounds
        if (fromX < 0 || fromX >= this.width || fromY < 0 || fromY >= this.height ||
            toX < 0 || toX >= this.width || toY < 0 || toY >= this.height) {
            return false;
        }
        
        // Check if there's a particle to move and destination is empty
        if (this.grid[fromY][fromX] !== null && this.grid[toY][toX] === null) {
            // Move the particle
            this.grid[toY][toX] = this.grid[fromY][fromX];
            
            // Update its coordinates
            this.grid[toY][toX].x = toX;
            this.grid[toY][toX].y = toY;
            
            // Mark as updated
            this.grid[toY][toX].updated = true;
            
            // Clear the source position
            this.grid[fromY][fromX] = null;
            
            // Mark both regions as active
            this._markRegionActive(fromX, fromY);
            this._markRegionActive(toX, toY);
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Swap two particles
     * @param {number} x1 - First X coordinate
     * @param {number} y1 - First Y coordinate
     * @param {number} x2 - Second X coordinate
     * @param {number} y2 - Second Y coordinate
     * @returns {boolean} True if particles were swapped
     */
    swapParticles(x1, y1, x2, y2) {
        // Ensure coordinates are in bounds
        if (x1 < 0 || x1 >= this.width || y1 < 0 || y1 >= this.height ||
            x2 < 0 || x2 >= this.width || y2 < 0 || y2 >= this.height) {
            return false;
        }
        
        // Check if both positions have particles
        if (this.grid[y1][x1] !== null && this.grid[y2][x2] !== null) {
            // Swap the particles
            const temp = this.grid[y1][x1];
            this.grid[y1][x1] = this.grid[y2][x2];
            this.grid[y2][x2] = temp;
            
            // Update their coordinates
            this.grid[y1][x1].x = x1;
            this.grid[y1][x1].y = y1;
            this.grid[y1][x1].updated = true;
            
            this.grid[y2][x2].x = x2;
            this.grid[y2][x2].y = y2;
            this.grid[y2][x2].updated = true;
            
            // Mark both regions as active
            this._markRegionActive(x1, y1);
            this._markRegionActive(x2, y2);
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Change the type of a particle
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} newType - New element type
     * @returns {boolean} True if type was changed
     */
    changeParticleType(x, y, newType) {
        // Ensure coordinates are in bounds
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }
        
        // Check if there's a particle to change
        if (this.grid[y][x] !== null) {
            // Store any important properties to transfer
            const oldParticle = this.grid[y][x];
            
            // Create new particle with new type
            const newParticle = Particles.createParticle(newType, x, y);
            
            if (newParticle) {
                // Replace the old particle
                this.grid[y][x] = newParticle;
                this.grid[y][x].updated = true;
                
                // Mark region as active
                this._markRegionActive(x, y);
                
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Get the pixel color for a grid cell
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Array|null} RGB color array or null if empty
     */
    getPixelColor(x, y) {
        // Empty cell
        if (!this.grid[y][x]) return null;
        
        // Get element properties
        const particle = this.grid[y][x];
        const elementType = Particles.ELEMENTS[particle.type];
        if (!elementType) return null;
        
        // Get base color
        const baseColor = elementType.color;
        
        // Apply any particle-specific color variations
        if (particle.colorVariation) {
            // Convert base hex color to RGB
            const rgb = Utils.hexToRgb(baseColor);
            
            // Apply the variation
            const variation = Math.floor(255 * particle.colorVariation);
            const r = Utils.clamp(rgb[0] + variation, 0, 255);
            const g = Utils.clamp(rgb[1] + variation, 0, 255);
            const b = Utils.clamp(rgb[2] + variation, 0, 255);
            
            return [r, g, b];
        }
        
        // Special color effects
        if (particle.type === 'fire') {
            // Make fire color vary based on life remaining
            if (particle.life) {
                const lifeRatio = particle.life / Particles.ELEMENTS.fire.lifespan.max;
                
                // Yellow-orange-red gradient
                if (lifeRatio > 0.7) {
                    return [255, 255, Utils.randomInt(0, 100)]; // Yellow
                } else if (lifeRatio > 0.3) {
                    return [255, Utils.randomInt(100, 200), 0]; // Orange
                } else {
                    return [255, Utils.randomInt(0, 100), 0]; // Red
                }
            }
        } else if (particle.type === 'wood' && particle.burning) {
            // Darkening color as wood burns
            const burnRatio = particle.burning / 100;
            const rgb = Utils.hexToRgb(baseColor);
            const darkenFactor = 1 - burnRatio * 0.5;
            
            return [
                Math.floor(rgb[0] * darkenFactor),
                Math.floor(rgb[1] * darkenFactor),
                Math.floor(rgb[2] * darkenFactor)
            ];
        } else if (particle.type === 'metal' && particle.corrosion) {
            // Greenish tint as metal corrodes
            const corrosionRatio = particle.corrosion;
            const rgb = Utils.hexToRgb(baseColor);
            
            return [
                Math.floor(rgb[0] * (1 - corrosionRatio * 0.3)),
                Math.floor(rgb[1] * (1 + corrosionRatio * 0.5)),
                Math.floor(rgb[2] * (1 - corrosionRatio * 0.3))
            ];
        }
        
        // Return base color
        return Utils.hexToRgb(baseColor);
    }
    
    /**
     * Draw elements in a specified pattern
     * @param {string} type - Element type to draw
     * @param {Array} points - Array of [x, y] coordinates to place elements
     * @returns {number} Number of particles created
     */
    drawElements(type, points) {
        // Save current state for undo
        this._saveUndoState();
        
        let count = 0;
        
        for (const [x, y] of points) {
            if (this.createParticle(x, y, type)) {
                count++;
            }
        }
        
        return count;
    }
    
    /**
     * Erase elements in a specified pattern
     * @param {Array} points - Array of [x, y] coordinates to erase
     * @returns {number} Number of particles erased
     */
    eraseElements(points) {
        // Save current state for undo
        this._saveUndoState();
        
        let count = 0;
        
        for (const [x, y] of points) {
            if (this.removeParticle(x, y)) {
                count++;
            }
        }
        
        return count;
    }
    
    /**
     * Draw a line of elements
     * @param {string} type - Element type to draw
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @returns {number} Number of particles created
     */
    drawLine(type, x1, y1, x2, y2) {
        const points = Utils.getLine(x1, y1, x2, y2);
        return this.drawElements(type, points);
    }
    
    /**
     * Draw a rectangle of elements
     * @param {string} type - Element type to draw
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {boolean} filled - Whether rectangle is filled
     * @returns {number} Number of particles created
     */
    drawRectangle(type, x1, y1, x2, y2, filled) {
        const points = Utils.getRectangle(x1, y1, x2, y2, filled);
        return this.drawElements(type, points);
    }
    
    /**
     * Draw an ellipse of elements
     * @param {string} type - Element type to draw
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radiusX - X radius
     * @param {number} radiusY - Y radius
     * @param {boolean} filled - Whether ellipse is filled
     * @returns {number} Number of particles created
     */
    drawEllipse(type, x, y, radiusX, radiusY, filled) {
        const points = Utils.getEllipse(x, y, radiusX, radiusY, filled);
        return this.drawElements(type, points);
    }
    
    /**
     * Draw with brush at specified location
     * @param {string} type - Element type to draw
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Brush radius
     * @returns {number} Number of particles created
     */
    drawBrush(type, x, y, radius) {
        const points = Utils.getBrushPoints(x, y, radius);
        
        if (type === 'eraser') {
            return this.eraseElements(points);
        } else {
            return this.drawElements(type, points);
        }
    }
    
    /**
     * Set the gravity direction
     * @param {string} direction - Direction ('up', 'down', 'left', 'right', 'none')
     */
    setGravity(direction) {
        this.gravity = direction;
    }
    
    /**
     * Set the simulation speed
     * @param {number} speed - Speed multiplier (1-10)
     */
    setSpeed(speed) {
        this.speed = Utils.clamp(speed, 1, 10);
    }
}
