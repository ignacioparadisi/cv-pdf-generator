const express = require('express');
const path = require('path');
const fs = require('fs');
const { generate, renderHTML } = require('./generate-pdf');

const app = express();
const port = 3000;

app.get('/', async (req, res) => {
    let tempDir = path.join(__dirname, 'tmp', 'files');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }
    let htmlPath = await renderHTML(path.join(__dirname, 'index.html'), path.join(tempDir, 'rendered_index.html'))
    res.sendFile(htmlPath, () => {
        fs.rmSync(tempDir, { recursive: true });
    });
});

app.get('/pdf', async (req, res) => {
    let tempDir = path.join(__dirname, 'tmp', 'files');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }
    let pdfPath = await generate(tempDir, 'cv.pdf');
    res.sendFile(pdfPath, () => {
        fs.rmSync(tempDir, { recursive: true });
    });
});

app.get('/css', async (req, res) => {
    res.sendFile(path.join(__dirname, 'tailwind.css'));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})