const socket = io();
const audio = new Audio("./ocamedia/ad.mp3");

// audio.autoplay = true;

socket.on("playNext", (nextAudioFile) => {
  audio.src = `/ocamedia/${nextAudioFile}`;
  audio.play();
});

audio.addEventListener("ended", () => {
  socket.emit("audioEnded");
});

const playBtn = document.querySelector(".play-btn");
const playIcon = "&#9658;";
const pauseIcon = "&#x23F8;";
playBtn.addEventListener("click", () => {
  if (audio.paused) {
    playBtn.innerHTML = pauseIcon;
    audio.play();
  } else {
    playBtn.innerHTML = playIcon;
    audio.pause();
  }
});

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");

let audioChunks = [];
let mediaRecorder;

startBtn.addEventListener("click", () => {
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      mediaRecorder = new MediaRecorder(stream);

      audio.pause();
      mediaRecorder.start();
      console.log("Recording started");

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/mp3" });

        const reader = new FileReader();
        reader.readAsArrayBuffer(audioBlob);
        reader.onload = () => {
          const buffer = reader.result;
          socket.emit("audio", buffer);
          // Sending audio data to the server
        };

        audioChunks = [];
      };
    })
    .catch((err) => {
      console.error("Error accessing microphone:", err);
    });
});

stopBtn.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    console.log("Recording stopped");
  }
});
