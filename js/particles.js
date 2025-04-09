/**
 * OpenPowderGame Particles Module
 * Defines particle types and their properties
 */

const Particles = {
    // Element definitions with their properties and behaviors
    ELEMENTS: {
        // Solid Elements
        'sand': {
            density: 1.5,
            gravity: 1,
            inertia: 0.8,
            color: '#e8d16f',
            colorVariation: 0.1,
            state: 'solid',
            flammable: false,
            spreadChance: 0.8,   // Chance to spread sideways when falling
            friction: 0.4,
            update: function(engine, x, y) {
                // Basic sand behavior: try to fall down, then diagonally
                const grid = engine.grid;
                const height = engine.height;
                
                // Don't process if at bottom of grid
                if (y >= height - 1) return false;
                
                // Try to move down
                if (!grid[y + 1][x]) {
                    engine.moveParticle(x, y, x, y + 1);
                    return true;
                }
                
                // Random direction preference for natural-looking piles
                const direction = Math.random() < 0.5 ? 1 : -1;
                
                // Try to move diagonally (either left or right first based on direction)
                if (x + direction >= 0 && x + direction < engine.width && 
                    !grid[y + 1][x + direction]) {
                    if (Math.random() < this.spreadChance) {
                        engine.moveParticle(x, y, x + direction, y + 1);
                        return true;
                    }
                }
                
                // Try the other diagonal
                if (x - direction >= 0 && x - direction < engine.width && 
                    !grid[y + 1][x - direction]) {
                    if (Math.random() < this.spreadChance) {
                        engine.moveParticle(x, y, x - direction, y + 1);
                        return true;
                    }
                }
                
                return false;
            }
        },
        
        'wall': {
            density: 10,
            gravity: 0,
            inertia: 1,
            color: '#808080',
            colorVariation: 0.05,
            state: 'solid',
            flammable: false,
            static: true,
            update: function() {
                // Walls don't move or change
                return false;
            }
        },
        
        'wood': {
            density: 0.6,
            gravity: 0,
            inertia: 1,
            color: '#945c31',
            colorVariation: 0.1,
            state: 'solid',
            flammable: true,
            flammability: 0.05,     // Chance to catch fire each update when near fire
            burnTime: 600,          // How long it burns before turning to ash/disappearing
            static: true,
            update: function(engine, x, y) {
                // Wood doesn't move but can burn
                return false;
            }
        },
        
        'metal': {
            density: 8,
            gravity: 0,
            inertia: 1,
            color: '#b8b8b8',
            colorVariation: 0.05,
            state: 'solid',
            flammable: false,
            conductive: true,
            static: true,
            heatConduction: 0.8,  // High heat conduction
            update: function() {
                // Metal doesn't move
                return false;
            }
        },
        
        // Liquid Elements
        'water': {
            density: 1.0,
            gravity: 0.7,
            inertia: 0.3,
            color: '#4d97ff',
            colorVariation: 0.1,
            state: 'liquid',
            flammable: false,
            evaporationTemp: 100,    // Temperature at which it turns to steam
            viscosity: 0.4,          // How easily it flows (0-1)
            dispersion: 0.8,         // How far it spreads horizontally
            update: function(engine, x, y) {
                // Basic water behavior: flow down and sideways
                const grid = engine.grid;
                const width = engine.width;
                const height = engine.height;
                
                // Don't process if at bottom of grid
                if (y >= height - 1) return false;
                
                // Try to move down
                if (!grid[y + 1][x]) {
                    engine.moveParticle(x, y, x, y + 1);
                    return true;
                }
                
                // Randomly decide which way to try flowing first
                const flowDirection = Math.random() < 0.5 ? 1 : -1;
                let moved = false;
                
                // Try flowing diagonally first
                if (x + flowDirection >= 0 && x + flowDirection < width && 
                    !grid[y + 1][x + flowDirection]) {
                    engine.moveParticle(x, y, x + flowDirection, y + 1);
                    return true;
                }
                
                // Try other diagonal direction
                if (x - flowDirection >= 0 && x - flowDirection < width && 
                    !grid[y + 1][x - flowDirection]) {
                    engine.moveParticle(x, y, x - flowDirection, y + 1);
                    return true;
                }
                
                // Flow horizontally if we can't flow down
                if (Math.random() < this.dispersion) {
                    // Try in random direction first
                    if (x + flowDirection >= 0 && x + flowDirection < width && 
                        !grid[y][x + flowDirection]) {
                        engine.moveParticle(x, y, x + flowDirection, y);
                        return true;
                    }
                    
                    // Try other direction
                    if (x - flowDirection >= 0 && x - flowDirection < width && 
                        !grid[y][x - flowDirection]) {
                        engine.moveParticle(x, y, x - flowDirection, y);
                        return true;
                    }
                }
                
                return false;
            }
        },
        
        'oil': {
            density: 0.8,
            gravity: 0.6,
            inertia: 0.4,
            color: '#704214',
            colorVariation: 0.15,
            state: 'liquid',
            flammable: true,
            flammability: 0.2,
            burnTime: 240,
            viscosity: 0.6,
            dispersion: 0.7,
            update: function(engine, x, y) {
                // Oil behaves similar to water but with different properties
                // Uses the same update logic as water for now
                return Particles.ELEMENTS['water'].update.call(this, engine, x, y);
            }
        },
        
        'acid': {
            density: 1.2,
            gravity: 0.65,
            inertia: 0.35,
            color: '#00ff00',
            colorVariation: 0.1,
            state: 'liquid',
            flammable: false,
            corrosive: true,
            corrosionRate: 0.1,     // Chance to dissolve material each update
            lifespan: 200,          // Acid eventually neutralizes
            dispersion: 0.75,       // How far it spreads horizontally
            update: function(engine, x, y) {
                // Acid flows like water but can dissolve materials
                const grid = engine.grid;
                const width = engine.width;
                const height = engine.height;
                
                // Check for materials to dissolve
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        
                        const nx = x + dx;
                        const ny = y + dy;
                        
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height && grid[ny][nx]) {
                            const neighbor = grid[ny][nx];
                            
                            // Skip non-dissolvable elements
                            if (neighbor.type === 'wall' || 
                                neighbor.type === 'acid' || 
                                neighbor.type === 'void' ||
                                neighbor.type.startsWith('source')) {
                                continue;
                            }
                            
                            // Chance to dissolve the neighbor
                            if (Math.random() < this.corrosionRate) {
                                engine.removeParticle(nx, ny);
                                
                                // Sometimes the acid is consumed
                                if (Math.random() < 0.3) {
                                    engine.removeParticle(x, y);
                                    return true;
                                }
                            }
                        }
                    }
                }
                
                // Flow like water
                return Particles.ELEMENTS['water'].update.call(this, engine, x, y);
            }
        },
        
        // Gas Elements
        'steam': {
            density: 0.3,
            gravity: -0.5,          // Negative gravity makes it rise
            inertia: 0.2,
            color: '#dce6f5',
            colorVariation: 0.2,
            state: 'gas',
            flammable: false,
            dispersion: 0.9,        // High dispersion for gases
            condensationTemp: 80,   // Temperature at which it turns back to water
            lifespan: 300,          // Steam can exist for a while before dissipating
            update: function(engine, x, y) {
                // Steam rises and disperses
                const grid = engine.grid;
                const width = engine.width;
                const height = engine.height;
                
                // Random chance to dissipate
                if (Math.random() < 0.01) {
                    engine.removeParticle(x, y);
                    return true;
                }
                
                // Don't process if at top of grid
                if (y <= 0) return false;
                
                // Try to move up
                if (!grid[y - 1][x]) {
                    engine.moveParticle(x, y, x, y - 1);
                    return true;
                }
                
                // Random dispersion direction
                const direction = Math.random() < 0.5 ? 1 : -1;
                
                // Try to move diagonally upward
                if (x + direction >= 0 && x + direction < width && 
                    y - 1 >= 0 && !grid[y - 1][x + direction]) {
                    if (Math.random() < this.dispersion) {
                        engine.moveParticle(x, y, x + direction, y - 1);
                        return true;
                    }
                }
                
                // Try other diagonal
                if (x - direction >= 0 && x - direction < width && 
                    y - 1 >= 0 && !grid[y - 1][x - direction]) {
                    if (Math.random() < this.dispersion) {
                        engine.moveParticle(x, y, x - direction, y - 1);
                        return true;
                    }
                }
                
                // Try horizontal movement
                if (x + direction >= 0 && x + direction < width && 
                    !grid[y][x + direction]) {
                    if (Math.random() < this.dispersion) {
                        engine.moveParticle(x, y, x + direction, y);
                        return true;
                    }
                }
                
                return false;
            }
        },
        
        'smoke': {
            density: 0.2,
            gravity: -0.4,
            inertia: 0.15,
            color: '#555555',
            colorVariation: 0.2,
            state: 'gas',
            flammable: false,
            dispersion: 0.95,      // Very high dispersion
            lifespan: 400,         // Exists longer than steam before dissipating
            update: function(engine, x, y) {
                // Smoke behaves like steam but with different properties and color
                // Smoke gradually fades away
                const particle = engine.grid[y][x];
                if (!particle.life) {
                    particle.life = this.lifespan;
                }
                
                particle.life--;
                
                // Random chance to dissipate, increasing as life decreases
                if (particle.life <= 0 || Math.random() < (1 - particle.life / this.lifespan) * 0.05) {
                    engine.removeParticle(x, y);
                    return true;
                }
                
                // Use the same rising and spreading behaviors as steam
                return Particles.ELEMENTS['steam'].update.call(this, engine, x, y);
            }
        },
        
        // Energy Elements
        'fire': {
            density: 0.15,
            gravity: -0.3,
            inertia: 0.1,
            color: '#ff6422',
            colorVariation: 0.3,      // Significant variation for a vibrant fire effect
            state: 'energy',
            flammable: false,
            heat: 500,                // Fire is hot
            heatRadius: 2,            // How far the heat spreads
            lifespan: { min: 40, max: 100 },  // Random lifespan
            spreadChance: 0.3,        // Chance to spread to flammable neighbors
            update: function(engine, x, y) {
                const grid = engine.grid;
                const width = engine.width;
                const height = engine.height;
                const particle = grid[y][x];
                
                // Initialize lifespan if it doesn't exist
                if (!particle.life) {
                    particle.life = Utils.randomInt(this.lifespan.min, this.lifespan.max);
                }
                
                // Decrease lifespan
                particle.life--;
                
                // Extinguish if no more life or touches water
                if (particle.life <= 0) {
                    // Sometimes create smoke when extinguished
                    if (Math.random() < 0.5) {
                        engine.changeParticleType(x, y, 'smoke');
                    } else {
                        engine.removeParticle(x, y);
                    }
                    return true;
                }
                
                // Check for spread to flammable neighbors
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height && grid[ny][nx]) {
                            const neighbor = grid[ny][nx];
                            const elemType = Particles.ELEMENTS[neighbor.type];
                            
                            // If neighbor is flammable and roll succeeds, catch it on fire
                            if (elemType && elemType.flammable && 
                                Math.random() < elemType.flammability) {
                                
                                engine.changeParticleType(nx, ny, 'fire');
                                
                                // Give it some life properties
                                grid[ny][nx].life = Utils.randomInt(this.lifespan.min, this.lifespan.max);
                                if (neighbor.type === 'wood') {
                                    grid[ny][nx].burning = 'wood';  // Remember what it was burning
                                }
                            }
                            
                            // Water extinguishes fire immediately
                            if (neighbor.type === 'water') {
                                // Sometimes create steam
                                if (Math.random() < 0.7) {
                                    engine.changeParticleType(nx, ny, 'steam');
                                } else {
                                    engine.removeParticle(nx, ny);
                                }
                                engine.removeParticle(x, y);
                                return true;
                            }
                        }
                    }
                }
                
                // Fire can rise
                if (y > 0 && !grid[y - 1][x] && Math.random() < 0.4) {
                    engine.moveParticle(x, y, x, y - 1);
                    return true;
                }
                
                // Random horizontal movement
                const moveX = x + (Math.random() < 0.5 ? 1 : -1);
                if (moveX >= 0 && moveX < width && !grid[y][moveX] && Math.random() < 0.3) {
                    engine.moveParticle(x, y, moveX, y);
                    return true;
                }
                
                return false;
            }
        },
        
        'spark': {
            density: 0.05,
            gravity: 0,
            inertia: 0,
            color: '#ffff00',
            colorVariation: 0.2,
            state: 'energy',
            flammable: false,
            conductivity: 1.0,        // Perfect conductivity
            lifespan: { min: 5, max: 20 }, // Very short lifespan
            update: function(engine, x, y) {
                const grid = engine.grid;
                const width = engine.width;
                const height = engine.height;
                const particle = grid[y][x];
                
                // Initialize lifespan if it doesn't exist
                if (!particle.life) {
                    particle.life = Utils.randomInt(this.lifespan.min, this.lifespan.max);
                }
                
                // Decrease lifespan
                particle.life--;
                
                // Extinguish if no more life
                if (particle.life <= 0) {
                    engine.removeParticle(x, y);
                    return true;
                }
                
                // Find conductive neighbors to spread to
                const conductiveNeighbors = [];
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        
                        const nx = x + dx;
                        const ny = y + dy;
                        
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height && grid[ny][nx]) {
                            const neighbor = grid[ny][nx];
                            const elemType = Particles.ELEMENTS[neighbor.type];
                            
                            // If neighbor is conductive, add to possible spread locations
                            if (elemType && elemType.conductive) {
                                conductiveNeighbors.push([nx, ny]);
                            }
                            
                            // If neighbor is flammable, chance to ignite
                            if (elemType && elemType.flammable && 
                                Math.random() < elemType.flammability * 2) { // Sparks ignite more easily
                                engine.changeParticleType(nx, ny, 'fire');
                            }
                        }
                    }
                }
                
                // Spark can jump to a random conductive neighbor
                if (conductiveNeighbors.length > 0 && Math.random() < 0.7) {
                    const [nx, ny] = Utils.randomElement(conductiveNeighbors);
                    engine.moveParticle(x, y, nx, ny);
                    return true;
                }
                
                // Random movement if not conducted
                const dir = Utils.randomInt(0, 7);
                const dx = [0, 1, 1, 1, 0, -1, -1, -1][dir];
                const dy = [-1, -1, 0, 1, 1, 1, 0, -1][dir];
                
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < width && ny >= 0 && ny < height && !grid[ny][nx]) {
                    engine.moveParticle(x, y, nx, ny);
                    return true;
                }
                
                return false;
            }
        },
        
        // Special elements
        'source-water': {
            density: 10,
            gravity: 0,
            inertia: 1,
            color: '#0077be',
            colorVariation: 0.05,
            state: 'special',
            static: true,
            emitRate: 0.2,       // Chance to emit each update
            emitType: 'water',   // Type of particle to emit
            update: function(engine, x, y) {
                const grid = engine.grid;
                const width = engine.width;
                const height = engine.height;
                
                // Check if should emit
                if (Math.random() < this.emitRate) {
                    // Find an empty adjacent cell to emit into
                    const directions = [
                        [0, 1],   // down
                        [1, 0],   // right
                        [0, -1],  // up
                        [-1, 0],  // left
                    ];
                    
                    // Shuffle directions for more natural emission
                    directions.sort(() => Math.random() - 0.5);
                    
                    for (const [dx, dy] of directions) {
                        const nx = x + dx;
                        const ny = y + dy;
                        
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height && !grid[ny][nx]) {
                            engine.createParticle(nx, ny, this.emitType);
                            return true;
                        }
                    }
                }
                
                return false;
            }
        },
        
        'source-sand': {
            density: 10,
            gravity: 0,
            inertia: 1,
            color: '#d9b166',
            colorVariation: 0.05,
            state: 'special',
            static: true,
            emitRate: 0.15,      // Slower than water
            emitType: 'sand',    // Type of particle to emit
            update: function(engine, x, y) {
                // Use the same update logic as water source
                return Particles.ELEMENTS['source-water'].update.call(
                    { ...this }, // Clone this to keep emitType
                    engine, x, y
                );
            }
        },
        
        'void': {
            density: 10,
            gravity: 0,
            inertia: 1,
            color: '#222222',
            colorVariation: 0,
            state: 'special',
            static: true,
            voidRadius: 1,      // How far it will delete particles
            update: function(engine, x, y) {
                const grid = engine.grid;
                const width = engine.width;
                const height = engine.height;
                let deleted = false;
                
                // Delete particles in radius
                for (let dy = -this.voidRadius; dy <= this.voidRadius; dy++) {
                    for (let dx = -this.voidRadius; dx <= this.voidRadius; dx++) {
                        if (dx === 0 && dy === 0) continue; // Don't delete self
                        
                        const nx = x + dx;
                        const ny = y + dy;
                        
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height && grid[ny][nx]) {
                            const target = grid[ny][nx];
                            
                            // Don't delete other void or source elements
                            if (target.type === 'void' || target.type.startsWith('source')) {
                                continue;
                            }
                            
                            engine.removeParticle(nx, ny);
                            deleted = true;
                        }
                    }
                }
                
                return deleted;
            }
        }
    },
    
    /**
     * Create a new particle of the specified type
     * @param {string} type - Particle type
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Object} New particle
     */
    createParticle: function(type, x, y) {
        const elementType = this.ELEMENTS[type];
        if (!elementType) return null;
        
        // Create a new particle object
        const particle = {
            type: type,
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            updated: false // Flag to prevent multiple updates in a frame
        };
        
        // Add color variation to make particles look more natural
        if (elementType.colorVariation > 0) {
            particle.colorVariation = Math.random() * elementType.colorVariation * 2 - elementType.colorVariation;
        }
        
        // Special properties for specific types
        if (type === 'fire' || type === 'spark') {
            particle.life = Utils.randomInt(
                elementType.lifespan.min, 
                elementType.lifespan.max
            );
        }
        
        return particle;
    },
    
    /**
     * Get the category list of all element types
     * @returns {Object} Categorized elements
     */
    getCategorizedElements: function() {
        return {
            'solids': ['sand', 'wall', 'wood', 'metal'],
            'liquids': ['water', 'oil', 'acid'],
            'gases': ['steam', 'smoke'],
            'energy': ['fire', 'spark'],
            'special': ['source-water', 'source-sand', 'void']
        };
    }
};
