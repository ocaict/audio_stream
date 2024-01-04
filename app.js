const express = require("express");
const { stat, createReadStream, createWriteStream } = require("fs");
const path = require("path");
const http = require("http");
const ffmpegClient = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
ffmpegClient.setFfmpegPath(ffmpegPath);

const Server = require("socket.io").Server;

const audioFiles = [
  "newyear.wav",
  "demo.mp3",
  "ad.mp3",
  "audio.mp3",
  "speech.mp3",
];
let currentFileIndex = 0; // Track the current audio file index
const app = express();
app.use(express.static("public"));

app.get("/ocamedia/:file", (req, res) => {
  const file = req.params.file;
  if (!audioFiles.includes(file)) {
    return res.status(404).send("File not found");
  }

  // const fileName = audioFiles[currentFileIndex];
  const filePath = path.join(__dirname, "audio", file);
  const statPromise = new Promise((resolve, reject) => {
    stat(filePath, (err, stats) => {
      if (err) {
        reject(err);
      } else {
        resolve(stats);
      }
    });
  });

  statPromise
    .then((stats) => {
      const fileSize = stats.size;
      const range = req.headers.range;

      let start = 0;
      let end = fileSize - 1;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        start = parseInt(parts[0], 10);
        end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      }

      const chunkSize = end - start + 1;
      const stream = createReadStream(filePath, { start, end });

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "audio/mpeg",
      });

      stream.pipe(res);

      stream.on("end", () => {
        // Move to the next audio file index
        currentFileIndex = (currentFileIndex + 1) % audioFiles.length;
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Internal Server Error");
    });
});

const port = process.env.PORT || 3600;
const expressServer = app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

const io = new Server(expressServer);

io.on("connection", (socket) => {
  // console.log(`Connected : ${socket.id}`);
  socket.on("audioEnded", () => {
    currentFileIndex = (currentFileIndex + 1) % audioFiles.length;
    const nextAudio = audioFiles[currentFileIndex];
    console.log(nextAudio);
    socket.emit("playNext", nextAudio);
  });

  socket.on("audio", (audioBlob) => {
    // Save the audio file on the server
    const fileName = "newRecord.mp3"; // You may change the file name and extension
    const filePath = __dirname + "/audio/" + fileName;

    const tempFilePath = "temp_audio.webm";
    const writeStream = createWriteStream(tempFilePath);
    writeStream.write(audioBlob);
    writeStream.end(() => {
      // Convert to MP3 using ffmpeg
      ffmpegClient(tempFilePath)
        .toFormat("mp3")
        .save(filePath)
        .on("end", () => {
          // Handle successful conversion
          currentFileIndex = 0;
          audioFiles.unshift(fileName);
          const nextAudio = audioFiles[0];
          io.emit("playNext", nextAudio);
        })
        .on("error", (err) => {
          // Handle errors
          console.log(err);
        });
    });
  });
});

app.get("/new", (req, res) => {
  currentFileIndex = 0;
  const nextAudio = audioFiles[0];
  io.emit("playNext", nextAudio);
  return res.send("Filed Added");
});
