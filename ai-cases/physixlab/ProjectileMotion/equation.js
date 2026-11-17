const canvas = document.getElementById('simulation-canvas');
const ctx = canvas.getContext('2d');
const runButton = document.getElementById('run-button');
const resetButton = document.getElementById('reset-button');
const setButton = document.getElementById('set-button');
const initialVelocityInput = document.getElementById('initialVelocity');
const launchAngleInput = document.getElementById('launchAngle');
const gravityInput = document.getElementById('gravity');
const airResistanceInput = document.getElementById('airResistance');
const targetDistanceInput = document.getElementById('targetDistance');
const container = document.querySelector('.container');

let initialVelocity = 50;
let launchAngle = 45;
let gravity = 9.8;
let airResistance = 0;
let targetDistance = 100;
let projectileX = 0;
let projectileY = 0;
let velocityX = 0;
let velocityY = 0;
let time = 0;
let isRunning = false;
let animationFrameId = null;
let trajectory = [];
let targetX = 0;
let targetY = 0;
let launchX = 0;
let launchY = 0;
let valuesSet = false;
let scale = 1;
let worldToPixelRatio = 1; // Ratio to convert world units to pixels
let targetHit = false;
let hitEffectTime = 0;
let scoreElement;
let maxHeight = 0;
let maxHeightPoint = { x: 0, y: 0 };
let totalRange = 0;
let flightTime = 0;
let statsDisplayed = false;

function updateDimensions() {
    canvas.width = container.clientWidth * 0.95;
    canvas.height = 400;
    scale = canvas.width / 800; // Scale factor based on canvas width
    drawBlocks();
}

function simplifiedPhysics(t) {
    // Convert angle from degrees to radians
    const launchAngleRad = launchAngle * Math.PI / 180;
    
    const x = initialVelocity * Math.cos(launchAngleRad) * t;
    const y = initialVelocity * Math.sin(launchAngleRad) * t - 0.5 * gravity * t * t;
    return { x, y };
}

function calculateMaxHeight() {
    // Convert angle from degrees to radians
    const launchAngleRad = launchAngle * Math.PI / 180;
    
    // Maximum height occurs when velocity_y = 0
    // time = (v0 * sin(theta)) / g
    const timeToMax = (initialVelocity * Math.sin(launchAngleRad)) / gravity;
    
    // Calculate maximum height
    // h_max = (v0 * sin(theta))^2 / (2 * g)
    const maxHeightValue = Math.pow(initialVelocity * Math.sin(launchAngleRad), 2) / (2 * gravity);
    
    // Calculate range
    // Range = (v0^2 * sin(2*theta)) / g
    const range = Math.pow(initialVelocity, 2) * Math.sin(2 * launchAngleRad) / gravity;
    
    // Calculate total flight time
    // time = 2 * (v0 * sin(theta)) / g
    const totalTime = 2 * (initialVelocity * Math.sin(launchAngleRad)) / gravity;
    
    return {
        maxHeight: maxHeightValue,
        timeToMax: timeToMax,
        range: range,
        totalTime: totalTime
    };
}

function initializeSimulation() {
    // Set initial values
    initialVelocity = parseFloat(initialVelocityInput.value);
    launchAngle = parseFloat(launchAngleInput.value);
    gravity = parseFloat(gravityInput.value);
    airResistance = parseFloat(airResistanceInput.value) || 0;
    targetDistance = parseFloat(targetDistanceInput.value);

    // Calculate theoretical values based on physics formulas
    const physicsValues = calculateMaxHeight();
    
    // Calculate scale factor for the world (meters) to canvas (pixels) conversion
    // We'll make the canvas represent a certain distance in meters
    const maxCanvasDistance = canvas.width - 100 * scale;
    worldToPixelRatio = maxCanvasDistance / 500; // 500 meters max distance

    // Set ground level
    const groundY = canvas.height - 20 * scale;
    
    // Initial positions
    launchX = 50 * scale;
    launchY = groundY; // Start at ground level
    projectileX = launchX;
    projectileY = launchY;

    // Set target
    targetX = launchX + targetDistance * worldToPixelRatio;
    targetY = groundY; // Place target on ground

    // Reset simulation variables
    time = 0;
    trajectory = [];
    trajectory.push({ x: projectileX, y: projectileY });
    
    // Reset statistics
    maxHeight = 0;
    maxHeightPoint = { x: 0, y: 0 };
    totalRange = 0;
    flightTime = 0;
    statsDisplayed = false;
}

