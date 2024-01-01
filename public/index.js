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
