/**
 * OpenPowderGame Storage Module
 * Handles saving and loading game states
 */

const Storage = {
    /**
     * Maximum number of saved creations
     */
    MAX_SAVES: 10,
    
    /**
     * Name of localStorage key for saves
     */
    STORAGE_KEY: 'openPowderGameSaves',
    
    /**
     * Initialize storage
     */
    init: function() {
        // Create storage if it doesn't exist
        if (!localStorage.getItem(this.STORAGE_KEY)) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({}));
        }
    },
    
    /**
     * Save current game state
     * @param {Object} gameState - Current game state to save
     * @param {string} name - Name of the save
     * @returns {boolean} Success status
     */
    saveGame: function(gameState, name) {
        try {
            const saves = this.getAllSaves();
            
            // Use timestamp if no name provided
            const saveName = name || `Creation ${new Date().toLocaleString()}`;
            
            // Create save object
            const saveObj = {
                name: saveName,
                date: new Date().toISOString(),
                state: gameState
            };
            
            // Add to saves
            saves[saveName] = saveObj;
            
            // Limit number of saves
            const saveNames = Object.keys(saves);
            if (saveNames.length > this.MAX_SAVES) {
                // Remove oldest save
                const oldest = saveNames.sort((a, b) => 
                    new Date(saves[a].date) - new Date(saves[b].date)
                )[0];
                delete saves[oldest];
            }
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saves));
            return true;
        } catch (error) {
            console.error("Error saving game:", error);
            return false;
        }
    },
    
    /**
     * Load a game state by name
     * @param {string} name - Name of the save to load
     * @returns {Object|null} Game state or null if not found
     */
    loadGame: function(name) {
        try {
            const saves = this.getAllSaves();
            if (saves[name]) {
                return saves[name].state;
            }
            return null;
        } catch (error) {
            console.error("Error loading game:", error);
            return null;
        }
    },
    
    /**
     * Get all saved games
     * @returns {Object} Map of saved games
     */
    getAllSaves: function() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
        } catch (error) {
            console.error("Error getting saves:", error);
            return {};
        }
    },
    
    /**
     * Delete a saved game
     * @param {string} name - Name of the save to delete
     * @returns {boolean} Success status
     */
    deleteSave: function(name) {
        try {
            const saves = this.getAllSaves();
            if (saves[name]) {
                delete saves[name];
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saves));
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error deleting save:", error);
            return false;
        }
    },
    
    /**
     * Export game state as JSON string
     * @param {Object} gameState - Game state to export
     * @returns {string} JSON string of compressed game state
     */
    exportGame: function(gameState) {
        try {
            // Use more efficient encoding for grid data
            const exported = {
                width: gameState.width,
                height: gameState.height,
                // Convert grid to run-length encoding for efficiency
                grid: this._encodeGrid(gameState.grid),
                version: gameState.version || '1.0'
            };
            
            return JSON.stringify(exported);
        } catch (error) {
            console.error("Error exporting game:", error);
            return null;
        }
    },
    
    /**
     * Import game state from JSON string
     * @param {string} jsonString - JSON string of game state
     * @returns {Object|null} Game state or null if invalid
     */
    importGame: function(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            
            // Validate basic structure
            if (!imported.width || !imported.height || !imported.grid) {
                throw new Error("Invalid game data structure");
            }
            
            // Convert from run-length encoding back to grid
            imported.grid = this._decodeGrid(imported.grid, imported.width, imported.height);
            
            return imported;
        } catch (error) {
            console.error("Error importing game:", error);
            return null;
        }
    },
    
    /**
     * Encode grid using run-length encoding for more efficient storage
     * @param {Array} grid - 2D grid of cells
     * @returns {Array} Run-length encoded grid
     * @private
     */
    _encodeGrid: function(grid) {
        const encoded = [];
        let currentType = null;
        let count = 0;
        
        // Flatten the 2D grid into 1D for encoding
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                const cell = grid[y][x];
                const type = cell ? cell.type : null;
                
                if (type === currentType) {
                    count++;
                } else {
                    if (currentType !== null) {
                        encoded.push([currentType, count]);
                    }
                    currentType = type;
                    count = 1;
                }
            }
        }
        
        // Add the last run
        if (count > 0) {
            encoded.push([currentType, count]);
        }
        
        return encoded;
    },
    
    /**
     * Decode run-length encoded grid back to 2D grid
     * @param {Array} encoded - Run-length encoded grid
     * @param {number} width - Grid width
     * @param {number} height - Grid height
     * @returns {Array} 2D grid of cells
     * @private
     */
    _decodeGrid: function(encoded, width, height) {
        const grid = Array(height).fill().map(() => Array(width).fill(null));
        let index = 0;
        
        for (let i = 0; i < encoded.length; i++) {
            const [type, count] = encoded[i];
            
            for (let j = 0; j < count; j++) {
                const y = Math.floor(index / width);
                const x = index % width;
                
                if (y < height && x < width) {
                    if (type) {
                        // Create basic particle with just the type
                        grid[y][x] = { type };
                    } else {
                        grid[y][x] = null;
                    }
                }
                
                index++;
            }
        }
        
        return grid;
    }
};
