const puppeteer = require('puppeteer');
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const SUPPORTED_LANGS = ['en', 'es'];
const SUPPORTED_REGIONS = ['MX', 'ES', 'GB'];
const REGION_ALIASES = { UK: 'GB' };
const DEFAULT_LOCALE = 'en-MX';

// Turn a locale string like "es-ES" into a validated { lang, region } pair,
// falling back to the defaults for anything unrecognized.
const parseLocale = (locale) => {
    const [langRaw = '', regionRaw = ''] = String(locale || DEFAULT_LOCALE).split('-');
    const lang = SUPPORTED_LANGS.includes(langRaw.toLowerCase())
        ? langRaw.toLowerCase()
        : DEFAULT_LOCALE.split('-')[0];
    let region = regionRaw.toUpperCase();
    region = REGION_ALIASES[region] || region;
    if (!SUPPORTED_REGIONS.includes(region)) {
        region = DEFAULT_LOCALE.split('-')[1];
    }
    return { lang, region };
};

// Recursively drop any list item tagged with `regions` that doesn't include the
// active region, and strip the `regions` metadata from what remains.
const filterByRegion = (node, region) => {
    if (Array.isArray(node)) {
        return node
            .filter((item) => {
                if (item && typeof item === 'object' && Array.isArray(item.regions)) {
                    return item.regions.includes(region);
                }
                return true;
            })
            .map((item) => filterByRegion(item, region));
    }
    if (node && typeof node === 'object') {
        const out = {};
        for (const [key, value] of Object.entries(node)) {
            if (key === 'regions') continue;
            out[key] = filterByRegion(value, region);
        }
        return out;
    }
    return node;
};

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

// Deep-merge an override object over a base: nested objects merge recursively,
// while arrays and primitives from the override replace the base outright.
const deepMerge = (base, override) => {
    const out = { ...base };
    for (const [key, value] of Object.entries(override)) {
        out[key] = isPlainObject(value) && isPlainObject(out[key])
            ? deepMerge(out[key], value)
            : value;
    }
    return out;
};

const readJSON = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Load the base language file (data.<lang>.json), then layer a region-specific
// override (data.<lang>-<region>.json) on top when one exists. This is the
// standard locale-fallback pattern: e.g. en-GB overrides only what differs from en.
const readData = (lang, region) => {
    let data = readJSON(path.join(__dirname, `data.${lang}.json`));
    const overridePath = path.join(__dirname, `data.${lang}-${region}.json`);
    if (fs.existsSync(overridePath)) {
        data = deepMerge(data, readJSON(overridePath));
    }
    data = filterByRegion(data, region);
    return { ...data, lang, region };
};

const renderHTML = async (htmlPath, outputPath, locale) => {
    const { lang, region } = parseLocale(locale);
    const data = readData(lang, region);
    return new Promise((resolve, reject) => {
        ejs.renderFile(htmlPath, data, (err, html) => {
            if (err) {
                reject(err);
                return;
            }
            fs.writeFileSync(outputPath, html);
            resolve(outputPath);
        });
    });
};

const generatePDF = async (htmlPath, outputPath) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle2' });

    const pdfOptions = {
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
    };

    await page.pdf(pdfOptions);
    await browser.close();
    return outputPath;
};

const generate = async (outputDirectory, fileName, locale) => {
    const htmlPath = path.join(__dirname, 'index.html');
    const renderedHTMLPath = await renderHTML(htmlPath, path.join(outputDirectory, 'rendered_index.html'), locale);
    const pdfPath = await generatePDF(renderedHTMLPath, path.join(outputDirectory, fileName));
    return pdfPath;
};

module.exports = {
    generate,
    renderHTML,
    parseLocale,
};
