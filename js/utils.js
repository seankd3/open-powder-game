/**
 * OpenPowderGame Utility Functions
 * Helper functions for various game operations
 */

const Utils = {
    /**
     * Get a random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random integer
     */
    randomInt: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Get a random element from an array
     * @param {Array} array - The array to select from
     * @returns {*} Random element from the array
     */
    randomElement: function(array) {
        return array[Math.floor(Math.random() * array.length)];
    },

    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum bound
     * @param {number} max - Maximum bound
     * @returns {number} Clamped value
     */
    clamp: function(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    
    /**
     * Check if a point is within the bounds of the grid
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} width - Grid width
     * @param {number} height - Grid height
     * @returns {boolean} True if in bounds, false otherwise
     */
    inBounds: function(x, y, width, height) {
        return x >= 0 && x < width && y >= 0 && y < height;
    },
    
    /**
     * Get the distance between two points
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Distance between points
     */
    distance: function(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },
    
    /**
     * Get points in a line using Bresenham's algorithm
     * @param {number} x0 - Start X
     * @param {number} y0 - Start Y
     * @param {number} x1 - End X
     * @param {number} y1 - End Y
     * @returns {Array} Array of points as [x, y] arrays
     */
    getLine: function(x0, y0, x1, y1) {
        const points = [];
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = (x0 < x1) ? 1 : -1;
        const sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;
        
        while(true) {
            points.push([x0, y0]);
            
            if (x0 === x1 && y0 === y1) break;
            
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }
        
        return points;
    },
    
    /**
     * Get points in a rectangle (outline or filled)
     * @param {number} x0 - Start X
     * @param {number} y0 - Start Y
     * @param {number} x1 - End X
     * @param {number} y1 - End Y
     * @param {boolean} filled - Whether rectangle is filled
     * @returns {Array} Array of points as [x, y] arrays
     */
    getRectangle: function(x0, y0, x1, y1, filled) {
        const points = [];
        const startX = Math.min(x0, x1);
        const startY = Math.min(y0, y1);
        const endX = Math.max(x0, x1);
        const endY = Math.max(y0, y1);
        
        if (filled) {
            // Filled rectangle
            for (let y = startY; y <= endY; y++) {
                for (let x = startX; x <= endX; x++) {
                    points.push([x, y]);
                }
            }
        } else {
            // Outline rectangle
            // Top and bottom edges
            for (let x = startX; x <= endX; x++) {
                points.push([x, startY]);
                points.push([x, endY]);
            }
            // Left and right edges (avoiding corners twice)
            for (let y = startY + 1; y < endY; y++) {
                points.push([startX, y]);
                points.push([endX, y]);
            }
        }
        
        return points;
    },
    
    /**
     * Get points in an ellipse (outline or filled)
     * @param {number} x0 - Center X
     * @param {number} y0 - Center Y
     * @param {number} radiusX - X radius
     * @param {number} radiusY - Y radius
     * @param {boolean} filled - Whether ellipse is filled
     * @returns {Array} Array of points as [x, y] arrays
     */
    getEllipse: function(x0, y0, radiusX, radiusY, filled) {
        const points = [];
        
        if (filled) {
            // Filled ellipse
            for (let y = y0 - radiusY; y <= y0 + radiusY; y++) {
                for (let x = x0 - radiusX; x <= x0 + radiusX; x++) {
                    // Check if point is inside ellipse
                    if (Math.pow(x - x0, 2) / Math.pow(radiusX, 2) + 
                        Math.pow(y - y0, 2) / Math.pow(radiusY, 2) <= 1) {
                        points.push([x, y]);
                    }
                }
            }
        } else {
            // Outline ellipse using parametric equation
            const steps = Math.max(radiusX, radiusY) * 4; // More steps for smoother ellipse
            for (let i = 0; i < steps; i++) {
                const angle = 2 * Math.PI * i / steps;
                const x = Math.round(x0 + radiusX * Math.cos(angle));
                const y = Math.round(y0 + radiusY * Math.sin(angle));
                
                // Check if this point is already in our list
                const exists = points.some(p => p[0] === x && p[1] === y);
                if (!exists) {
                    points.push([x, y]);
                }
            }
        }
        
        return points;
    },
    
    /**
     * Get points in a circular brush pattern
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Brush radius
     * @returns {Array} Array of points as [x, y] arrays
     */
    getBrushPoints: function(x, y, radius) {
        // Use filled circle for brush
        const rx = radius;
        const ry = radius;
        return this.getEllipse(x, y, rx, ry, true);
    },
    
    /**
     * Measure and return current FPS
     * @param {number} timestamp - Current timestamp
     * @param {number} lastTimestamp - Previous timestamp
     * @returns {number} Calculated FPS
     */
    calculateFPS: function(timestamp, lastTimestamp) {
        if (!lastTimestamp) return 60;
        const delta = timestamp - lastTimestamp;
        return Math.round(1000 / delta);
    },
    
    /**
     * Create and return a color mapping for elements
     * @returns {Object} Color mapping for elements
     */
    getElementColors: function() {
        return {
            'sand': '#e8d16f',
            'wall': '#808080',
            'water': '#4d97ff',
            'oil': '#704214',
            'wood': '#945c31',
            'metal': '#b8b8b8',
            'fire': '#ff6422',
            'steam': '#dce6f5',
            'smoke': '#555555',
            'spark': '#ffff00',
            'acid': '#00ff00',
            'source-water': '#0077be',
            'source-sand': '#d9b166',
            'void': '#222222'
        };
    },
    
    /**
     * Convert color to RGB array
     * @param {string} color - Hex color string
     * @returns {Array} RGB array [r, g, b]
     */
    hexToRgb: function(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [0, 0, 0];
    },
    
    /**
     * Debounce a function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    debounce: function(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
};