function runSimulation() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // If target was hit, animate hit effect
    if (targetHit) {
        drawHitEffect();
        return;
    }
    
    // Calculate new position
    const result = simplifiedPhysics(time);
    projectileX = launchX + result.x * scale;
    projectileY = launchY - result.y * scale; // Subtract because canvas Y is inverted
    
    // Track maximum height
    if (launchY - projectileY > maxHeight) {
        maxHeight = launchY - projectileY;
        maxHeightPoint = { x: projectileX, y: projectileY };
    }
    
    // Ground level check
    const groundY = canvas.height - 20 * scale;
    if (projectileY > groundY) {
        projectileY = groundY; // Ensure projectile doesn't go below ground
        isRunning = false;
        cancelAnimationFrame(animationFrameId);
        
        // Calculate final statistics
        totalRange = (projectileX - launchX) / worldToPixelRatio;
        flightTime = time;
        
        // Display statistics
        statsDisplayed = true;
        drawStats();
    }
    
    // Store trajectory point
    trajectory.push({ x: projectileX, y: projectileY });
    
    // Draw everything
    drawGround();
    drawTarget();
    drawTrajectory();
    drawMaxHeight();
    drawProjectile();
    drawStats(); // Draw stats on canvas
    
    // Check if projectile goes off screen horizontally or hits target
    const targetWidth = 20 * scale;
    const targetHeight = 30 * scale;
    if (projectileX >= canvas.width || projectileX < 0) {
        isRunning = false;
        cancelAnimationFrame(animationFrameId);
        
        // Calculate final statistics
        totalRange = (projectileX - launchX) / worldToPixelRatio;
        flightTime = time;
        
        // Display statistics
        statsDisplayed = true;
        drawStats();
        return;
    }
    
    // Check for target hit
    if (projectileX >= targetX - targetWidth/2 && 
        projectileX <= targetX + targetWidth/2 && 
        projectileY <= groundY && 
        projectileY >= groundY - targetHeight) {
        
        targetHit = true;
        hitEffectTime = 0;
        playHitSound(); // Play a sound effect
        
        // Calculate final statistics
        totalRange = targetDistance;
        flightTime = time;
        
        // Display statistics
        statsDisplayed = true;
        drawStats();
        
        // Create or update score element
        if (!scoreElement) {
            scoreElement = document.createElement('div');
            scoreElement.className = 'fixed top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center z-50';
            document.body.appendChild(scoreElement);
        }
        
        // Show hit message with animation
        scoreElement.innerHTML = `
            <div class="animate-bounce bg-cyan-600 text-white font-bold py-4 px-6 rounded-lg shadow-lg text-2xl">
                TARGET HIT!
            </div>
        `;
        
        setTimeout(() => {
            if (scoreElement) {
                document.body.removeChild(scoreElement);
                scoreElement = null;
            }
        }, 3000);
        
        return;
    }
    
    // Increase time for next frame
    time += 0.05;
    
    // Continue animation
    if (isRunning) {
        animationFrameId = requestAnimationFrame(runSimulation);
    }
}

function drawProjectile() {
    ctx.fillStyle = '#FDE68A'; // Yellow
    const projectileSize = 10 * scale;
    ctx.beginPath();
    ctx.arc(projectileX, projectileY, projectileSize, 0, 2 * Math.PI);
    ctx.fill();
}

function drawTarget() {
    const groundY = canvas.height - 20 * scale;
    const targetWidth = 20 * scale;
    const targetHeight = 30 * scale;
    
    // Draw target - now it's a rectangle standing on the ground
    ctx.fillStyle = '#A7F3D0'; // Teal
    ctx.fillRect(targetX - targetWidth/2, groundY - targetHeight, targetWidth, targetHeight);
    
    // Add bullseye
    ctx.fillStyle = '#065F46'; // Dark green
    ctx.beginPath();
    ctx.arc(targetX, groundY - targetHeight/2, targetWidth/4, 0, Math.PI * 2);
    ctx.fill();
    
    // Add target label
    ctx.fillStyle = '#00bcc4';
    ctx.font = `${Math.max(10, 14 * scale)}px "Press Start 2P"`;
    ctx.textAlign = 'center';
    ctx.fillText("Target", targetX, groundY + 15 * scale);
}

function drawTrajectory() {
    if (trajectory.length < 2) return;
    
    ctx.strokeStyle = '#00bcc4';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(trajectory[0].x, trajectory[0].y);
    
    for (let i = 1; i < trajectory.length; i++) {
        ctx.lineTo(trajectory[i].x, trajectory[i].y);
    }
    
    ctx.stroke();
}

