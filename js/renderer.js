/**
 * OpenPowderGame Renderer Module
 * Handles rendering the simulation to the canvas with optimizations
 */

class Renderer {
    /**
     * Create a new renderer
     * @param {HTMLCanvasElement} canvas - Canvas element to render to
     * @param {Engine} engine - Reference to the simulation engine
     */
    constructor(canvas, engine) {
        this.canvas = canvas;
        this.engine = engine;
        this.ctx = canvas.getContext('2d');
        
        // Set up the canvas dimensions to match grid
        this.pixelSize = 2; // Each cell is 2x2 pixels by default
        this.resizeCanvas();
        
        // Track dirty regions for optimized rendering
        this.dirtyRegions = new Set();
        this.fullRedraw = true; // Start with full redraw
        
        // Create image data for fast pixel manipulation
        this.imageData = this.ctx.createImageData(canvas.width, canvas.height);
        this.imageDataBuffer = new ArrayBuffer(this.imageData.data.length);
        this.imageDataView = new Uint32Array(this.imageDataBuffer);
        
        // For debug visualization
        this.showActiveRegions = false;
        
        // Color mapping for elements
        this.colorMap = Utils.getElementColors();
    }
    
    /**
     * Resize the canvas to match the simulation grid
     */
    resizeCanvas() {
        this.canvas.width = this.engine.width * this.pixelSize;
        this.canvas.height = this.engine.height * this.pixelSize;
        
        // Recreate image data for new dimensions
        this.imageData = this.ctx.createImageData(this.canvas.width, this.canvas.height);
        this.imageDataBuffer = new ArrayBuffer(this.imageData.data.length);
        this.imageDataView = new Uint32Array(this.imageDataBuffer);
        
        // Force full redraw on resize
        this.fullRedraw = true;
    }
    
    /**
     * Set the pixel size (zoom level)
     * @param {number} size - Pixel size
     */
    setPixelSize(size) {
        this.pixelSize = Math.max(1, Math.min(10, size));
        this.resizeCanvas();
    }
    
    /**
     * Mark a region of the grid as needing redraw
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    markDirty(x, y) {
        // Add to dirty regions set
        this.dirtyRegions.add(`${x},${y}`);
        
        // Also mark adjacent cells as dirty for visual effects like fire
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < this.engine.width && 
                    ny >= 0 && ny < this.engine.height) {
                    this.dirtyRegions.add(`${nx},${ny}`);
                }
            }
        }
    }
    
    /**
     * Render the simulation to the canvas
     * @param {boolean} forceFullRedraw - Whether to force a full redraw
     */
    render(forceFullRedraw = false) {
        // Use imageData for efficient pixel manipulation
        const imgData = this.imageData.data;
        
        // Check if we need a full redraw
        if (forceFullRedraw || this.fullRedraw) {
            // Clear and redraw everything
            this.clearCanvas();
            this.fullRedraw = false;
            
            // Fill the image data array with pixel colors
            for (let y = 0; y < this.engine.height; y++) {
                for (let x = 0; x < this.engine.width; x++) {
                    this.drawCell(x, y, imgData);
                }
            }
            
            // Put the image data on the canvas
            const uint8view = new Uint8ClampedArray(this.imageDataBuffer);
            this.imageData.data.set(uint8view);
            this.ctx.putImageData(this.imageData, 0, 0);
            
            // Clear dirty regions after full redraw
            this.dirtyRegions.clear();
            
            return;
        }
        
        // Optimization: Only update dirty regions
        if (this.dirtyRegions.size > 0) {
            // Use existing image data for partial updates
            const existingImgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const existingData = existingImgData.data;
            
            // Copy existing data into our buffer
            const uint8view = new Uint8ClampedArray(existingData.buffer);
            this.imageDataBuffer = uint8view.buffer.slice(0);
            this.imageDataView = new Uint32Array(this.imageDataBuffer);
            
            // Only update dirty cells
            for (const key of this.dirtyRegions) {
                const [x, y] = key.split(',').map(Number);
                this.drawCell(x, y, imgData);
            }
            
            // Update the canvas with new data
            const updatedView = new Uint8ClampedArray(this.imageDataBuffer);
            this.imageData.data.set(updatedView);
            this.ctx.putImageData(this.imageData, 0, 0);
            
            // Clear dirty regions
            this.dirtyRegions.clear();
        }
        
        // Debug: Show active regions
        if (this.showActiveRegions) {
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            this.ctx.lineWidth = 1;
            
            for (const key of this.engine.activeRegions) {
                const [x, y] = key.split(',').map(Number);
                this.ctx.strokeRect(
                    x * this.pixelSize, 
                    y * this.pixelSize, 
                    this.pixelSize, 
                    this.pixelSize
                );
            }
        }
    }
    
