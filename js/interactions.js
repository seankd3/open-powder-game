/**
 * OpenPowderGame Interactions Module
 * Defines how different elements interact with each other
 */

const Interactions = {
    /**
     * Interaction matrix defining how elements react when they come into contact
     * Format: {'element1+element2': function(engine, x1, y1, x2, y2) { ... }}
     */
    REACTIONS: {
        // Water + Fire = Steam (water wins)
        'water+fire': function(engine, waterX, waterY, fireX, fireY) {
            // Convert water to steam with a certain probability
            if (Math.random() < 0.7) {
                engine.changeParticleType(waterX, waterY, 'steam');
            }
            // Remove fire
            engine.removeParticle(fireX, fireY);
            return true;
        },
        
        // Oil + Fire = More Fire (fire wins)
        'oil+fire': function(engine, oilX, oilY, fireX, fireY) {
            // Oil immediately catches fire and spreads
            engine.changeParticleType(oilX, oilY, 'fire');
            // Give the new fire a random lifespan
            const fireLife = Utils.randomInt(
                Particles.ELEMENTS.fire.lifespan.min,
                Particles.ELEMENTS.fire.lifespan.max
            );
            engine.grid[oilY][oilX].life = fireLife;
            return true;
        },
        
        // Water + Acid = Diluted Acid (random chance of acid being neutralized)
        'water+acid': function(engine, waterX, waterY, acidX, acidY) {
            // 25% chance the acid gets neutralized (water wins)
            if (Math.random() < 0.25) {
                engine.removeParticle(acidX, acidY);
                return true;
            }
            return false;
        },
        
        // Acid + Metal = Dissolve Metal (acid wins gradually)
        'acid+metal': function(engine, acidX, acidY, metalX, metalY) {
            // Metal gradually dissolves
            if (!engine.grid[metalY][metalX].corrosion) {
                engine.grid[metalY][metalX].corrosion = 0;
            }
            
            engine.grid[metalY][metalX].corrosion += 0.1;
            
            // Once corrosion reaches threshold, metal is gone
            if (engine.grid[metalY][metalX].corrosion >= 1) {
                engine.removeParticle(metalX, metalY);
                // Acid also has a chance to be consumed
                if (Math.random() < 0.3) {
                    engine.removeParticle(acidX, acidY);
                }
                return true;
            }
            
            return false;
        },
        
        // Acid + Sand = Slower dissolution (acid wins very slowly)
        'acid+sand': function(engine, acidX, acidY, sandX, sandY) {
            // Sand dissolves, but more slowly than other materials
            if (Math.random() < 0.04) {
                engine.removeParticle(sandX, sandY);
                // Acid also has a chance to be consumed
                if (Math.random() < 0.2) {
                    engine.removeParticle(acidX, acidY);
                }
                return true;
            }
            return false;
        },
        
        // Water + Steam = Water absorbs steam (water wins)
        'water+steam': function(engine, waterX, waterY, steamX, steamY) {
            // Steam is simply absorbed by water
            if (Math.random() < 0.3) {
                engine.removeParticle(steamX, steamY);
                return true;
            }
            return false;
        },
        
        // Water + Oil = Oil floats on water (they swap positions)
        'water+oil': function(engine, waterX, waterY, oilX, oilY) {
            // If water is above oil, they should swap places
            if (waterY < oilY) {
                engine.swapParticles(waterX, waterY, oilX, oilY);
                return true;
            }
            return false;
        },
        
        // Fire + Wood = Burning Wood (fire spreads)
        'fire+wood': function(engine, fireX, fireY, woodX, woodY) {
            // If wood doesn't have a burning counter yet
            if (!engine.grid[woodY][woodX].burning) {
                // Start burning process
                engine.grid[woodY][woodX].burning = 0;
            }
            
            // Increment burning counter
            engine.grid[woodY][woodX].burning += 1;
            
            // Once wood has burned enough, it catches fire and is consumed
            if (engine.grid[woodY][woodX].burning >= 100) {
                engine.changeParticleType(woodX, woodY, 'fire');
                // Give the fire a lifespan
                engine.grid[woodY][woodX].life = Utils.randomInt(
                    Particles.ELEMENTS.fire.lifespan.min,
                    Particles.ELEMENTS.fire.lifespan.max
                );
                
                // Sometimes create smoke
                if (Math.random() < 0.4 && woodY > 0 && !engine.grid[woodY-1][woodX]) {
                    engine.createParticle(woodX, woodY-1, 'smoke');
                }
                
                return true;
            }
            
            // Occasionally spawn a new fire particle above the wood
            if (Math.random() < 0.05 && woodY > 0 && !engine.grid[woodY-1][woodX]) {
                engine.createParticle(woodX, woodY-1, 'fire');
                return true;
            }
            
            return false;
        },
        
        // Spark + Metal = Spark travels through metal (spark continues)
        'spark+metal': function(engine, sparkX, sparkY, metalX, metalY) {
            // Spark can travel through metal to another side
            const width = engine.width;
            const height = engine.height;
            const grid = engine.grid;
            
            // Find potential exit points around the metal
            const exitPoints = [];
            
            // Check all adjacent cells to the metal
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    
                    const nx = metalX + dx;
                    const ny = metalY + dy;
                    
                    // If in bounds and empty, it's a potential exit
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height && !grid[ny][nx]) {
                        exitPoints.push([nx, ny]);
                    }
                }
            }
            
            // If there are exit points, move spark to a random one
            if (exitPoints.length > 0 && Math.random() < 0.7) {
                const [newX, newY] = Utils.randomElement(exitPoints);
                
                // Move the spark
                engine.removeParticle(sparkX, sparkY);
                engine.createParticle(newX, newY, 'spark');
                
                return true;
            }
            
            // If no exit found, spark continues but loses energy
            if (engine.grid[sparkY][sparkX].life) {
                engine.grid[sparkY][sparkX].life -= 1;
            }
            
            return false;
        },
        
        // Spark + Oil = Ignite oil (spark wins)
        'spark+oil': function(engine, sparkX, sparkY, oilX, oilY) {
            // Oil ignites with high probability
            if (Math.random() < 0.8) {
                engine.changeParticleType(oilX, oilY, 'fire');
                // Give the fire a lifespan
                engine.grid[oilY][oilX].life = Utils.randomInt(
                    Particles.ELEMENTS.fire.lifespan.min,
                    Particles.ELEMENTS.fire.lifespan.max
                );
                return true;
            }
            return false;
        },
        
        // Fire + Oil = Ignite oil (fire wins)
        'fire+oil': function(engine, fireX, fireY, oilX, oilY) {
            // Same as spark+oil but with higher probability
            return Interactions.REACTIONS['spark+oil'](engine, fireX, fireY, oilX, oilY);
        },
        
        // Acid + Wall = No effect (wall is immune)
        'acid+wall': function(engine, acidX, acidY, wallX, wallY) {
            // Wall is immune to acid
            return false;
        },
        
        // Steam + Fire = Steam dissipates faster (fire wins)
        'steam+fire': function(engine, steamX, steamY, fireX, fireY) {
            // Steam disappears faster near fire
            if (Math.random() < 0.4) {
                engine.removeParticle(steamX, steamY);
                return true;
            }
            return false;
        }
    },
    
    /**
     * Check for and process interactions between two elements
     * @param {Object} engine - Reference to the simulation engine
     * @param {number} x1 - X coordinate of first particle
     * @param {number} y1 - Y coordinate of first particle
     * @param {number} x2 - X coordinate of second particle
     * @param {number} y2 - Y coordinate of second particle
     * @returns {boolean} True if an interaction occurred
     */
    processInteraction: function(engine, x1, y1, x2, y2) {
        const grid = engine.grid;
        
        // Ensure both positions have particles
        if (!grid[y1][x1] || !grid[y2][x2]) return false;
        
        const type1 = grid[y1][x1].type;
        const type2 = grid[y2][x2].type;
        
        // Check for defined reactions in both orders
        const reaction1 = this.REACTIONS[`${type1}+${type2}`];
        const reaction2 = this.REACTIONS[`${type2}+${type1}`];
        
        if (reaction1) {
            return reaction1(engine, x1, y1, x2, y2);
        } else if (reaction2) {
            return reaction2(engine, x2, y2, x1, y1);
        }
        
        return false;
    },
    
    /**
     * Process all potential interactions for a particle
     * @param {Object} engine - Reference to the simulation engine
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if any interaction occurred
     */
    processParticleInteractions: function(engine, x, y) {
        const grid = engine.grid;
        const width = engine.width;
        const height = engine.height;
        
        // No particle at this location
        if (!grid[y][x]) return false;
        
        // Check all adjacent cells for potential interactions
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                const nx = x + dx;
                const ny = y + dy;
                
                // Ensure in bounds
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    // If there's a particle, check for interaction
                    if (grid[ny][nx] && this.processInteraction(engine, x, y, nx, ny)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
};
