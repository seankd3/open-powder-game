# OpenPowderGame

## Executive Summary

This document specifies the architecture and implementation details for a web-based
Powder Game replica. OpenPowderGame will be a 2D physics sandbox where users can
create, interact with, and observe various elemental particles that follow physical
laws and interact with each other in satisfying ways.

## 1. Technical Architecture

### 1.1 Core Technology Stack

*   Frontend: HTML5, CSS3, JavaScript (ES6+)
*   Rendering: HTML5 Canvas with direct pixel manipulation
*   Physics Model: Hybrid cellular automaton with simplified physics
*   Data Structure: 2D grid array for position tracking + particle objects for properties
*   Build System: None initially (single page application), optional Webpack for production

### 1.2 File Structure

*   `index.html` - Main entry point with canvas and UI elements
*   `css/` - Game styling and UI layout
    +   `style.css` - Primary stylesheet
*   `js/` - Game logic
    +   `main.js` - Game initialization and loop
    +   `engine.js` - Core simulation engine
    +   `particles.js` - Particle definitions and behaviors
    +   `renderer.js` - Canvas drawing and optimization
    +   `ui.js` - User interface controls
    +   `interactions.js` - Element interaction rules
    +   `utils.js` - Helper functions
    +   `storage.js` - Save/load functionality
*   `assets/` - Media assets
    +   `icons/` - UI icons for tools and elements
    +   `sounds/` - Optional sound effects
*   `README.md` - Documentation

## 2. Core Simulation Design

### 2.1 Grid System

*   Fixed-size grid (default: 400\*300 cells)
*   Each cell contains either: empty space or a single particle
*   Cells indexed by [x,y] coordinates
*   World boundaries with solid walls (configurable)

### 2.2 Particle System

*   Base Particle Properties:
    +   Type (string): Particle element type
    +   Position (x,y): Grid coordinates
    +   Velocity (vx,vy): Movement vector (for advanced physics)
    +   Temperature (number): For state changes
    +   Life (number): For ephemeral particles (fire, spark)
    +   Special (object): Element-specific properties

### 2.3 Update Logic

*   Main loop runs at 60 FPS (using requestAnimationFrame)
*   Process order (each frame):
    1.  User input handling
    2.  Physics update (either top-to-bottom or random cell order)
    3.  Element-specific behaviors
    4.  Element interactions/reactions
    5.  Rendering

### 2.4 Optimization Techniques

*   Update only active particles or regions (spatial tracking)
*   Batch rendering updates
*   Skip physics calculations for stable particles
*   Throttle complex calculations (e.g., pressure, temperature)

## 3. Element Types and Behaviors

### 3.1 Core Elements

*   Solid Elements
    +   Sand: Falls, forms piles (angle of repose)
    +   Wall: Static, indestructible barrier
    +   Wood: Flammable static solid
    +   Metal: Conducts electricity, high melting point
*   Liquid Elements
    +   Water: Flows, evaporates with heat, extinguishes fire
    +   Oil: Floats on water, highly flammable
    +   Acid: Dissolves most materials
*   Gas Elements
    +   Steam: Rises, condenses back to water when cool
    +   Smoke: Rises and dissipates over time
*   Energy Elements
    +   Fire: Spreads, consumes flammable materials, produces smoke
    +   Spark: Travels through conductive materials, short lifespan

### 3.2 Advanced Elements (Phase 2)

*   Plant: Grows when touching water
*   Seed: Generates plants when wet
*   Ice: Frozen water, melts with heat
*   Wax: Melts into liquid form
*   Explosive: Detonates when heated or sparked

### 3.3 Special Objects

*   Fan: Creates directional wind
*   Water/Sand Source: Continuously generates particles
*   Void: Deletes particles that touch it
*   Heater/Cooler: Affects temperature of nearby particles

## 4. User Interface Design

### 4.1 Main Components