    /**
     * Draw a single cell to the image data
     * @param {number} x - Cell X coordinate
     * @param {number} y - Cell Y coordinate
     * @param {Uint8ClampedArray} imgData - Image data array
     * @private
     */
    drawCell(x, y, imgData) {
        // Get cell color
        const color = this.engine.getPixelColor(x, y);
        
        if (color) {
            // Compute pixel position in the image data
            for (let py = 0; py < this.pixelSize; py++) {
                for (let px = 0; px < this.pixelSize; px++) {
                    const pixelX = x * this.pixelSize + px;
                    const pixelY = y * this.pixelSize + py;
                    
                    // Calculate offset in the image data array
                    const offset = (pixelY * this.canvas.width + pixelX);
                    
                    // RGBA value in one 32-bit integer (Little Endian: ABGR)
                    this.imageDataView[offset] = 
                        (255 << 24) |        // Alpha
                        (color[2] << 16) |   // Blue
                        (color[1] << 8) |    // Green
                        color[0];            // Red
                }
            }
        } else {
            // Empty cell, use black
            for (let py = 0; py < this.pixelSize; py++) {
                for (let px = 0; px < this.pixelSize; px++) {
                    const pixelX = x * this.pixelSize + px;
                    const pixelY = y * this.pixelSize + py;
                    
                    // Calculate offset in the image data array
                    const offset = (pixelY * this.canvas.width + pixelX);
                    
                    // Black with full alpha
                    this.imageDataView[offset] = (255 << 24);
                }
            }
        }
    }
    
