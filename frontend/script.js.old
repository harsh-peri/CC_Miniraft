// window.onload = function() {
//     const canvas = document.getElementById("drawing-board");
//     const ctx = canvas.getContext("2d");
    
//     canvas.width = window.innerWidth;
//     canvas.height = window.innerHeight - document.querySelector('.toolbar').offsetHeight;

//     let isPainting = false;
//     let lineWidth = document.getElementById('lineWidth').value;
//     let strokeStyle = document.getElementById('stroke').value;

//     document.getElementById('stroke').addEventListener('change', (e) => {
//         strokeStyle = e.target.value;
//     });

//     document.getElementById('lineWidth').addEventListener('change', (e) => {
//         lineWidth = e.target.value;
//     });

//     let logs = [];

//     document.getElementById('clear').addEventListener('click', () => {
//         ctx.clearRect(0, 0, canvas.width, canvas.height);
//         logs.push({
//             type: "clear",
//             time: Date.now()
//         });
//     });

//     function startPainting(e) {
//         isPainting = true;

//         logs.push({
//             type: "stroke_start",
//             time: Date.now()
//         });

//         ctx.beginPath();
//         draw(e);
//     }

//     function stopPainting() {
//         isPainting = false;

//         logs.push({
//             type: "stroke_end",
//             time: Date.now()
//         });

//         ctx.beginPath();
//     }

//     function draw(e) {
//         if (!isPainting) return;

//         ctx.lineWidth = lineWidth;
//         ctx.lineCap = "round";
//         ctx.strokeStyle = strokeStyle;

//         const x = e.clientX - canvas.offsetLeft;
//         const y = e.clientY - canvas.offsetTop;

//         ctx.lineTo(x, y);
//         ctx.stroke();

//         logs.push({
//             type: "draw",
//             x,
//             y,
//             lineWidth,
//             strokeStyle,
//             time: Date.now()
//         });
//     }

//     setInterval(() => {
//         if (logs.length === 0) return;

//         fetch("http://localhost:5000/logs", {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify(logs)
//         });

//         logs = [];
//     }, 1000);

//     canvas.addEventListener("mousedown", startPainting);
//     canvas.addEventListener("mouseup", stopPainting);
//     canvas.addEventListener("mousemove", draw);

//     canvas.addEventListener('touchstart', (e) => startPainting(e.touches[0]));
//     canvas.addEventListener('touchend', stopPainting);
//     canvas.addEventListener('touchmove', (e) => draw(e.touches[0]));
// };

window.onload = function() {
    const canvas = document.getElementById("drawing-board");
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - document.querySelector('.toolbar').offsetHeight;

    let isPainting = false;
    let lineWidth = document.getElementById('lineWidth').value;
    let strokeStyle = document.getElementById('stroke').value;

    const ws = new WebSocket("ws://localhost:5000");

    // ---------------- UI CONTROLS ----------------
    document.getElementById('stroke').addEventListener('change', (e) => {
        strokeStyle = e.target.value;
    });

    document.getElementById('lineWidth').addEventListener('change', (e) => {
        lineWidth = e.target.value;
    });

    // ---------------- CLEAR ----------------
    document.getElementById('clear').addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ws.send(JSON.stringify({
            type: "clear"
        }));
    });

    // ---------------- DRAWING ----------------
    function startPainting(e) {
        isPainting = true;

        ctx.beginPath();

        ws.send(JSON.stringify({
            type: "stroke_start"
        }));

        draw(e);
    }

    function stopPainting() {
        isPainting = false;

        ws.send(JSON.stringify({
            type: "stroke_end"
        }));

        ctx.beginPath();
    }

    function draw(e) {
        if (!isPainting) return;

        const x = e.clientX - canvas.offsetLeft;
        const y = e.clientY - canvas.offsetTop;

        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.strokeStyle = strokeStyle;

        ctx.lineTo(x, y);
        ctx.stroke();

        // SEND TO SERVER
        ws.send(JSON.stringify({
            type: "draw",
            x,
            y,
            lineWidth,
            strokeStyle
        }));
    }

    // ---------------- RECEIVE FROM SERVER ----------------
    ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);

        if (data.type === "clear") {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        if (data.type === "stroke_start") {
            ctx.beginPath();
            return;
        }

        if (data.type === "stroke_end") {
            ctx.beginPath();
            return;
        }

        if (data.type === "draw") {
            ctx.lineWidth = data.lineWidth;
            ctx.strokeStyle = data.strokeStyle;

            ctx.lineTo(data.x, data.y);
            ctx.stroke();
        }
    };

    // ---------------- EVENTS ----------------
    canvas.addEventListener("mousedown", startPainting);
    canvas.addEventListener("mouseup", stopPainting);
    canvas.addEventListener("mousemove", draw);

    canvas.addEventListener('touchstart', (e) => startPainting(e.touches[0]));
    canvas.addEventListener('touchend', stopPainting);
    canvas.addEventListener('touchmove', (e) => draw(e.touches[0]));
};