const express = require("express");
const rateLimit = require("express-rate-limit");
const yts = require("yt-search");
const cors = require("cors");
const NodeCache = require("node-cache");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// 🔥 AUTHOR
const AUTHOR = "SUJON-BOSS";

// 🔥 CACHE SYSTEM
const cache = new NodeCache({ stdTTL: 300 });

// 🚫 RATE LIMIT
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many requests, slow down!" }
});
app.use(limiter);

// ⏱️ TIMEOUT
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    res.status(408).json({ error: "Request Timeout" });
  });
  next();
});


// ❤️ ROOT
app.get("/", (req, res) => {
  res.json({
    status: "API success 🚀",
    author: AUTHOR,
    message: "Server is running perfectly"
  });
});


// 🔍 SEARCH API
app.get("/search", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: "No query provided!" });

    const key = `search_${q.toLowerCase()}`;
    const cached = cache.get(key);

    if (cached) {
      return res.json({
        result: cached,
        cached: true,
        author: AUTHOR
      });
    }

    const search = await yts(q);

    const videos = search.videos.slice(0, 10).map((v, i) => ({
      index: i + 1,
      title: v.title,
      url: v.url,
      duration: v.timestamp,
      thumbnail: v.thumbnail,
      views: v.views,
      uploaded: v.ago,
      author: v.author?.name || "Unknown"
    }));

    cache.set(key, videos);

    res.json({
      result: videos,
      cached: false,
      author: AUTHOR
    });

  } catch (e) {
    res.status(500).json({ error: "Search failed", author: AUTHOR });
  }
});


// 🎧 AUDIO
app.get("/audio", (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "No URL provided" });

    const fileName = `audio_${Date.now()}.mp3`;
    const filePath = path.join(__dirname, fileName);

    const cmd = `yt-dlp -x --audio-format mp3 -o "${filePath}" "${url}"`;

    exec(cmd, (error) => {
      if (error) {
        return res.status(500).send("Download failed");
      }

      res.download(filePath, () => {
        fs.unlink(filePath, () => {});
      });
    });

  } catch (e) {
    res.status(500).send("Server error");
  }
});


// 🎬 VIDEO
app.get("/video", (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "No URL provided" });

    const fileName = `video_${Date.now()}.mp4`;
    const filePath = path.join(__dirname, fileName);

    const cmd = `yt-dlp -f best -o "${filePath}" "${url}"`;

    exec(cmd, (error) => {
      if (error) {
        return res.status(500).send("Download failed");
      }

      res.download(filePath, () => {
        fs.unlink(filePath, () => {});
      });
    });

  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});


// 🚀 START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`✅ API success | Author: ${AUTHOR}`);
});