    /**
     * Clear the canvas (fill with black)
     */
    clearCanvas() {
        // Fill the entire canvas with black
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Convert canvas coordinates to grid coordinates
     * @param {number} canvasX - X coordinate on canvas
     * @param {number} canvasY - Y coordinate on canvas
     * @returns {Array} [gridX, gridY] coordinates
     */
    canvasToGrid(canvasX, canvasY) {
        const gridX = Math.floor(canvasX / this.pixelSize);
        const gridY = Math.floor(canvasY / this.pixelSize);
        
        return [
            Utils.clamp(gridX, 0, this.engine.width - 1),
            Utils.clamp(gridY, 0, this.engine.height - 1)
        ];
    }
    
    /**
     * Convert client coordinates to grid coordinates
     * @param {number} clientX - Client X coordinate
     * @param {number} clientY - Client Y coordinate
     * @returns {Array} [gridX, gridY] coordinates
     */
    clientToGrid(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;
        
        return this.canvasToGrid(canvasX, canvasY);
    }
    
    /**
     * Draw the current cursor position for drawing preview
     * @param {number} x - Grid X coordinate
     * @param {number} y - Grid Y coordinate
     * @param {string} currentTool - Current selected tool
     * @param {number} brushSize - Current brush size
     * @param {string} currentElement - Current selected element
     */
    drawCursor(x, y, currentTool, brushSize, currentElement) {
        this.ctx.save();
        
        // Convert the grid coordinates to canvas coordinates
        const canvasX = x * this.pixelSize;
        const canvasY = y * this.pixelSize;
        
        // Different cursor styles based on the tool
        switch (currentTool) {
            case 'brush':
            case 'eraser':
                // Draw circle outline with radius equal to brush size
                const radius = brushSize * this.pixelSize;
                this.ctx.strokeStyle = currentTool === 'eraser' ? 'white' : 'rgba(255, 255, 255, 0.8)';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.arc(
                    canvasX + this.pixelSize / 2, 
                    canvasY + this.pixelSize / 2, 
                    radius / 2, 
                    0, Math.PI * 2
                );
                this.ctx.stroke();
                break;
                
            case 'line':
                // Simple crosshair
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(canvasX - 5, canvasY);
                this.ctx.lineTo(canvasX + 5 + this.pixelSize, canvasY + this.pixelSize / 2);
                this.ctx.moveTo(canvasX + this.pixelSize / 2, canvasY - 5);
                this.ctx.lineTo(canvasX + this.pixelSize / 2, canvasY + 5 + this.pixelSize);
                this.ctx.stroke();
                break;
                
            case 'rectangle':
            case 'ellipse':
                // Just a small highlight at cursor position
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(
                    canvasX, 
                    canvasY, 
                    this.pixelSize, 
                    this.pixelSize
                );
                break;
                
            default:
                // Default cursor
                this.ctx.strokeStyle = 'white';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(
                    canvasX, 
                    canvasY, 
                    this.pixelSize, 
                    this.pixelSize
                );
        }
        
        this.ctx.restore();
    }
    
    /**
     * Draw a preview of the shape being drawn (for line, rectangle, ellipse tools)
     * @param {string} tool - Current tool
     * @param {number} startX - Start X grid coordinate
     * @param {number} startY - Start Y grid coordinate
     * @param {number} endX - End X grid coordinate
     * @param {number} endY - End Y grid coordinate
     * @param {boolean} filled - Whether shape is filled
     */
    drawShapePreview(tool, startX, startY, endX, endY, filled) {
        this.ctx.save();
        
        // Convert grid to canvas coordinates
        const canvasStartX = startX * this.pixelSize;
        const canvasStartY = startY * this.pixelSize;
        const canvasEndX = endX * this.pixelSize;
        const canvasEndY = endY * this.pixelSize;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        
        switch (tool) {
            case 'line':
                // Draw line preview
                this.ctx.beginPath();
                this.ctx.moveTo(
                    canvasStartX + this.pixelSize / 2, 
                    canvasStartY + this.pixelSize / 2
                );
                this.ctx.lineTo(
                    canvasEndX + this.pixelSize / 2, 
                    canvasEndY + this.pixelSize / 2
                );
                this.ctx.stroke();
                break;
                
            case 'rectangle':
                // Draw rectangle preview
                const rectLeft = Math.min(canvasStartX, canvasEndX);
                const rectTop = Math.min(canvasStartY, canvasEndY);
                const rectWidth = Math.abs(canvasEndX - canvasStartX) + this.pixelSize;
                const rectHeight = Math.abs(canvasEndY - canvasStartY) + this.pixelSize;
                
                this.ctx.strokeRect(rectLeft, rectTop, rectWidth, rectHeight);
                if (filled) {
                    this.ctx.fillRect(rectLeft, rectTop, rectWidth, rectHeight);
                }
                break;
                
            case 'ellipse':
                // Draw ellipse preview
                const centerX = (canvasStartX + canvasEndX) / 2 + this.pixelSize / 2;
                const centerY = (canvasStartY + canvasEndY) / 2 + this.pixelSize / 2;
                const radiusX = Math.abs(canvasEndX - canvasStartX) / 2 + this.pixelSize / 2;
                const radiusY = Math.abs(canvasEndY - canvasStartY) / 2 + this.pixelSize / 2;
                
                this.ctx.beginPath();
                this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
                this.ctx.stroke();
                if (filled) {
                    this.ctx.fill();
                }
                break;
        }
        
        this.ctx.restore();
    }
    
    /**
     * Toggle visualization of active regions (for debugging)
     */
    toggleActiveRegions() {
        this.showActiveRegions = !this.showActiveRegions;
    }
    
    /**
     * Force a full redraw on the next render
     */
    forceFullRedraw() {
        this.fullRedraw = true;
    }
}