function drawGround() {
    // Draw ground
    const groundY = canvas.height - 20 * scale;
    ctx.strokeStyle = '#64748B'; // Slate gray
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();
    
    // Add ground texture/details
    ctx.fillStyle = '#334155'; // Darker slate
    for (let x = 0; x < canvas.width; x += 20 * scale) {
        ctx.fillRect(x, groundY, 10 * scale, 20 * scale);
    }
}

function drawBlocks() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (valuesSet) {
        drawGround();
        drawTarget();
        drawProjectile();
        if (statsDisplayed) {
            drawStats();
        }
    }
}

function startSimulation() {
    if (!isRunning) {
        // Reset simulation state
        isRunning = true;
        targetHit = false;
        hitEffectTime = 0;
        time = 0;
        trajectory = [];
        maxHeight = 0;
        maxHeightPoint = { x: 0, y: 0 };
        totalRange = 0;
        flightTime = 0;
        statsDisplayed = false;
        
        // Initialize simulation with current values
        initializeSimulation();
        animationFrameId = requestAnimationFrame(runSimulation);
    }
}

function resetSimulation() {
    isRunning = false;
    targetHit = false;
    hitEffectTime = 0;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    // Remove score element if it exists
    if (scoreElement) {
        document.body.removeChild(scoreElement);
        scoreElement = null;
    }
    
    time = 0;
    trajectory = [];
    maxHeight = 0;
    maxHeightPoint = { x: 0, y: 0 };
    totalRange = 0;
    flightTime = 0;
    statsDisplayed = false;
    
    // Clear the canvas completely
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Reset UI elements
    runButton.disabled = true;
    runButton.classList.remove('bg-cyan-500', 'hover:bg-cyan-700');
    runButton.classList.add('bg-gray-500', 'cursor-not-allowed');
    
    // Reset the values set flag to require re-setting values
    valuesSet = false;
}

function setValues() {
    // Validate inputs
    const inputVelocity = parseFloat(initialVelocityInput.value);
    const inputAngle = parseFloat(launchAngleInput.value);
    const inputGravity = parseFloat(gravityInput.value);
    const inputTarget = parseFloat(targetDistanceInput.value);
    
    if (isNaN(inputVelocity) || isNaN(inputAngle) || isNaN(inputGravity) || isNaN(inputTarget)) {
        alert("Please enter valid numeric values for all inputs.");
        return;
    }

    if (inputAngle < 0 || inputAngle > 90) {
        alert("Launch angle must be between 0 and 90 degrees.");
        return;
    }
    
    if (inputVelocity <= 0) {
        alert("Initial velocity must be greater than 0.");
        return;
    }
    
    if (inputGravity <= 0) {
        alert("Gravity must be greater than 0.");
        return;
    }

    if (inputTarget <= 0 || inputTarget > 500) {
        alert("Target distance must be between 1 and 500 meters.");
        return;
    }

    // Set values
    initialVelocity = inputVelocity;
    launchAngle = inputAngle;
    gravity = inputGravity;
    airResistance = parseFloat(airResistanceInput.value) || 0;
    targetDistance = inputTarget;
    
    valuesSet = true;
    runButton.disabled = false;
    runButton.classList.remove('bg-gray-500', 'cursor-not-allowed');
    runButton.classList.add('bg-cyan-500', 'hover:bg-cyan-700');
    
    // Initialize and draw initial state
    initializeSimulation();
    drawBlocks();
}

