// Worksheet Template Manager
// Handles template definitions, PDF parsing, and template editing

class WorksheetTemplateManager {
    constructor() {
        this.currentTemplate = null;
        this.editableElements = [];
        this.uploadedPdfData = null;
    }

    // Pre-built template definitions
    getTemplates() {
        return [
            {
                id: 'blank',
                name: 'Blank Template',
                description: 'Start from scratch or upload your own PDF',
                icon: 'fa-file-alt',
                category: 'general'
            },
            {
                id: 'math-basic',
                name: 'Math Worksheet',
                description: 'Basic math problems with answer key',
                icon: 'fa-calculator',
                category: 'math',
                structure: {
                    title: 'Math Practice Worksheet',
                    subtitle: 'Name: _______________ Date: _______________',
                    sections: [
                        {
                            type: 'text',
                            content: 'Solve the following problems:',
                            editable: true
                        },
                        {
                            type: 'questions',
                            count: 10,
                            format: 'numbered',
                            questions: [
                                '5 + 3 = ___',
                                '12 - 7 = ___',
                                '8 × 2 = ___',
                                '16 ÷ 4 = ___',
                                '9 + 6 = ___',
                                '20 - 5 = ___',
                                '7 × 3 = ___',
                                '24 ÷ 6 = ___',
                                '11 + 9 = ___',
                                '30 - 12 = ___'
                            ],
                            editable: true
                        }
                    ]
                }
            },
            {
                id: 'reading-comprehension',
                name: 'Reading Comprehension',
                description: 'Reading passage with questions',
                icon: 'fa-book-open',
                category: 'english',
                structure: {
                    title: 'Reading Comprehension',
                    subtitle: 'Name: _______________ Date: _______________',
                    sections: [
                        {
                            type: 'text',
                            content: 'Read the passage below and answer the questions.',
                            editable: true
                        },
                        {
                            type: 'passage',
                            content: 'The sun was setting over the horizon, painting the sky in shades of orange and pink. Birds flew home to their nests as the day came to an end.',
                            editable: true
                        },
                        {
                            type: 'questions',
                            count: 5,
                            format: 'numbered',
                            questions: [
                                'What time of day is described in the passage?',
                                'What colors are mentioned in the sky?',
                                'Where are the birds going?',
                                'What is happening to the day?',
                                'How would you describe the mood of this passage?'
                            ],
                            editable: true
                        }
                    ]
                }
            },
            {
                id: 'vocabulary',
                name: 'Vocabulary Builder',
                description: 'Word definitions and usage practice',
                icon: 'fa-spell-check',
                category: 'english',
                structure: {
                    title: 'Vocabulary Practice',
                    subtitle: 'Name: _______________ Date: _______________',
                    sections: [
                        {
                            type: 'instructions',
                            content: 'Match each word with its definition and use it in a sentence.',
                            editable: true
                        },
                        {
                            type: 'vocabulary-list',
                            words: [
                                { word: 'Abundant', definition: 'Present in large quantities', editable: true },
                                { word: 'Curious', definition: 'Eager to learn or know', editable: true },
                                { word: 'Diligent', definition: 'Showing care and effort', editable: true },
                                { word: 'Eloquent', definition: 'Fluent and persuasive in speaking', editable: true },
                                { word: 'Generous', definition: 'Willing to give and share', editable: true }
                            ]
                        }
                    ]
                }
            },
            {
                id: 'science-lab',
                name: 'Science Lab Report',
                description: 'Structured lab report template',
                icon: 'fa-flask',
                category: 'science',
                structure: {
                    title: 'Science Lab Report',
                    subtitle: 'Name: _______________ Date: _______________ Lab #: ___',
                    sections: [
                        {
                            type: 'field',
                            label: 'Hypothesis:',
                            lines: 3,
                            editable: true
                        },
                        {
                            type: 'field',
                            label: 'Materials:',
                            lines: 4,
                            editable: true
                        },
                        {
                            type: 'field',
                            label: 'Procedure:',
                            lines: 6,
                            editable: true
                        },
                        {
                            type: 'field',
                            label: 'Observations:',
                            lines: 5,
                            editable: true
                        },
                        {
                            type: 'field',
                            label: 'Conclusion:',
                            lines: 4,
                            editable: true
                        }
                    ]
                }
            }
        ];
    }

