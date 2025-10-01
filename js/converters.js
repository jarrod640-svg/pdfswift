// PDFSwift - Converter Functions

class PDFConverter {
    constructor() {
        this.currentTool = null;
        this.uploadedFiles = [];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    // PDF to Image Converter
    async pdfToImage(file, format = 'png') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const images = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, `image/${format}`, 0.95);
            });

            images.push({
                blob: blob,
                name: `${file.name.replace('.pdf', '')}_page_${i}.${format}`,
                url: URL.createObjectURL(blob)
            });
        }

        return images;
    }

    // Image to PDF Converter
    async imageToPdf(files) {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        let isFirstPage = true;

        for (const file of files) {
            const img = await this.loadImage(file);

            // Calculate dimensions to fit page
            const imgWidth = img.width;
            const imgHeight = img.height;
            const ratio = imgWidth / imgHeight;

            let pdfWidth = 210; // A4 width in mm
            let pdfHeight = pdfWidth / ratio;

            if (pdfHeight > 297) { // A4 height in mm
                pdfHeight = 297;
                pdfWidth = pdfHeight * ratio;
            }

            if (!isFirstPage) {
                pdf.addPage();
            }

            pdf.addImage(img.src, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            isFirstPage = false;
        }

        const blob = pdf.output('blob');
        return [{
            blob: blob,
            name: 'converted.pdf',
            url: URL.createObjectURL(blob)
        }];
    }

    // Merge PDFs
    async mergePdfs(files) {
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        for (const file of files) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });

        return [{
            blob: blob,
            name: 'merged.pdf',
            url: URL.createObjectURL(blob)
        }];
    }

    // Split PDF
    async splitPdf(file, pageRanges) {
        const { PDFDocument } = PDFLib;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const results = [];

        // If no ranges specified, split into individual pages
        if (!pageRanges || pageRanges.length === 0) {
            for (let i = 0; i < pdf.getPageCount(); i++) {
                const newPdf = await PDFDocument.create();
                const [copiedPage] = await newPdf.copyPages(pdf, [i]);
                newPdf.addPage(copiedPage);

                const pdfBytes = await newPdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });

                results.push({
                    blob: blob,
                    name: `${file.name.replace('.pdf', '')}_page_${i + 1}.pdf`,
                    url: URL.createObjectURL(blob)
                });
            }
        } else {
            // Split based on specified ranges
            for (let rangeIndex = 0; rangeIndex < pageRanges.length; rangeIndex++) {
                const range = pageRanges[rangeIndex];
                const newPdf = await PDFDocument.create();
                const pages = await newPdf.copyPages(pdf, range);
                pages.forEach(page => newPdf.addPage(page));

                const pdfBytes = await newPdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });

                results.push({
                    blob: blob,
                    name: `${file.name.replace('.pdf', '')}_part_${rangeIndex + 1}.pdf`,
                    url: URL.createObjectURL(blob)
                });
            }
        }

        return results;
    }

    // Compress PDF
    async compressPdf(file) {
        const { PDFDocument } = PDFLib;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);

        // Basic compression by re-saving
        const compressedPdfBytes = await pdf.save({
            useObjectStreams: true,
            addDefaultPage: false,
            objectsPerTick: 50
        });

        const blob = new Blob([compressedPdfBytes], { type: 'application/pdf' });
        const originalSize = file.size;
        const compressedSize = blob.size;
        const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

        return [{
            blob: blob,
            name: file.name.replace('.pdf', '_compressed.pdf'),
            url: URL.createObjectURL(blob),
            originalSize: originalSize,
            compressedSize: compressedSize,
            savings: savings
        }];
    }

    // Helper: Load image from file
    loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Helper: Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Helper: Download file
    downloadFile(blob, filename) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
    }

    // Helper: Download all files as ZIP (simple sequential download)
    async downloadAll(files) {
        for (const file of files) {
            this.downloadFile(file.blob, file.name);
            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}

// Create global converter instance
const converter = new PDFConverter();

// UI Builder Functions
function createUploadUI(toolType) {
    const acceptTypes = {
        'pdf-to-image': '.pdf',
        'image-to-pdf': 'image/*',
        'merge-pdf': '.pdf',
        'split-pdf': '.pdf',
        'compress-pdf': '.pdf',
        'pdf-to-word': '.pdf',
        'pdf-to-excel': '.pdf',
        'pdf-to-ppt': '.pdf'
    };

    const multiple = ['image-to-pdf', 'merge-pdf'].includes(toolType);

    return `
        <div class="usage-tracker" id="usageTracker"></div>

        <div class="upload-area" id="uploadArea">
            <div class="upload-icon">
                <i class="fas fa-cloud-upload-alt"></i>
            </div>
            <h3>Drop your file${multiple ? 's' : ''} here</h3>
            <p>or click to browse</p>
            <input type="file"
                   id="fileInput"
                   class="file-input"
                   accept="${acceptTypes[toolType]}"
                   ${multiple ? 'multiple' : ''}>
            <button class="btn-primary" onclick="document.getElementById('fileInput').click()">
                Select File${multiple ? 's' : ''}
            </button>
            <p style="margin-top: 1rem; color: var(--text-light); font-size: 0.9rem;">
                Maximum file size: <span id="maxFileSize">10MB</span>
            </p>
        </div>

        <div id="filesList" style="margin-top: 1.5rem;"></div>
        <div id="convertButton" style="margin-top: 1.5rem; text-align: center;"></div>
    `;
}

function createProcessingUI() {
    return `
        <div class="processing">
            <img src="images/lightning-loader.svg" alt="Processing" style="width: 80px; height: 80px; margin-bottom: 1rem;">
            <h3>Processing your file...</h3>
            <p>This may take a moment</p>
        </div>
    `;
}

function createResultUI(files, toolType) {
    const isCompress = toolType === 'compress-pdf';

    let filesHTML = files.map((file, index) => {
        let fileInfo = `<strong>${file.name}</strong> (${converter.formatFileSize(file.blob.size)})`;

        if (isCompress && file.originalSize) {
            fileInfo += `<br><small style="color: var(--success-color);">
                Reduced by ${file.savings}%
                (${converter.formatFileSize(file.originalSize)} → ${converter.formatFileSize(file.compressedSize)})
            </small>`;
        }

        return `
            <div class="result-file">
                <div>${fileInfo}</div>
                <button class="btn-secondary" onclick="converter.downloadFile(converter.uploadedFiles[${index}].blob, '${file.name}')">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        `;
    }).join('');

    const downloadAllBtn = files.length > 1
        ? `<button class="btn-primary" onclick="converter.downloadAll(converter.uploadedFiles)">
               <i class="fas fa-download"></i> Download All
           </button>`
        : '';

    return `
        <div class="conversion-result">
            <div class="result-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h3>Conversion Complete!</h3>
            <p>Your files are ready to download</p>

            <div class="result-files">
                ${filesHTML}
            </div>

            <div style="display: flex; gap: 1rem; justify-content: center;">
                ${downloadAllBtn}
                <button class="btn-secondary" onclick="location.reload()">
                    <i class="fas fa-redo"></i> Convert Another
                </button>
            </div>
        </div>
    `;
}

function createUpgradePrompt(remainingConversions) {
    return `
        <div class="upgrade-prompt">
            <h3><i class="fas fa-star"></i> You have ${remainingConversions} free conversion${remainingConversions !== 1 ? 's' : ''} left today</h3>
            <p>Upgrade to Pro for unlimited conversions and premium features</p>
            <button class="btn-large" style="background: white; color: var(--primary-color); margin-top: 1rem;"
                    onclick="showPricing()">
                Upgrade Now
            </button>
        </div>
    `;
}

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PDFConverter, converter, createUploadUI, createProcessingUI, createResultUI, createUpgradePrompt };
}
