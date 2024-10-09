const express = require('express');
const ytdl = require('ytdl-core');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 5000;
const cors = require('cors');


app.use(cors());


const upload = multer({ dest: 'uploads/' });



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
