class ImageEditor {
    constructor() {
        this.baseImage = null;
        this.overlayImage = null;
        this.baseImageData = null;
        this.overlayImageData = null;
        this.canvas = document.getElementById('previewCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Transform properties for overlay image
        this.overlayTransform = {
            x: 0,
            y: 0,
            scale: 1.0
        };
        
        // Interaction state
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };
        this.canvasRect = null;
        
        this.initializeEventListeners();
        this.loadDefaultBaseImage();
    }

    async loadDefaultBaseImage() {
        try {
            const response = await fetch('/get-default-image');
            const result = await response.json();

            if (result.success) {
                this.baseImageData = result;
                this.displayImagePreview('baseImagePreview', result.image_data);
                this.setupCanvas(result.width, result.height);
                this.showMessage('Obraz górny został wczytany automatycznie', 'success');
            }
        } catch (error) {
            console.log('Nie udało się wczytać domyślnego obrazu:', error);
        }
    }

    initializeEventListeners() {
        // File upload handlers
        document.getElementById('baseImageInput').addEventListener('change', (e) => {
            this.handleFileUpload(e, 'base');
        });

        document.getElementById('overlayImageInput').addEventListener('change', (e) => {
            this.handleFileUpload(e, 'overlay');
        });

        // Canvas interaction handlers
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));

        // Button handlers
        document.getElementById('updatePreview').addEventListener('click', this.updatePreview.bind(this));
        document.getElementById('mergeImages').addEventListener('click', this.mergeImages.bind(this));
        document.getElementById('resetImages').addEventListener('click', this.resetImages.bind(this));

        // Prevent context menu on canvas
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    async handleFileUpload(event, type) {
        const file = event.target.files[0];
        if (!file) return;

        this.showLoading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                if (type === 'base') {
                    this.baseImageData = result;
                    this.displayImagePreview('baseImagePreview', result.image_data);
                    this.setupCanvas(result.width, result.height);
                } else {
                    this.overlayImageData = result;
                    this.displayImagePreview('overlayImagePreview', result.image_data);
                }

                this.checkIfReadyForEditing();
            } else {
                this.showMessage('Błąd: ' + result.error, 'error');
            }
        } catch (error) {
            this.showMessage('Błąd podczas przesyłania pliku: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayImagePreview(containerId, imageData) {
        const container = document.getElementById(containerId);
        container.innerHTML = `<img src="${imageData}" alt="Preview">`;
    }

    setupCanvas(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.maxWidth = '100%';
        this.canvas.style.height = 'auto';
    }

    onMouseDown(event) {
        if (!this.baseImageData || !this.overlayImageData) return;
        
        this.canvasRect = this.canvas.getBoundingClientRect();
        const mouseX = (event.clientX - this.canvasRect.left) * (this.canvas.width / this.canvasRect.width);
        const mouseY = (event.clientY - this.canvasRect.top) * (this.canvas.height / this.canvasRect.height);
        
        // Check if mouse is over the overlay image
        if (this.isMouseOverOverlay(mouseX, mouseY)) {
            this.isDragging = true;
            this.lastMousePos = { x: mouseX, y: mouseY };
            this.canvas.classList.add('dragging');
        }
    }

    onMouseMove(event) {
        if (!this.isDragging || !this.canvasRect) return;
        
        const mouseX = (event.clientX - this.canvasRect.left) * (this.canvas.width / this.canvasRect.width);
        const mouseY = (event.clientY - this.canvasRect.top) * (this.canvas.height / this.canvasRect.height);
        
        // Calculate delta movement
        const deltaX = mouseX - this.lastMousePos.x;
        const deltaY = mouseY - this.lastMousePos.y;
        
        // Update overlay position
        this.overlayTransform.x += deltaX;
        this.overlayTransform.y += deltaY;
        
        // Keep within canvas bounds (optional - remove if you want free movement)
        this.overlayTransform.x = Math.max(-this.getOverlayWidth(), 
            Math.min(this.canvas.width, this.overlayTransform.x));
        this.overlayTransform.y = Math.max(-this.getOverlayHeight(), 
            Math.min(this.canvas.height, this.overlayTransform.y));
        
        this.lastMousePos = { x: mouseX, y: mouseY };
        this.updatePreview();
        this.updateDisplays();
    }

    onMouseUp(event) {
        this.isDragging = false;
        this.canvas.classList.remove('dragging');
    }

    onWheel(event) {
        if (!this.baseImageData || !this.overlayImageData) return;
        
        event.preventDefault();
        
        const scaleChange = event.deltaY > 0 ? 0.9 : 1.1; // Scroll down = smaller, up = bigger
        const newScale = this.overlayTransform.scale * scaleChange;
        
        // Limit scale between 0.1 and 3.0
        this.overlayTransform.scale = Math.max(0.1, Math.min(3.0, newScale));
        
        this.updatePreview();
        this.updateDisplays();
    }

    isMouseOverOverlay(mouseX, mouseY) {
        const overlayWidth = this.getOverlayWidth();
        const overlayHeight = this.getOverlayHeight();
        
        return mouseX >= this.overlayTransform.x && 
               mouseX <= this.overlayTransform.x + overlayWidth &&
               mouseY >= this.overlayTransform.y && 
               mouseY <= this.overlayTransform.y + overlayHeight;
    }

    getOverlayWidth() {
        return this.overlayImageData ? this.overlayImageData.width * this.overlayTransform.scale : 0;
    }

    getOverlayHeight() {
        return this.overlayImageData ? this.overlayImageData.height * this.overlayTransform.scale : 0;
    }

    updateDisplays() {
        document.getElementById('positionDisplay').textContent = 
            `X: ${Math.round(this.overlayTransform.x)}, Y: ${Math.round(this.overlayTransform.y)}`;
        document.getElementById('scaleDisplay').textContent = 
            `${Math.round(this.overlayTransform.scale * 100)}%`;
    }

    checkIfReadyForEditing() {
        if (this.baseImageData && this.overlayImageData) {
            document.getElementById('controlsSection').style.display = 'block';
            document.getElementById('previewSection').style.display = 'block';
            
            // Reset transform to center the overlay image
            this.overlayTransform.x = (this.canvas.width - this.overlayImageData.width) / 2;
            this.overlayTransform.y = (this.canvas.height - this.overlayImageData.height) / 2;
            this.overlayTransform.scale = 1.0;
            
            this.updatePreview();
            this.updateDisplays();
        }
    }

    updatePreview() {
        if (!this.baseImageData || !this.overlayImageData) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Load and draw overlay image first (underneath)
        const overlayImg = new Image();
        overlayImg.onload = () => {
            const scaledWidth = this.overlayImageData.width * this.overlayTransform.scale;
            const scaledHeight = this.overlayImageData.height * this.overlayTransform.scale;
            
            this.ctx.drawImage(overlayImg, 
                this.overlayTransform.x, 
                this.overlayTransform.y, 
                scaledWidth, 
                scaledHeight);

            // Load and draw base image on top
            const baseImg = new Image();
            baseImg.onload = () => {
                this.ctx.drawImage(baseImg, 0, 0);
            };
            baseImg.src = this.baseImageData.image_data;
        };
        overlayImg.src = this.overlayImageData.image_data;
    }

    async mergeImages() {
        if (!this.baseImageData || !this.overlayImageData) {
            this.showMessage('Najpierw wczytaj oba obrazy', 'error');
            return;
        }

        this.showLoading(true);

        const transform = {
            x: Math.round(this.overlayTransform.x),
            y: Math.round(this.overlayTransform.y),
            scale: this.overlayTransform.scale
        };

        const requestData = {
            base_image: this.baseImageData.filename,
            overlay_image: this.overlayImageData.filename,
            transform: transform
        };

        try {
            const response = await fetch('/merge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();

            if (result.success) {
                this.displayResult(result.merged_image, result.download_filename);
                this.showMessage('Obrazy zostały pomyślnie połączone!', 'success');
            } else {
                this.showMessage('Błąd podczas łączenia obrazów: ' + result.error, 'error');
            }
        } catch (error) {
            this.showMessage('Błąd podczas łączenia obrazów: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayResult(imageData, downloadFilename) {
        const resultSection = document.getElementById('resultSection');
        const resultPreview = document.getElementById('resultPreview');
        const downloadLink = document.getElementById('downloadLink');

        resultPreview.innerHTML = `<img src="${imageData}" alt="Merged Image">`;
        downloadLink.href = `/download/${downloadFilename}`;
        downloadLink.style.display = 'inline-block';
        
        resultSection.style.display = 'block';
        resultSection.scrollIntoView({ behavior: 'smooth' });
    }

    resetImages() {
        // Reset form inputs
        document.getElementById('baseImageInput').value = '';
        document.getElementById('overlayImageInput').value = '';

        // Clear previews
        document.getElementById('baseImagePreview').innerHTML = '';
        document.getElementById('overlayImagePreview').innerHTML = '';

        // Reset transform
        this.overlayTransform = {
            x: 0,
            y: 0,
            scale: 1.0
        };
        
        // Reset interaction state
        this.isDragging = false;
        this.canvas.classList.remove('dragging');

        // Hide sections
        document.getElementById('controlsSection').style.display = 'none';
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('resultSection').style.display = 'none';

        // Clear canvas
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Reset data
        this.baseImageData = null;
        this.overlayImageData = null;

        this.showMessage('Aplikacja została zresetowana', 'success');
    }

    showLoading(show) {
        const loadingSpinner = document.getElementById('loadingSpinner');
        loadingSpinner.style.display = show ? 'block' : 'none';
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;

        // Insert at the top of container
        const container = document.querySelector('.container');
        container.insertBefore(messageDiv, container.firstChild);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ImageEditor();

    // Add some helpful tooltips and UI improvements
    const tooltips = {
        'baseImageInput': 'Wybierz obraz, który będzie na górze (na wierzchu)',
        'overlayImageInput': 'Wybierz obraz, który będzie pod spodem',
        'previewCanvas': 'Przeciągnij obraz dolny, aby go przesunąć. Użyj kółka myszy do skalowania.'
    };

    Object.entries(tooltips).forEach(([id, tooltip]) => {
        const element = document.getElementById(id);
        if (element) {
            element.title = tooltip;
        }
    });
});