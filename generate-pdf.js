const puppeteer = require('puppeteer');
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const renderHTML = async (htmlPath, outputPath) => {
    return new Promise((resolve, reject) => {
        const dataPath = path.join(__dirname, 'data.json');
        const data = readData(dataPath);
        console.log(data);
        ejs.renderFile(htmlPath, data, (err, html) => {
            if (err) {
                reject(err);
                return;
            }
            fs.writeFileSync(outputPath, html);
            resolve(outputPath);
        });
    })
}

const generatePDF = async (htmlPath, outputPath) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle2' });

    const pdfOptions = {
        path: outputPath,
        format: 'A4',
    };

    await page.pdf(pdfOptions);
    await browser.close();
    return outputPath;
}

const readData = (dataPath) => {
    const jsonData = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(jsonData);
    return data;
}

const generate = async (outputDirectory, fileName) => {
    const htmlPath = path.join(__dirname, 'index.html');
    const renderedHTMLPath = await renderHTML(htmlPath, path.join(outputDirectory, 'rendered_index.html'));
    const pdfPath = await generatePDF(renderedHTMLPath, path.join(outputDirectory, fileName));
    return pdfPath
}

module.exports = {
    generate,
    renderHTML
}

