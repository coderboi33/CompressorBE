const express = require('express');
const ytdl = require('ytdl-core');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 5000;
const cors = require('cors'); // Import CORS

// Enable CORS for all routes
app.use(cors()); // Allow all origins (for development)

// Setup Multer to handle PDF uploads
const upload = multer({ dest: 'uploads/' });

// YouTube Video Downloader Route
app.get('/download', async (req, res) => {
    const videoURL = req.query.url;
    const format = req.query.format;

    console.log(`Received request to download video from: ${videoURL} in format: ${format}`);

    if (!ytdl.validateURL(videoURL)) {
        return res.status(400).send('Invalid YouTube URL');
    }

    try {
        const stream = ytdl(videoURL, {
            quality: format === 'mp4' ? 'highest' : 'highestaudio',
        });

        const fileName = `video.${format}`;
        res.header('Content-Disposition', `attachment; filename="${fileName}"`);

        // Logging the stream event
        stream.on('info', (info) => {
            console.log(`Downloading: ${info.videoDetails.title}`);
        });

        stream.on('error', (err) => {
            console.error('Error while downloading video:', err);
            res.status(500).send('Error downloading video');
        });

        stream.pipe(res);
    } catch (error) {
        console.error('Error handling the request:', error);
        res.status(500).send('Error processing request');
    }
});


// PDF Compressor Route
app.post('/compress', upload.single('pdf'), async (req, res) => {
    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);

    const pdfDoc = await PDFDocument.load(buffer);
    const pages = pdfDoc.getPages();

    for (let page of pages) {
        const { width, height } = page.getSize();

        const images = page.node.Image;
        if (images) {
            for (let image of images) {
                const compressedImage = await sharp(image.data)
                    .jpeg({ quality: 50 })
                    .toBuffer();
                image.set(compressedImage);
            }
        }
    }

    const compressedPdfBytes = await pdfDoc.save();
    const compressedFilePath = path.join(__dirname, 'compressed.pdf');
    fs.writeFileSync(compressedFilePath, compressedPdfBytes);

    // Send compressed file as a response
    res.download(compressedFilePath, 'compressed.pdf');
});

// Start the server
app.listen(port);