function drawHitEffect() {
    const groundY = canvas.height - 20 * scale;
    
    // Draw the standard scene
    drawGround();
    drawTrajectory();
    drawMaxHeight();
    drawStats(); // Draw stats on hit effect too
    
    // Draw exploding target with animation
    const targetWidth = 20 * scale;
    const targetHeight = 30 * scale;
    
    // Explosion effect
    hitEffectTime += 0.1;
    const explosionRadius = 30 * scale * hitEffectTime;
    const opacity = Math.max(0, 1 - hitEffectTime/2);
    
    // Draw explosion
    ctx.globalAlpha = opacity;
    const gradient = ctx.createRadialGradient(
        targetX, groundY - targetHeight/2, 
        0, 
        targetX, groundY - targetHeight/2, 
        explosionRadius
    );
    gradient.addColorStop(0, '#FCD34D'); // Yellow core
    gradient.addColorStop(0.6, '#F97316'); // Orange mid
    gradient.addColorStop(1, 'rgba(220, 38, 38, 0)'); // Transparent red edge
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(targetX, groundY - targetHeight/2, explosionRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Particles
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = explosionRadius * 0.8 * Math.random();
        const particleX = targetX + Math.cos(angle) * distance;
        const particleY = (groundY - targetHeight/2) + Math.sin(angle) * distance;
        const particleSize = 4 * scale * Math.random() * opacity;
        
        ctx.fillStyle = '#FBBF24'; // Amber particle
        ctx.beginPath();
        ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.globalAlpha = 1;
    
    // Draw projectile
    drawProjectile();
    
    // Continue animation for a limited time
    if (hitEffectTime < 2) {
        animationFrameId = requestAnimationFrame(runSimulation);
    } else {
        // Reset all simulation state
        isRunning = false;
        targetHit = false;
        hitEffectTime = 0;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        
        // Clear the canvas and redraw static elements
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGround();
        drawTarget();
        drawStats();
        
        // Reset trajectory and projectile position
        trajectory = [];
        projectileX = launchX;
        projectileY = launchY;
        
        // Reset time and statistics
        time = 0;
        maxHeight = 0;
        maxHeightPoint = { x: 0, y: 0 };
        totalRange = 0;
        flightTime = 0;
    }
}

function playHitSound() {
    try {
        // Create audio element for hit sound
        const audio = new Audio();
        audio.src = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU7fAACBhYqFbF1HPzMoGQ8MDBUhMUBOV11qaWxumKq3wrm5rqOZjoR7c2piWlRQTEpHRUVFRUZISEhIR0ZFRkdJTE9SV11iaGt2fpOlvdPm+v/9+fLp4NfPxr20qqCWjIJ4bl1NPDEeFQkFARMmP1VqfI2bq77O2+Tm6Ojm5ODc19DJwLiyqJ+WjIJ6cWheU0tEPjkzLismIx8cGRcVFBUVFhcZGh0hJCkwOEBKVF5qeIeXqLnL3vP///////////////////3y5d7VzMW9taugloJ2aFpMPjEjFgsHBg0YJzZHWGp8jJult8bW5O7z9/j39fLv6uXg2dLLw7u0q6KZkId/d21kW1RNRkA7NjEuKiciHhwaFxYWFhgZHB8jJywzOkFKU1xndYOTpLTG1+n6///////////////8+fXv6OHZ0cjAuK+lmpCGfHJoXlNIPDYsIhwWEg8NFRwnM0BTZnaHl6e3xtXi7fP4+vr49/Xz8O3o49zW0MnBurOro5qRiIB3bWRbUktEPTcyLSklIR4bGRcWFRYXGRseISUqMDc/SVJbZnWCkqOzxdfp+v////////////////779+7n39fPx7+3rqSZj4Z7cWdcUUY7MygdFg8MCxIeLD1NXm13iJmovMvZ5u7z9fX19PPx7+zo5ODa1M7Hw7u0rKSckYmAd21kW1JLRDw2MS0pJSEfHBoYFxcXGBodICQpLjU9RU5XYXCAlaa3ydvt/f/////////////9+vfw6OHZ0cnBubCnm5GHfXNpXlNIPTEkGhMLCQwVJDVGV2lyg5Wmuc/e6/L29vb18/Hw7eso5N/a1M3GwLmyqqKYj4d/dmxjWlFKQz02MSwoJCAfHBkYFxcYGRseISYrMDc/R1BZY3KAlaa3ydvs/P////////////37+PPr493VzMW9tKujmI6EenBmW1BGOi4iGA8KCAsWJjhJW259jJqqwNDf6/L29vb18/Lw7+3r5+Pd19HLxL22r6eel4+HeXBnXlVNRkA6NTAtKSUhHhwaGBgYGRodICQpLzY/R1BZYnGAlKW2yNrr+/////////////v28Ojg2NDHv7esopePh3x0aV9USkM5LiIYDwoKDRkqPE5gbHyNnK3E1Obj5OHd2dXSz8zKyMbEwb65t7SxrqqmopybmZeWlJKRkI+Pj5CRk5WYm52ipKmutb3FzdXd5u74///////////////9+fXv6OHZ0cnBurKpn5WLgXdtY1lRSUM9NzIuKygmJCMhIB8eHh4fICEiJCYoKy4yNz5FTFVeaHeDlaW1xdbm9f///v38+vj29PLw7eso5uTi4N7d29nX1dTT0tLS0tPU1NbX2Nna3N7g4uTn6evt8PLz9ff5+/z9/v///////v79/Pv5+Pb08e7r6OXi39zZ1tLPzMjEwb24s66qpqKdmZaSjouJh4WEgoGAgIB/gIGChIWGiImLjY+SlZicn6Smqq6ytrvAw8fLz9LV2Nve4eTn6evt7/Dy8/X19/j5+vr7+/v8/Pz8/Pz7+/v7+vr6+vr5+vr6+vv7+/z8/Pz8/fz9/f39/f39/f39/fz8/Pz8+/v7+/r6+vn5+fj49/f39vb19fT08/Py8fHw7+/u7e3s7Ovr6urp6Ojn5+fm5eXl5OTj4+Pi4uLh4eHh4ODg4ODf39/f39/f3t7e3t7e3t7e3t7e3d3d3d3d3Nzc3Nzc29vb29vb2tra2tra2tra2dnZ2dnZ2dnZ2dnZ2NjY2NjY2NjY2NjY19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2dnZ2dnZ2dnZ2dnZ2dnZ2tra2tra2tra2tra2tvb29vb29vb29vb29vc3Nzc3Nzc3Nzc3Nzc3Nzc3d3d3d3d3d3d3d3d3d3d3d3d3d7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/g4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5ebm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ufn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6uvr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+zs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw';
        audio.volume = 0.5; // 50% volume
        audio.play();
    } catch (e) {
        console.log('Sound playback failed:', e);
    }
}

function displayStats() {
    if (statsDisplayed) return;
    
    // Set statsDisplayed to true to prevent re-displaying
    statsDisplayed = true;
}

function drawStats() {
    if (!statsDisplayed) return;
    
    const groundY = canvas.height - 20 * scale;
    const actualMaxHeight = (launchY - maxHeightPoint.y) / worldToPixelRatio;
    const formattedMaxHeight = actualMaxHeight.toFixed(2);
    const formattedRange = totalRange.toFixed(2);
    const formattedTime = flightTime.toFixed(2);
    
    // Set up the stats box
    const padding = 15 * scale;
    const lineHeight = 30 * scale;
    const boxWidth = 300 * scale;
    const boxHeight = 160 * scale;
    const boxX = canvas.width - boxWidth - padding;
    const boxY = padding;
    
    // Draw background box with border
    ctx.fillStyle = 'rgba(19, 26, 40, 0.98)'; // Dark navy background
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeStyle = '#00bcc4'; 
    ctx.lineWidth = 2 * scale;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    
    // Draw title
    ctx.fillStyle = '#00bcc4'; 
    ctx.font = `bold ${Math.max(16, 20 * scale)}px "Press Start 2P"`;
    ctx.textAlign = 'center';
    ctx.fillText('STATISTICS', boxX + boxWidth / 2, boxY + lineHeight);
    
    // Draw stats - using proper monospace alignment
    ctx.font = `${Math.max(12, 14 * scale)}px "Press Start 2P"`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF'; // White text
    
    // Add some spacing after title
    let currentY = boxY + lineHeight * 2;
    
    // Max Height - with right-aligned value
    ctx.fillText(`Max Height:`, boxX + padding, currentY);
    ctx.textAlign = 'right';
    ctx.fillText(`${formattedMaxHeight} m`, boxX + boxWidth - padding, currentY);
    
    // Range
    currentY += lineHeight;
    ctx.textAlign = 'left';
    ctx.fillText(`Range:`, boxX + padding, currentY);
    ctx.textAlign = 'right';
    ctx.fillText(`${formattedRange} m`, boxX + boxWidth - padding, currentY);
    
    // Flight Time
    currentY += lineHeight;
    ctx.textAlign = 'left';
    ctx.fillText(`Flight Time:`, boxX + padding, currentY);
    ctx.textAlign = 'right';
    ctx.fillText(`${formattedTime} s`, boxX + boxWidth - padding, currentY);
}

function drawMaxHeight() {
    if (maxHeight > 0) {
        const groundY = canvas.height - 20 * scale;
        
        // Draw dotted line from ground to max height point
        ctx.beginPath();
        ctx.moveTo(maxHeightPoint.x, groundY);
        ctx.lineTo(maxHeightPoint.x, maxHeightPoint.y);
        ctx.setLineDash([5, 3]); // Set line to dashed
        ctx.strokeStyle = '#FBBF24'; // Amber
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash
        
        // Draw a small circle at the highest point
        ctx.beginPath();
        ctx.arc(maxHeightPoint.x, maxHeightPoint.y, 4 * scale, 0, Math.PI * 2);
        ctx.fillStyle = '#FBBF24';
        ctx.fill();
    }
}

// Event listeners
runButton.addEventListener('click', startSimulation);
resetButton.addEventListener('click', resetSimulation);
setButton.addEventListener('click', setValues);
window.addEventListener('resize', updateDimensions);

// Initial setup
updateDimensions();
runButton.disabled = true;
runButton.classList.add('bg-gray-500', 'cursor-not-allowed'); 