const canvas = document.getElementById('simulation-canvas');
const ctx = canvas.getContext('2d');
const runButton = document.getElementById('run-button');
const resetButton = document.getElementById('reset-button');
const mass1Input = document.getElementById('mass1');
const velocity1Input = document.getElementById('velocity1');
const mass2Input = document.getElementById('mass2');
const velocity2Input = document.getElementById('velocity2');
const container = document.querySelector('.container');

let mass1, velocity1, mass2, velocity2;
let block1X, block2X, block1Velocity, block2Velocity;
let block1Width, block2Width;
let isRunning = false;
let animationFrameId;

function updateDimensions() {
    canvas.width = container.clientWidth;
   // canvas.height = container.clientHeight;
}

updateDimensions();
const PIXEL_TO_METER_RATIO = 10;  // 1 meter = 10 pixels

function initializeSimulation() {
    mass1 = parseFloat(mass1Input.value);
    velocity1 = parseFloat(velocity1Input.value);
    mass2 = parseFloat(mass2Input.value);
    velocity2 = parseFloat(velocity2Input.value);

    // Ensure masses are positive
    if (mass1 <= 0) {
        mass1 = 1;
        mass1Input.value = 1;
        alert("Mass of Block 1 must be greater than 0. Reset to 1 kg.");
    }
    if (mass2 <= 0) {
        mass2 = 1;
        mass2Input.value = 1;
        alert("Mass of Block 2 must be greater than 0. Reset to 1 kg.");
    }

    // Set canvas dimensions
    canvas.width = Math.min(800, container.clientWidth - 40); // Maximum width of 800px with some padding
    canvas.height = 200; // Fixed height

    // Calculate block widths proportional to their masses, with a minimum width
    const minWidth = 20;
    block1Width = Math.max(minWidth, Math.sqrt(mass1) * 10);
    block2Width = Math.max(minWidth, Math.sqrt(mass2) * 10);

    // Initial positions - position blocks with some space between them
    block1X = canvas.width / 4;
    block2X = (canvas.width * 3) / 4 - block2Width;
    
    // Convert velocities to pixels per frame
    block1Velocity = velocity1 * (PIXEL_TO_METER_RATIO / 60); // Divide by 60 for smoother animation
    block2Velocity = velocity2 * (PIXEL_TO_METER_RATIO / 60);
    
    isRunning = false; // Don't start running immediately after initialization
}

function drawBlocks() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate current velocities in m/s
    const velocity1InMS = (block1Velocity * 60) / PIXEL_TO_METER_RATIO;
    const velocity2InMS = (block2Velocity * 60) / PIXEL_TO_METER_RATIO;

    // Draw Block 1
    ctx.fillStyle = '#A7F3D0'; // Teal
    ctx.fillRect(block1X, canvas.height - block1Width - 50, block1Width, block1Width);
    ctx.fillStyle = '#065F46';  // Darker teal for label
    ctx.font = '0.8rem "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText(`M1: ${mass1}kg`, block1X + block1Width / 2, canvas.height - block1Width - 70);
    ctx.fillText(`V1: ${velocity1InMS.toFixed(2)}m/s`, block1X + block1Width / 2, canvas.height - block1Width - 55);

    // Draw Block 2
    ctx.fillStyle = '#FDE68A'; // Yellow
    ctx.fillRect(block2X, canvas.height - block2Width - 50, block2Width, block2Width);
    ctx.fillStyle = '#78350F';
    ctx.font = '0.8rem "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText(`M2: ${mass2}kg`, block2X + block2Width / 2, canvas.height - block2Width - 70);
    ctx.fillText(`V2: ${velocity2InMS.toFixed(2)}m/s`, block2X + block2Width / 2, canvas.height - block2Width - 55);
}

function updatePhysics() {
    if (!isRunning) return;

    // Update positions
    block1X += block1Velocity;
    block2X += block2Velocity;

    // Wall collisions for block 1
    if (block1X <= 0) {
        block1X = 0;
        block1Velocity = -block1Velocity; // Reverse velocity on wall collision
    } else if (block1X + block1Width >= canvas.width) {
        block1X = canvas.width - block1Width;
        block1Velocity = -block1Velocity;
    }

    // Wall collisions for block 2
    if (block2X <= 0) {
        block2X = 0;
        block2Velocity = -block2Velocity;
    } else if (block2X + block2Width >= canvas.width) {
        block2X = canvas.width - block2Width;
        block2Velocity = -block2Velocity;
    }

    // Block-to-block collision detection
    if (block1X + block1Width > block2X && block1X < block2X + block2Width) {
        // Calculate new velocities after collision (elastic collision)
        const finalVelocity1 = ((mass1 - mass2) * block1Velocity + 2 * mass2 * block2Velocity) / (mass1 + mass2);
        const finalVelocity2 = (2 * mass1 * block1Velocity + (mass2 - mass1) * block2Velocity) / (mass1 + mass2);

        block1Velocity = finalVelocity1;
        block2Velocity = finalVelocity2;

        // Move blocks apart slightly to prevent sticking
        const overlap = (block1X + block1Width) - block2X;
        block1X -= overlap / 2;
        block2X += overlap / 2;
    }
}

function animate() {
    updatePhysics();
    drawBlocks();
    if (isRunning) {
        animationFrameId = requestAnimationFrame(animate);
    }
}

function startSimulation() {
    if (isRunning) return; // Prevent multiple simulations
    cancelAnimationFrame(animationFrameId);
    initializeSimulation();
    isRunning = true;
    animate();
}

function resetSimulation() {
    isRunning = false;
    cancelAnimationFrame(animationFrameId);
    initializeSimulation(); // Reset to initial state
    drawBlocks(); // Draw initial positions
}

function setValues() {
    isRunning = false;
    cancelAnimationFrame(animationFrameId);
    initializeSimulation();
    drawBlocks();
}

runButton.addEventListener('click', startSimulation);
resetButton.addEventListener('click', resetSimulation);
const setButton = document.getElementById('set-button');
setButton.addEventListener('click', setValues);
window.addEventListener('resize', updateDimensions);

// Initial draw
initializeSimulation();
drawBlocks(); 