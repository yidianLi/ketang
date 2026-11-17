class SHMSimulator {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        // Physics parameters
        this.mass = 1;
        this.springConstant = 10;
        this.damping = 0;
        this.initialDisplacement = 2;
        
        // Simulation state
        this.position = 0;
        this.velocity = 0;
        this.time = 0;
        this.isRunning = false;
        this.animationId = null;
        
        // Visual parameters
        this.equilibriumY = this.height / 2;
        this.amplitude = 100;
        this.springLength = 200;
        this.massSize = 30;
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.getElementById('run-button').addEventListener('click', () => this.toggleSimulation());
        document.getElementById('reset-button').addEventListener('click', () => this.reset());
        
        // Input listeners
        document.getElementById('mass').addEventListener('change', (e) => {
            this.mass = parseFloat(e.target.value);
            this.reset();
        });
        
        document.getElementById('spring-constant').addEventListener('change', (e) => {
            this.springConstant = parseFloat(e.target.value);
            this.reset();
        });
        
        document.getElementById('initial-displacement').addEventListener('change', (e) => {
            this.initialDisplacement = parseFloat(e.target.value);
            this.reset();
        });
        
        document.getElementById('damping').addEventListener('change', (e) => {
            this.damping = parseFloat(e.target.value);
            this.reset();
        });
    }
    
    toggleSimulation() {
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    }
    
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            document.getElementById('run-button').textContent = 'Pause';
            this.animate();
        }
    }
    
    stop() {
        if (this.isRunning) {
            this.isRunning = false;
            document.getElementById('run-button').textContent = 'Run Simulation';
            cancelAnimationFrame(this.animationId);
        }
    }
    
    reset() {
        this.stop();
        this.position = this.initialDisplacement;
        this.velocity = 0;
        this.time = 0;
        this.draw();
    }
    
    update(deltaTime) {
        // Convert deltaTime to seconds
        const dt = deltaTime / 1000;
        
        // Calculate forces
        const springForce = -this.springConstant * this.position;
        const dampingForce = -this.damping * this.velocity;
        const totalForce = springForce + dampingForce;
        
        // Update velocity and position using Euler integration
        const acceleration = totalForce / this.mass;
        this.velocity += acceleration * dt;
        this.position += this.velocity * dt;
        
        // Update time
        this.time += dt;
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw spring
        this.drawSpring();
        
        // Draw mass
        this.drawMass();
        
        // Draw equilibrium line
        this.drawEquilibriumLine();
    }
    
    drawSpring() {
        const x = this.width / 2;
        const y1 = 50; // Top anchor
        const y2 = this.equilibriumY + this.position * this.amplitude;
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#00bcc4';
        this.ctx.lineWidth = 2;
        
        // Draw spring coils
        const coils = 8;
        const coilHeight = (y2 - y1) / coils;
        const coilWidth = 20;
        
        this.ctx.moveTo(x, y1);
        for (let i = 0; i < coils; i++) {
            const y = y1 + i * coilHeight;
            this.ctx.lineTo(x + coilWidth, y + coilHeight / 2);
            this.ctx.lineTo(x, y + coilHeight);
        }
        
        this.ctx.stroke();
    }
    
    drawMass() {
        const x = this.width / 2;
        const y = this.equilibriumY + this.position * this.amplitude;
        
        // Draw mass as a rectangle
        this.ctx.fillStyle = '#00575b';
        this.ctx.fillRect(x - this.massSize / 2, y, this.massSize, this.massSize);
        
        // Draw mass border
        this.ctx.strokeStyle = '#00bcc4';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x - this.massSize / 2, y, this.massSize, this.massSize);
    }
    
    drawEquilibriumLine() {
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#4B5563';
        this.ctx.setLineDash([5, 5]);
        this.ctx.moveTo(0, this.equilibriumY);
        this.ctx.lineTo(this.width, this.equilibriumY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    animate(timestamp) {
        if (!this.lastTimestamp) {
            this.lastTimestamp = timestamp;
        }
        
        const deltaTime = timestamp - this.lastTimestamp;
        this.lastTimestamp = timestamp;
        
        this.update(deltaTime);
        this.draw();
        
        if (this.isRunning) {
            this.animationId = requestAnimationFrame((t) => this.animate(t));
        }
    }
    
    resize() {
        this.width = this.canvas.width = this.canvas.offsetWidth;
        this.height = this.canvas.height = this.canvas.offsetHeight;
        this.equilibriumY = this.height / 2;
        this.draw();
    }
}

// Initialize simulator when the page loads
window.addEventListener('load', () => {
    const canvas = document.getElementById('simulation-canvas');
    const simulator = new SHMSimulator(canvas);
    
    // Handle window resize
    window.addEventListener('resize', () => simulator.resize());
    
    // Initial resize
    simulator.resize();
}); 