*   Primary canvas (center)
*   Element selection panel (right)
*   Tool options panel (top)
*   Playback controls (bottom)
*   Menu controls (top-left)

### 4.2 Drawing Tools

*   Brush: Place particles (adjustable size: 1-50px)
*   Line: Draw straight lines of particles
*   Rectangle: Create filled or outline rectangles
*   Ellipse: Create filled or outline circles/ellipses
*   Eraser: Remove particles (same size options as brush)

### 4.3 Simulation Controls

*   Play/Pause toggle
*   Step forward (when paused)
*   Clear all
*   Undo/Redo (up to 10 steps)
*   Save/Load creations

### 4.4 Settings Panel

*   Simulation speed slider
*   Grid size options
*   Toggle gravity direction
*   Show/hide temperature visualization
*   Toggle sound effects

## 5. Interaction System

### 5.1 Element Interaction Matrix

*   Define reactions between element pairs
*   Temperature thresholds for state changes
*   Probability factors for random interactions

### 5.2 User Interactions

*   Drawing/erasing particles
*   Creating persistent sources/sinks
*   Introducing forces (fans, gravity changes)
*   Temperature manipulation

### 5.3 Physics Rules

*   Gravity: Particles fall downward (configurable)
*   Density: Determines floating/sinking behavior
*   Viscosity: Affects flow rate of liquids
*   Heat transfer: Conduction between adjacent particles
*   Pressure: Optional system for realistic fluid dynamics

## 6. Performance Considerations

### 6.1 Rendering Optimization

*   Only redraw changed pixels
*   Use ImageData for batch pixel updates
*   Consider WebGL for future enhancement

### 6.2 Computation Optimization

*   Spatial partitioning to only update active regions
*   Element-specific update frequencies
*   Particle dormancy for stable configurations
*   Web Workers for physics calculations (Phase 2)

### 6.3 Memory Management

*   Object pooling for particle creation/destruction
*   Optimize data structures to minimize garbage collection
*   Clear unused references

## 7. Engagement Features

### 7.1 Discoverable Interactions

*   Special element combinations with surprising effects
*   Easter egg reactions
*   Hidden elements unlocked through specific combinations

### 7.2 Challenges System

*   Guided tutorials introducing elements and tools
*   Physics puzzles (e.g., "build a working clock")
*   Creative challenges with objectives

### 7.3 User Retention

*   Local storage to save creations
*   Share creations via URL encoding
*   Gallery of example creations

## 8. Implementation Phases

### 8.1 Phase 1: Minimum Viable Product

*   Core engine with sand, water, wall elements
*   Basic UI with drawing tools
*   Simple physics (gravity, basic flow)
*   Functional save/load

### 8.2 Phase 2: Enhanced Simulation

*   Full element set implementation
*   Temperature and pressure systems
*   Reaction chains and state changes
*   Performance optimizations

### 8.3 Phase 3: Advanced Features

*   Challenges system
*   Sharing capabilities
*   Mobile touch support
*   Advanced UI with tutorial overlays

## 9. Quality Assurance Checklist

### 9.1 Performance Targets

*   60 FPS with up to 10,000 active particles
*   No noticeable lag when drawing with large brushes
*   Smooth interactions on mid-range devices

### 9.2 Common Issues to Test

*   Browser compatibility (Chrome, Firefox, Safari, Edge)
*   Memory leaks during long sessions
*   Edge cases in physics interactions
*   Mobile/touch device usability

### 9.3 User Experience Verification

*   Intuitive controls without instructions
*   Satisfying feedback for element interactions
*   Balanced challenge/discovery ratio

## 10. Potential Extensions

### 10.1 Community Features

*   Public gallery of creations
*   Voting/favoriting system
*   Custom element creator

### 10.2 Advanced Simulation

*   Rigid body physics
*   Particle-based fluids (SPH)
*   Realistic lighting and shadows

### 10.3 Gameplay Elements

*   Puzzle mode with objectives
*   Competitive challenges
*   Timed creation contests
