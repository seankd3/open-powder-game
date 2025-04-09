/**
 * OpenPowderGame UI Module
 * Handles user interface controls and interactions
 */

class UI {
    /**
     * Create a new UI controller
     * @param {Engine} engine - Reference to the simulation engine
     * @param {Renderer} renderer - Reference to the renderer
     */
    constructor(engine, renderer) {
        this.engine = engine;
        this.renderer = renderer;
        this.canvas = renderer.canvas;
        
        // Current tool and element selection
        this.currentTool = 'brush';
        this.currentElement = 'sand';
        this.brushSize = 5;
        this.shapeFilled = false;
        
        // Drawing state
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.lastX = 0;
        this.lastY = 0;
        
        // Simulation state
        this.isPlaying = true;
        
        // UI elements
        this.toolButtons = document.querySelectorAll('.tool-btn');
        this.elementButtons = document.querySelectorAll('.element-btn');
        this.brushSizeInput = document.getElementById('brush-size');
        this.brushSizeValue = document.getElementById('size-value');
        this.playPauseButton = document.getElementById('play-pause-btn');
        this.stepButton = document.getElementById('step-btn');
        this.clearButton = document.getElementById('clear-btn');
        this.undoButton = document.getElementById('undo-btn');
        this.redoButton = document.getElementById('redo-btn');
        this.saveButton = document.getElementById('save-btn');
        this.loadButton = document.getElementById('load-btn');
        this.settingsButton = document.getElementById('settings-btn');
        this.settingsDropdown = document.getElementById('settings-dropdown');
        this.simulationSpeedInput = document.getElementById('simulation-speed');
        this.gravityDirectionSelect = document.getElementById('gravity-direction');
        this.modal = document.getElementById('modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalBody = document.getElementById('modal-body');
        this.modalCancelButton = document.getElementById('modal-cancel-btn');
        this.modalConfirmButton = document.getElementById('modal-confirm-btn');
        
        // Stats display
        this.fpsDisplay = document.getElementById('fps');
        this.particleCountDisplay = document.getElementById('particle-count');
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Initialize Storage
        Storage.init();
    }
    
    /**
     * Initialize all event listeners
     */
    initEventListeners() {
        // Canvas mouse events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        
        // Canvas touch events (for mobile)
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Tool selection
        this.toolButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.setTool(button.dataset.tool);
            });
        });
        
        // Element selection
        this.elementButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.setElement(button.dataset.element);
            });
        });
        
        // Brush size control
        this.brushSizeInput.addEventListener('input', () => {
            this.setBrushSize(parseInt(this.brushSizeInput.value));
        });
        
        // Playback controls
        this.playPauseButton.addEventListener('click', this.togglePlayPause.bind(this));
        this.stepButton.addEventListener('click', this.stepSimulation.bind(this));
        this.clearButton.addEventListener('click', this.clearSimulation.bind(this));
        this.undoButton.addEventListener('click', this.undoAction.bind(this));
        this.redoButton.addEventListener('click', this.redoAction.bind(this));
        
        // Save/Load
        this.saveButton.addEventListener('click', this.openSaveDialog.bind(this));
        this.loadButton.addEventListener('click', this.openLoadDialog.bind(this));
        
        // Settings
        this.settingsButton.addEventListener('click', this.toggleSettings.bind(this));
        document.addEventListener('click', this.handleOutsideClick.bind(this));
        this.simulationSpeedInput.addEventListener('input', this.updateSimulationSpeed.bind(this));
        this.gravityDirectionSelect.addEventListener('change', this.updateGravityDirection.bind(this));
        
        // Modal
        document.querySelector('.close-btn').addEventListener('click', this.closeModal.bind(this));
        this.modalCancelButton.addEventListener('click', this.closeModal.bind(this));
        this.modalConfirmButton.addEventListener('click', this.handleModalConfirm.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    /**
     * Handle mouse down on canvas
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseDown(e) {
        e.preventDefault();
        
        const [x, y] = this.renderer.clientToGrid(e.clientX, e.clientY);
        this.isDrawing = true;
        this.startX = x;
        this.startY = y;
        this.lastX = x;
        this.lastY = y;
        
        // For brush and eraser, start drawing immediately
        if (this.currentTool === 'brush') {
            this.engine.drawBrush(this.currentElement, x, y, this.brushSize);
            this.renderer.forceFullRedraw();
        } else if (this.currentTool === 'eraser') {
            this.engine.drawBrush('eraser', x, y, this.brushSize);
            this.renderer.forceFullRedraw();
        }
    }
    
    /**
     * Handle mouse move on canvas
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseMove(e) {
        e.preventDefault();
        
        const [x, y] = this.renderer.clientToGrid(e.clientX, e.clientY);
        
        // Always draw cursor
        this.renderer.render();
        this.renderer.drawCursor(x, y, this.currentTool, this.brushSize, this.currentElement);
        
        // Handle drawing actions
        if (this.isDrawing) {
            if (this.currentTool === 'brush') {
                // For continuous brush drawing, draw a line between last position and current
                if (x !== this.lastX || y !== this.lastY) {
                    const points = Utils.getLine(this.lastX, this.lastY, x, y);
                    
                    for (const [px, py] of points) {
                        this.engine.drawBrush(this.currentElement, px, py, this.brushSize);
                    }
                    
                    this.renderer.forceFullRedraw();
                }
            } else if (this.currentTool === 'eraser') {
                // Same for eraser
                if (x !== this.lastX || y !== this.lastY) {
                    const points = Utils.getLine(this.lastX, this.lastY, x, y);
                    
                    for (const [px, py] of points) {
                        this.engine.drawBrush('eraser', px, py, this.brushSize);
                    }
                    
                    this.renderer.forceFullRedraw();
                }
            } else if (['line', 'rectangle', 'ellipse'].includes(this.currentTool)) {
                // For shape tools, draw a preview
                this.renderer.render();
                this.renderer.drawShapePreview(
                    this.currentTool, 
                    this.startX, this.startY, 
                    x, y, 
                    this.shapeFilled
                );
            }
            
            this.lastX = x;
            this.lastY = y;
        }
    }
    
    /**
     * Handle mouse up on canvas
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseUp(e) {
        if (!this.isDrawing) return;
        
        const [x, y] = this.renderer.clientToGrid(e.clientX, e.clientY);
        
        // Complete the drawing action based on the tool
        if (this.currentTool === 'line') {
            this.engine.drawLine(this.currentElement, this.startX, this.startY, x, y);
        } else if (this.currentTool === 'rectangle') {
            this.engine.drawRectangle(
                this.currentElement, 
                this.startX, this.startY, 
                x, y, 
                this.shapeFilled
            );
        } else if (this.currentTool === 'ellipse') {
            const centerX = Math.floor((this.startX + x) / 2);
            const centerY = Math.floor((this.startY + y) / 2);
            const radiusX = Math.floor(Math.abs(x - this.startX) / 2) || 1;
            const radiusY = Math.floor(Math.abs(y - this.startY) / 2) || 1;
            
            this.engine.drawEllipse(
                this.currentElement,
                centerX, centerY,
                radiusX, radiusY,
                this.shapeFilled
            );
        }
        
        // Force a redraw for all tools
        this.renderer.forceFullRedraw();
        
        // Reset drawing state
        this.isDrawing = false;
        
        // Update UI
        this.updateUndoRedoButtons();
    }
    
    /**
     * Handle mouse leave from canvas
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseLeave(e) {
        // If we were drawing shapes, complete them
        if (this.isDrawing && ['line', 'rectangle', 'ellipse'].includes(this.currentTool)) {
            this.handleMouseUp(e);
        }
        
        this.isDrawing = false;
    }
    
    /**
     * Handle touch start on canvas (for mobile)
     * @param {TouchEvent} e - Touch event
     */
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        
        // Convert touch to mouse event and forward
        const mouseEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {}
        };
        
        this.handleMouseDown(mouseEvent);
    }
    
    /**
     * Handle touch move on canvas (for mobile)
     * @param {TouchEvent} e - Touch event
     */
    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        
        // Convert touch to mouse event and forward
        const mouseEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {}
        };
        
        this.handleMouseMove(mouseEvent);
    }
    
    /**
     * Handle touch end on canvas (for mobile)
     * @param {TouchEvent} e - Touch event
     */
    handleTouchEnd(e) {
        e.preventDefault();
        
        // Use the last known position
        const mouseEvent = {
            clientX: this.lastX,
            clientY: this.lastY,
            preventDefault: () => {}
        };
        
        this.handleMouseUp(mouseEvent);
    }
    
    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyDown(e) {
        // Don't handle shortcuts if we're typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (e.key) {
            case ' ':  // Space
                this.togglePlayPause();
                e.preventDefault();
                break;
                
            case 'c':  // C key for clear
                this.clearSimulation();
                break;
                
            case 'z':  // Z key for undo
                if (e.ctrlKey || e.metaKey) {
                    this.undoAction();
                    e.preventDefault();
                }
                break;
                
            case 'y':  // Y key for redo
                if (e.ctrlKey || e.metaKey) {
                    this.redoAction();
                    e.preventDefault();
                }
                break;
                
            case 'b':  // B key for brush tool
                this.setTool('brush');
                break;
                
            case 'l':  // L key for line tool
                this.setTool('line');
                break;
                
            case 'r':  // R key for rectangle tool
                this.setTool('rectangle');
                break;
                
            case 'e':  // E key for ellipse/circle tool
                this.setTool('ellipse');
                break;
                
            case 'x':  // X key for eraser
                this.setTool('eraser');
                break;
                
            case 'f':  // F key for filled/outline toggle
                this.toggleFilled();
                break;
                
            // Number keys 1-9 for element selection
            case '1': case '2': case '3': case '4': case '5':
            case '6': case '7': case '8': case '9':
                const index = parseInt(e.key) - 1;
                if (index < this.elementButtons.length) {
                    this.setElement(this.elementButtons[index].dataset.element);
                }
                break;
        }
    }
    
    /**
     * Set the current drawing tool
     * @param {string} tool - Tool name
     */
    setTool(tool) {
        this.currentTool = tool;
        
        // Update UI
        this.toolButtons.forEach(button => {
            if (button.dataset.tool === tool) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }
    
    /**
     * Set the current element type
     * @param {string} element - Element name
     */
    setElement(element) {
        this.currentElement = element;
        
        // Update UI
        this.elementButtons.forEach(button => {
            if (button.dataset.element === element) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }
    
    /**
     * Set the brush size
     * @param {number} size - Brush size
     */
    setBrushSize(size) {
        this.brushSize = size;
        this.brushSizeInput.value = size;
        this.brushSizeValue.textContent = size;
    }
    
    /**
     * Toggle filled/outline for shape tools
     */
    toggleFilled() {
        this.shapeFilled = !this.shapeFilled;
    }
    
    /**
     * Toggle play/pause state
     */
    togglePlayPause() {
        this.isPlaying = !this.isPlaying;
        this.engine.active = this.isPlaying;
        
        // Update button text
        this.playPauseButton.textContent = this.isPlaying ? '⏸️' : '▶️';
        this.playPauseButton.title = this.isPlaying ? 'Pause' : 'Play';
        
        // Enable/disable step button
        this.stepButton.disabled = this.isPlaying;
    }
    
    /**
     * Step the simulation forward by one frame
     */
    stepSimulation() {
        if (!this.isPlaying) {
            this.engine.update();
            this.renderer.forceFullRedraw();
        }
    }
    
    /**
     * Clear the simulation (all particles)
     */
    clearSimulation() {
        if (confirm('Clear all particles?')) {
            this.engine.reset();
            this.renderer.forceFullRedraw();
            this.updateUndoRedoButtons();
        }
    }
    
    /**
     * Undo the last action
     */
    undoAction() {
        if (this.engine.undo()) {
            this.renderer.forceFullRedraw();
            this.updateUndoRedoButtons();
        }
    }
    
    /**
     * Redo a previously undone action
     */
    redoAction() {
        if (this.engine.redo()) {
            this.renderer.forceFullRedraw();
            this.updateUndoRedoButtons();
        }
    }
    
    /**
     * Update undo/redo button states
     */
    updateUndoRedoButtons() {
        // Enable/disable undo button
        this.undoButton.disabled = this.engine.undoStack.length === 0;
        
        // Enable/disable redo button
        this.redoButton.disabled = this.engine.redoStack.length === 0;
        
        // Update particle count
        this.updateParticleCount();
    }
    
    /**
     * Update the particle count display
     */
    updateParticleCount() {
        this.particleCountDisplay.textContent = `Particles: ${this.engine.particleCount}`;
    }
    
    /**
     * Update the FPS display
     * @param {number} fps - Current FPS
     */
    updateFPS(fps) {
        this.fpsDisplay.textContent = `FPS: ${fps}`;
    }
    
    /**
     * Toggle settings dropdown
     */
    toggleSettings() {
        this.settingsDropdown.classList.toggle('hidden');
    }
    
    /**
     * Close settings dropdown when clicking outside
     * @param {MouseEvent} e - Mouse event
     */
    handleOutsideClick(e) {
        if (!this.settingsDropdown.classList.contains('hidden') && 
            !this.settingsButton.contains(e.target) && 
            !this.settingsDropdown.contains(e.target)) {
            this.settingsDropdown.classList.add('hidden');
        }
    }
    
    /**
     * Update simulation speed
     */
    updateSimulationSpeed() {
        const speed = parseInt(this.simulationSpeedInput.value);
        this.engine.setSpeed(speed);
    }
    
    /**
     * Update gravity direction
     */
    updateGravityDirection() {
        const direction = this.gravityDirectionSelect.value;
        this.engine.setGravity(direction);
    }
    
    /**
     * Open save dialog
     */
    openSaveDialog() {
        this.modalTitle.textContent = 'Save Creation';
        
        let content = '<label for="save-name">Creation Name:</label>';
        content += '<input type="text" id="save-name" value="Creation ' + new Date().toLocaleString() + '">';
        content += '<div id="save-result"></div>';
        
        this.modalBody.innerHTML = content;
        this.modalConfirmButton.textContent = 'Save';
        this._currentModalAction = 'save';
        
        this.showModal();
    }
    
    /**
     * Open load dialog
     */
    openLoadDialog() {
        this.modalTitle.textContent = 'Load Creation';
        
        // Get all saved creations
        const saves = Storage.getAllSaves();
        const saveNames = Object.keys(saves);
        
        let content = '';
        
        if (saveNames.length === 0) {
            content = '<p>No saved creations found.</p>';
            this.modalConfirmButton.disabled = true;
        } else {
            content = '<select id="load-select">';
            for (const name of saveNames) {
                const date = new Date(saves[name].date).toLocaleString();
                content += `<option value="${name}">${name} (${date})</option>`;
            }
            content += '</select>';
            content += '<div id="load-result"></div>';
            this.modalConfirmButton.disabled = false;
        }
        
        this.modalBody.innerHTML = content;
        this.modalConfirmButton.textContent = 'Load';
        this._currentModalAction = 'load';
        
        this.showModal();
    }
    
    /**
     * Show the modal dialog
     */
    showModal() {
        this.modal.classList.remove('hidden');
    }
    
    /**
     * Close the modal dialog
     */
    closeModal() {
        this.modal.classList.add('hidden');
        this.modalConfirmButton.disabled = false;
    }
    
    /**
     * Handle modal confirm button click
     */
    handleModalConfirm() {
        if (this._currentModalAction === 'save') {
            const nameInput = document.getElementById('save-name');
            const name = nameInput.value.trim();
            const resultDiv = document.getElementById('save-result');
            
            if (name === '') {
                resultDiv.textContent = 'Please enter a valid name.';
                resultDiv.style.color = 'red';
                return;
            }
            
            // Get current game state
            const gameState = this.engine.exportCompressedState();
            
            // Save it
            const success = Storage.saveGame(gameState, name);
            
            if (success) {
                resultDiv.textContent = 'Creation saved successfully!';
                resultDiv.style.color = 'green';
                setTimeout(this.closeModal.bind(this), 1500);
            } else {
                resultDiv.textContent = 'Error saving creation.';
                resultDiv.style.color = 'red';
            }
        } else if (this._currentModalAction === 'load') {
            const selectEl = document.getElementById('load-select');
            
            if (!selectEl) {
                this.closeModal();
                return;
            }
            
            const name = selectEl.value;
            const resultDiv = document.getElementById('load-result');
            
            // Load the saved state
            const gameState = Storage.loadGame(name);
            
            if (gameState) {
                this.engine.importCompressedState(gameState);
                this.renderer.forceFullRedraw();
                this.updateUndoRedoButtons();
                
                resultDiv.textContent = 'Creation loaded successfully!';
                resultDiv.style.color = 'green';
                setTimeout(this.closeModal.bind(this), 1500);
            } else {
                resultDiv.textContent = 'Error loading creation.';
                resultDiv.style.color = 'red';
            }
        }
    }
}
