const canvas = document.getElementById("graph"),
  ctx = canvas.getContext("2d");
const wrap = document.getElementById("screenWrap"),
  fftCanvas = document.getElementById("fftCanvas"),
  fftCtx = fftCanvas.getContext("2d");

const ampSlider = document.getElementById("ampSlider"),
  speedSlider = document.getElementById("speedSlider"),
  waveType = document.getElementById("waveType");
const ch1Pos = document.getElementById("ch1PosSlider"),
  ch1X = document.getElementById("ch1XSlider");
const ch2Enable = document.getElementById("ch2Enable"),
  ch2Amp = document.getElementById("ch2AmpSlider"),
  ch2Pos = document.getElementById("ch2PosSlider"),
  ch2Wave = document.getElementById("ch2WaveType");
const micEnable = document.getElementById("micEnable"),
  micPos = document.getElementById("micPosSlider");
const recordBtn = document.getElementById("recordBtn"),
  playRecordBtn = document.getElementById("playRecordBtn"),
  clearRecordBtn = document.getElementById("clearRecordBtn"),
  playBtn = document.getElementById("playBtn");
const configOverlay = document.getElementById("configOverlay"),
  recordStatus = document.getElementById("recordStatus");

let time = 0,
  isRunning = true,
  micActive = false,
  analyser = null,
  dataArray = null,
  audioCtx = null;
let mediaRecorder,
  audioChunks = [],
  recordedBuffer = null,
  isPlayingRecord = false,
  pitch = "0";

function resize() {
  canvas.width = wrap.clientWidth;
  canvas.height = wrap.clientHeight;
  fftCanvas.width = fftCanvas.parentElement.clientWidth;
  fftCanvas.height = fftCanvas.parentElement.clientHeight;
}
window.onresize = resize;
resize();

const updateVal = (id, valId) =>
  (document.getElementById(id).oninput = (e) => {
    document.getElementById(valId).textContent = e.target.value;
    if (id === "speedSlider")
      document.getElementById("timeTag").textContent =
        `T-SCALE: ${e.target.value}ms/div`;
  });
[
  "ampSlider",
  "ampVal",
  "speedSlider",
  "speedVal",
  "ch1PosSlider",
  "ch1PosVal",
  "ch1XSlider",
  "ch1XVal",
  "ch2AmpSlider",
  "ch2AmpVal",
  "ch2PosSlider",
  "ch2PosVal",
  "micPosSlider",
  "micPosVal",
].forEach((x, i, a) => {
  if (i % 2 === 0) updateVal(x, a[i + 1]);
});

playBtn.onclick = () => {
  isRunning = !isRunning;
  playBtn.textContent = isRunning ? "⏸ PAUSE SCREEN" : "▶ PLAY SCREEN";
};

micEnable.onchange = async () => {
  if (!audioCtx) audioCtx = new AudioContext();
  if (micEnable.checked) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    dataArray = new Float32Array(analyser.fftSize);
    micActive = true;
  } else {
    micActive = false;
  }
};

recordBtn.onclick = async () => {
  if (!micActive) return alert("Mic Off!");
  if (mediaRecorder?.state === "recording") {
    mediaRecorder.stop();
    recordBtn.classList.remove("recording");
  } else {
    audioChunks = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: "audio/wav" });
      recordedBuffer = await audioCtx.decodeAudioData(await blob.arrayBuffer());
      recordStatus.textContent = "MEMORY LOADED";
    };
    mediaRecorder.start();
    recordBtn.classList.add("recording");
    recordStatus.textContent = "REC...";
  }
};

playRecordBtn.onclick = () => {
  if (recordedBuffer) isPlayingRecord = !isPlayingRecord;
};
clearRecordBtn.onclick = () => {
  recordedBuffer = null;
  isPlayingRecord = false;
  recordStatus.textContent = "CLEARED";
  setTimeout(() => (recordStatus.textContent = "READY"), 1500);
};

function drawGrid() {
  ctx.fillStyle = "#050a08";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#132620";
  ctx.lineWidth = 0.5;
  for (let i = 0; i < canvas.width; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i < canvas.height; i += 50) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }
  // Axis Lines
  ctx.strokeStyle = "#1e3d35";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
}

function render() {
  drawGrid();
  configOverlay.innerHTML = `CH1: ${waveType.value.toUpperCase()} | ${ampSlider.value}V<br>CH2: ${ch2Enable.checked ? ch2Wave.value.toUpperCase() : "OFF"}<br>MIC: ${micActive ? pitch + "Hz" : "OFF"}`;

  if (isRunning) time += parseFloat(speedSlider.value) * 0.02;

  // CH1 Draw
  ctx.beginPath();
  ctx.strokeStyle = "#00ffcc";
  ctx.lineWidth = 2;
  for (let x = 0; x < canvas.width; x++) {
    let y =
      Math.sin(
        ((x + parseInt(ch1X.value)) / canvas.width) * 5 * Math.PI * 2 + time,
      ) *
      ampSlider.value *
      10;
    if (waveType.value === "square") y = Math.sign(y) * ampSlider.value * 10;
    if (waveType.value === "triangle")
      y =
        ((Math.asin(
          Math.sin(
            ((x + parseInt(ch1X.value)) / canvas.width) * 5 * Math.PI * 2 +
              time,
          ),
        ) *
          2) /
          Math.PI) *
        ampSlider.value *
        10;
    ctx.lineTo(x, canvas.height / 2 + parseInt(ch1Pos.value) - y);
  }
  ctx.stroke();

  // CH2 Draw
  if (ch2Enable.checked) {
    ctx.beginPath();
    ctx.strokeStyle = "#ffff00";
    for (let x = 0; x < canvas.width; x++) {
      let y =
        Math.sin((x / canvas.width) * 5 * Math.PI * 2 + time * 0.8) *
        ch2Amp.value *
        10;
      ctx.lineTo(x, canvas.height / 2 + parseInt(ch2Pos.value) - y);
    }
    ctx.stroke();
  }

  // Mic Draw
  if (micActive && analyser) {
    analyser.getFloatTimeDomainData(dataArray);
    ctx.beginPath();
    ctx.strokeStyle = "#ff66aa";
    for (let i = 0; i < dataArray.length; i++) {
      ctx.lineTo(
        (i / dataArray.length) * canvas.width,
        canvas.height / 2 + parseInt(micPos.value) - dataArray[i] * 100,
      );
    }
    ctx.stroke();
    const fData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(fData);
    pitch = (
      (fData.indexOf(Math.max(...fData)) * audioCtx.sampleRate) /
      analyser.fftSize
    ).toFixed(0);
    fftCtx.fillStyle = "#020806";
    fftCtx.fillRect(0, 0, fftCanvas.width, fftCanvas.height);
    for (let i = 0; i < 128; i++) {
      fftCtx.fillStyle = `hsl(${180 + i},100%,50%)`;
      fftCtx.fillRect(
        i * (fftCanvas.width / 128),
        fftCanvas.height - (fData[i] / 255) * fftCanvas.height,
        fftCanvas.width / 128 - 1,
        fftCanvas.height,
      );
    }
  }

  // Playback Draw
  if (isPlayingRecord && recordedBuffer) {
    const d = recordedBuffer.getChannelData(0);
    ctx.beginPath();
    ctx.strokeStyle = "#fff";
    for (let x = 0; x < canvas.width; x++) {
      ctx.lineTo(
        x,
        canvas.height / 2 - d[Math.floor((x / canvas.width) * d.length)] * 100,
      );
    }
    ctx.stroke();
  }
  requestAnimationFrame(render);
}
render();
