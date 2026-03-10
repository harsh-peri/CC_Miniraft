const fs = require('fs');
window.onload = function() {
    // 1. Get the canvas element and its 2D context
    const canvas = document.getElementById("drawing-board");
    const ctx = canvas.getContext("2d");
    
    // Set canvas size dynamically
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - document.querySelector('.toolbar').offsetHeight;

    // Initialize drawing variables
    let isPainting = false;
    let lineWidth = document.getElementById('lineWidth').value;
    let strokeStyle = document.getElementById('stroke').value;

    // Update drawing properties from toolbar inputs
    document.getElementById('stroke').addEventListener('change', (e) => {
        strokeStyle = e.target.value;
    });
    document.getElementById('lineWidth').addEventListener('change', (e) => {
        lineWidth = e.target.value;
    });
    document.getElementById('clear').addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    // Handle mouse events
    function startPainting(e) {
        isPainting = true;
        ctx.beginPath();
        draw(e); // Draw a dot on click
    }

    function stopPainting() {
        isPainting = false;
        ctx.beginPath();
    }

    function draw(e) {
        if (!isPainting) return;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.strokeStyle = strokeStyle;

        // Calculate mouse position relative to the canvas
        const x = e.clientX - canvas.offsetLeft;
        const y = e.clientY - canvas.offsetTop;

        ctx.lineTo(x, y);
        ctx.stroke();
        console.log(x,y,lineWidth,strokeStyle);

    }

    // Add event listeners for mouse actions
    canvas.addEventListener("mousedown", startPainting);
    canvas.addEventListener("mouseup", stopPainting);
    canvas.addEventListener("mousemove", draw);
    // Add touch event listeners for mobile support
    canvas.addEventListener('touchstart', (e) => startPainting(e.touches[0]));
    canvas.addEventListener('touchend', stopPainting);
    canvas.addEventListener('touchmove', (e) => draw(e.touches[0]));
};