    // Parse PDF and extract editable elements
    async parsePdfToTemplate(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            const template = {
                id: 'custom-upload',
                name: file.name.replace('.pdf', ''),
                description: 'Uploaded PDF converted to editable template',
                originalFile: file.name,
                pages: []
            };

            // Process each page
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const viewport = page.getViewport({ scale: 1.5 });

                // Extract text items with positions
                const textItems = textContent.items.map((item, index) => ({
                    id: `text-${pageNum}-${index}`,
                    type: 'text',
                    content: item.str,
                    x: item.transform[4],
                    y: item.transform[5],
                    width: item.width,
                    height: item.height,
                    fontSize: Math.round(item.transform[0]),
                    editable: true
                }));

                // Render page to canvas for image extraction
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                template.pages.push({
                    pageNumber: pageNum,
                    width: viewport.width,
                    height: viewport.height,
                    elements: textItems,
                    backgroundImage: canvas.toDataURL('image/png')
                });
            }

            this.currentTemplate = template;
            this.uploadedPdfData = arrayBuffer;
            return template;
        } catch (error) {
            console.error('Error parsing PDF:', error);
            throw new Error('Failed to parse PDF. Please try another file.');
        }
    }

    // Generate template selection UI
    generateTemplateSelectionUI() {
        const templates = this.getTemplates();
        const categories = [...new Set(templates.map(t => t.category || 'general'))];

        let html = `
            <div class="template-selection">
                <div class="template-header">
                    <h3>Choose a Template or Upload Your PDF</h3>
                    <p>Select a pre-built template or upload an existing PDF to convert into an editable worksheet</p>
                </div>

                <div class="template-upload-section">
                    <div class="upload-area" id="templateUploadArea">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <h4>Upload Existing PDF</h4>
                        <p>Convert your PDF into an editable template</p>
                        <input type="file" id="templateFileInput" accept=".pdf" style="display: none;">
                        <button class="btn-primary" onclick="document.getElementById('templateFileInput').click()">
                            Browse Files
                        </button>
                    </div>
                </div>

                <div class="template-divider">
                    <span>OR CHOOSE A TEMPLATE</span>
                </div>

                <div class="template-categories">
        `;

        categories.forEach(category => {
            const categoryTemplates = templates.filter(t => (t.category || 'general') === category);
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

            html += `
                <div class="template-category">
                    <h4>${categoryName}</h4>
                    <div class="template-grid">
            `;

            categoryTemplates.forEach(template => {
                html += `
                    <div class="template-card" data-template-id="${template.id}">
                        <div class="template-icon">
                            <i class="fas ${template.icon}"></i>
                        </div>
                        <h5>${template.name}</h5>
                        <p>${template.description}</p>
                        <button class="btn-secondary" onclick="worksheetManager.selectTemplate('${template.id}')">
                            Use Template
                        </button>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        return html;
    }

    // Select a pre-built template
    selectTemplate(templateId) {
        const templates = this.getTemplates();
        const template = templates.find(t => t.id === templateId);

        if (!template) {
            alert('Template not found');
            return;
        }

        this.currentTemplate = template;
        this.showTemplateEditor(template);
    }

    // Show template editor UI
    showTemplateEditor(template) {
        let html = `
            <div class="template-editor">
                <div class="editor-header">
                    <h3>Edit Template: ${template.name}</h3>
                    <p>Click on any text to edit. Add or remove questions as needed.</p>
                </div>

                <div class="editor-toolbar">
                    <button class="btn-secondary" onclick="worksheetManager.addQuestion()">
                        <i class="fas fa-plus"></i> Add Question
                    </button>
                    <button class="btn-secondary" onclick="worksheetManager.addTextBlock()">
                        <i class="fas fa-text-height"></i> Add Text
                    </button>
                    <button class="btn-secondary" onclick="worksheetManager.addImage()">
                        <i class="fas fa-image"></i> Add Image
                    </button>
                    <button class="btn-primary" onclick="worksheetManager.generatePdf()">
                        <i class="fas fa-file-pdf"></i> Generate PDF
                    </button>
                </div>

                <div class="editor-preview" id="editorPreview">
        `;

        // Render template preview based on type
        if (template.id === 'custom-upload' && template.pages) {
            // Render uploaded PDF pages
            template.pages.forEach((page, index) => {
                html += `
                    <div class="page-preview" data-page="${index}">
                        <div class="page-background" style="background-image: url('${page.backgroundImage}'); width: ${page.width}px; height: ${page.height}px;">
                `;

                page.elements.forEach(element => {
                    if (element.type === 'text' && element.editable) {
                        html += `
                            <div class="editable-element"
                                 data-element-id="${element.id}"
                                 style="position: absolute; left: ${element.x}px; top: ${element.y}px; font-size: ${element.fontSize}px;"
                                 contenteditable="true">
                                ${element.content}
                            </div>
                        `;
                    }
                });

                html += `
                        </div>
                    </div>
                `;
            });
        } else if (template.structure) {
            // Render pre-built template structure
            html += `
                <div class="template-content">
                    <div class="template-title" contenteditable="true">${template.structure.title}</div>
                    <div class="template-subtitle" contenteditable="true">${template.structure.subtitle}</div>
            `;

            template.structure.sections.forEach((section, index) => {
                html += this.renderSection(section, index);
            });

            html += `
                </div>
            `;
        }

        html += `
                </div>
            </div>
        `;

        // Update modal content
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = html;

        // Attach event listeners for editing
        this.attachEditorListeners();
    }

    // Render different section types
    renderSection(section, index) {
        let html = '';

        switch (section.type) {
            case 'text':
            case 'instructions':
            case 'passage':
                html = `
                    <div class="template-section" data-section-index="${index}">
                        <div class="section-content" contenteditable="${section.editable}">${section.content}</div>
                    </div>
                `;
                break;

            case 'questions':
                html = `
                    <div class="template-section questions-section" data-section-index="${index}">
                        <div class="questions-list">
                `;
                section.questions.forEach((question, qIndex) => {
                    html += `
                        <div class="question-item" data-question-index="${qIndex}">
                            <span class="question-number">${qIndex + 1}.</span>
                            <div class="question-content" contenteditable="${section.editable}">${question}</div>
                            <button class="btn-icon" onclick="worksheetManager.removeQuestion(${index}, ${qIndex})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                });
                html += `
                        </div>
                    </div>
                `;
                break;

            case 'vocabulary-list':
                html = `
                    <div class="template-section vocab-section" data-section-index="${index}">
                        <div class="vocab-list">
                `;
                section.words.forEach((wordItem, wIndex) => {
                    html += `
                        <div class="vocab-item" data-vocab-index="${wIndex}">
                            <div class="vocab-word" contenteditable="${wordItem.editable}"><strong>${wordItem.word}:</strong></div>
                            <div class="vocab-definition" contenteditable="${wordItem.editable}">${wordItem.definition}</div>
                            <div class="vocab-sentence" contenteditable="true">Sentence: ________________________</div>
                        </div>
                    `;
                });
                html += `
                        </div>
                    </div>
                `;
                break;

            case 'field':
                html = `
                    <div class="template-section field-section" data-section-index="${index}">
                        <div class="field-label" contenteditable="${section.editable}">${section.label}</div>
                        <div class="field-lines">
                `;
                for (let i = 0; i < section.lines; i++) {
                    html += `<div class="field-line">_________________________________________________</div>`;
                }
                html += `
                        </div>
                    </div>
                `;
                break;
        }

        return html;
    }

    // Attach event listeners for template editor
    attachEditorListeners() {
        // Track changes to editable elements
        const editableElements = document.querySelectorAll('[contenteditable="true"]');
        editableElements.forEach(element => {
            element.addEventListener('blur', (e) => {
                this.updateElementContent(e.target);
            });
        });

        // Handle file upload for custom PDF
        const fileInput = document.getElementById('templateFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const modalBody = document.getElementById('modalBody');
                        modalBody.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Parsing PDF...</p></div>';

                        const template = await this.parsePdfToTemplate(file);
                        this.showTemplateEditor(template);
                    } catch (error) {
                        alert(error.message);
                    }
                }
            });
        }
    }

    // Update element content when edited
    updateElementContent(element) {
        const elementId = element.dataset.elementId;
        const sectionIndex = element.dataset.sectionIndex;
        const newContent = element.textContent || element.innerHTML;

        // Store updated content
        if (this.currentTemplate && elementId) {
            // Update in template data structure
            console.log('Updated element:', elementId, newContent);
        }
    }

    // Add new question to template
    addQuestion() {
        alert('Add question functionality - to be implemented');
    }

    // Remove question from template
    removeQuestion(sectionIndex, questionIndex) {
        const questionItem = document.querySelector(`[data-question-index="${questionIndex}"]`);
        if (questionItem && confirm('Remove this question?')) {
            questionItem.remove();
            // Renumber remaining questions
            this.renumberQuestions(sectionIndex);
        }
    }

    // Renumber questions after deletion
    renumberQuestions(sectionIndex) {
        const section = document.querySelector(`[data-section-index="${sectionIndex}"]`);
        if (section) {
            const questions = section.querySelectorAll('.question-item');
            questions.forEach((q, index) => {
                q.dataset.questionIndex = index;
                const numberSpan = q.querySelector('.question-number');
                if (numberSpan) {
                    numberSpan.textContent = `${index + 1}.`;
                }
            });
        }
    }

    // Add text block
    addTextBlock() {
        alert('Add text block functionality - to be implemented');
    }

    // Add image to template
    addImage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = document.createElement('img');
                    img.src = event.target.result;
                    img.style.maxWidth = '200px';
                    img.style.margin = '10px';
                    img.className = 'template-image';

                    const preview = document.getElementById('editorPreview');
                    if (preview) {
                        preview.appendChild(img);
                    }
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    }

    // Generate PDF from edited template
    async generatePdf() {
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();

            // Get all content from editor
            const preview = document.getElementById('editorPreview');
            if (!preview) {
                throw new Error('Editor preview not found');
            }

            // For custom uploaded PDFs, use pdf-lib to maintain formatting
            if (this.currentTemplate.id === 'custom-upload' && this.uploadedPdfData) {
                await this.generatePdfFromUpload(pdf, preview);
            } else {
                // For pre-built templates, generate from scratch
                await this.generatePdfFromTemplate(pdf, preview);
            }

            // Download the generated PDF
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `${this.currentTemplate.name}_${timestamp}.pdf`;
            pdf.save(filename);

            // Show success message
            alert('Worksheet generated successfully!');

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        }
    }

    // Generate PDF from uploaded template with modifications
    async generatePdfFromUpload(jsPDFInstance, preview) {
        const { PDFDocument } = PDFLib;

        // Load original PDF
        const pdfDoc = await PDFDocument.load(this.uploadedPdfData);
        const pages = pdfDoc.getPages();

        // Get edited content
        const pageElements = preview.querySelectorAll('.page-preview');

        pageElements.forEach((pageEl, pageIndex) => {
            const page = pages[pageIndex];
            if (!page) return;

            // Get all edited text elements
            const editableElements = pageEl.querySelectorAll('.editable-element');

            // Note: Modifying text in existing PDFs is complex with pdf-lib
            // For MVP, we'll export as new PDF with edited content overlaid
            // This is a simplified implementation
        });

        // Save and return modified PDF
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });

        // Download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${this.currentTemplate.name}_edited.pdf`;
        link.click();
    }

    // Generate PDF from pre-built template
    async generatePdfFromTemplate(pdf, preview) {
        const content = preview.querySelector('.template-content');
        if (!content) {
            throw new Error('Template content not found');
        }

        let yPosition = 20;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 20;
        const maxWidth = pageWidth - 2 * margin;

        // Add title
        const title = content.querySelector('.template-title');
        if (title) {
            pdf.setFontSize(18);
            pdf.setFont(undefined, 'bold');
            pdf.text(title.textContent, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 10;
        }

        // Add subtitle
        const subtitle = content.querySelector('.template-subtitle');
        if (subtitle) {
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            pdf.text(subtitle.textContent, margin, yPosition);
            yPosition += 15;
        }

        // Add sections
        const sections = content.querySelectorAll('.template-section');
        sections.forEach((section) => {
            // Check if we need a new page
            if (yPosition > pageHeight - 40) {
                pdf.addPage();
                yPosition = 20;
            }

            // Handle different section types
            if (section.classList.contains('questions-section')) {
                pdf.setFontSize(11);
                const questions = section.querySelectorAll('.question-item');
                questions.forEach((q) => {
                    const number = q.querySelector('.question-number').textContent;
                    const content = q.querySelector('.question-content').textContent;
                    const text = `${number} ${content}`;

                    // Split text if too long
                    const lines = pdf.splitTextToSize(text, maxWidth - 10);
                    lines.forEach((line) => {
                        if (yPosition > pageHeight - 20) {
                            pdf.addPage();
                            yPosition = 20;
                        }
                        pdf.text(line, margin + 5, yPosition);
                        yPosition += 7;
                    });
                    yPosition += 3; // Extra space between questions
                });
            } else if (section.classList.contains('vocab-section')) {
                pdf.setFontSize(11);
                const vocabItems = section.querySelectorAll('.vocab-item');
                vocabItems.forEach((item) => {
                    const word = item.querySelector('.vocab-word').textContent;
                    const definition = item.querySelector('.vocab-definition').textContent;

                    if (yPosition > pageHeight - 30) {
                        pdf.addPage();
                        yPosition = 20;
                    }

                    pdf.setFont(undefined, 'bold');
                    pdf.text(word, margin, yPosition);
                    yPosition += 6;

                    pdf.setFont(undefined, 'normal');
                    const defLines = pdf.splitTextToSize(definition, maxWidth - 10);
                    defLines.forEach((line) => {
                        pdf.text(line, margin + 5, yPosition);
                        yPosition += 6;
                    });
                    yPosition += 8;
                });
            } else if (section.classList.contains('field-section')) {
                const label = section.querySelector('.field-label');
                if (label) {
                    pdf.setFontSize(11);
                    pdf.setFont(undefined, 'bold');
                    pdf.text(label.textContent, margin, yPosition);
                    yPosition += 8;
                }

                const lines = section.querySelectorAll('.field-line');
                pdf.setFont(undefined, 'normal');
                lines.forEach(() => {
                    if (yPosition > pageHeight - 20) {
                        pdf.addPage();
                        yPosition = 20;
                    }
                    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
                    yPosition += 8;
                });
                yPosition += 5;
            } else {
                // Generic text section
                const sectionContent = section.querySelector('.section-content');
                if (sectionContent) {
                    pdf.setFontSize(11);
                    pdf.setFont(undefined, 'normal');
                    const lines = pdf.splitTextToSize(sectionContent.textContent, maxWidth);
                    lines.forEach((line) => {
                        if (yPosition > pageHeight - 20) {
                            pdf.addPage();
                            yPosition = 20;
                        }
                        pdf.text(line, margin, yPosition);
                        yPosition += 7;
                    });
                    yPosition += 5;
                }
            }
        });
    }
}

// Global instance
const worksheetManager = new WorksheetTemplateManager();
