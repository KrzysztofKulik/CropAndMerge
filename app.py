from flask import Flask, render_template, request, jsonify, send_file, url_for
from PIL import Image, ImageDraw
import io
import base64
import os
from werkzeug.utils import secure_filename
import uuid
import tempfile

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['TEMP_FOLDER'] = 'temp'

# Ensure directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['TEMP_FOLDER'], exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def image_to_base64(image):
    """Convert PIL Image to base64 string"""
    buffer = io.BytesIO()
    image.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(filepath)
        
        # Open image and get dimensions
        try:
            with Image.open(filepath) as img:
                width, height = img.size
                img_base64 = image_to_base64(img)
                
            return jsonify({
                'success': True,
                'filename': unique_filename,
                'width': width,
                'height': height,
                'image_data': img_base64
            })
        except Exception as e:
            return jsonify({'error': f'Error processing image: {str(e)}'}), 500
    
    return jsonify({'error': 'Invalid file type. Please upload PNG, JPG, JPEG, or GIF files.'}), 400

@app.route('/merge', methods=['POST'])
def merge_images():
    try:
        data = request.get_json()
        base_image_filename = data.get('base_image')
        overlay_image_filename = data.get('overlay_image')
        transform = data.get('transform', {})
        
        if not base_image_filename or not overlay_image_filename:
            return jsonify({'error': 'Both base and overlay images are required'}), 400
        
        # Load base image
        base_path = os.path.join(app.config['UPLOAD_FOLDER'], base_image_filename)
        overlay_path = os.path.join(app.config['UPLOAD_FOLDER'], overlay_image_filename)
        
        if not os.path.exists(base_path) or not os.path.exists(overlay_path):
            return jsonify({'error': 'One or both images not found'}), 404
        
        with Image.open(base_path) as base_img:
            base_img = base_img.convert('RGBA')
            base_width, base_height = base_img.size
            
            with Image.open(overlay_path) as overlay_img:
                overlay_img = overlay_img.convert('RGBA')
                
                # Apply transformations
                x = int(transform.get('x', 0))
                y = int(transform.get('y', 0))
                scale = float(transform.get('scale', 1.0))
                
                # Scale overlay image
                if scale != 1.0:
                    new_width = int(overlay_img.width * scale)
                    new_height = int(overlay_img.height * scale)
                    overlay_img = overlay_img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # Create a new image with the same size as base
                result = Image.new('RGBA', (base_width, base_height), (0, 0, 0, 0))
                
                # Paste overlay image first (underneath)
                if x < base_width and y < base_height:
                    result.paste(overlay_img, (x, y), overlay_img)
                
                # Paste base image on top
                result.paste(base_img, (0, 0), base_img)
                
                # Convert back to RGB for PNG saving
                final_result = Image.new('RGB', (base_width, base_height), (255, 255, 255))
                final_result.paste(result, mask=result.split()[-1])
                
                # Save to temporary file
                temp_filename = f"{uuid.uuid4()}_merged.png"
                temp_path = os.path.join(app.config['TEMP_FOLDER'], temp_filename)
                final_result.save(temp_path, 'PNG')
                
                # Convert to base64 for preview
                img_base64 = image_to_base64(final_result)
                
                return jsonify({
                    'success': True,
                    'merged_image': img_base64,
                    'download_filename': temp_filename
                })
                
    except Exception as e:
        return jsonify({'error': f'Error merging images: {str(e)}'}), 500

@app.route('/download/<filename>')
def download_file(filename):
    try:
        filepath = os.path.join(app.config['TEMP_FOLDER'], filename)
        if os.path.exists(filepath):
            return send_file(filepath, as_attachment=True, download_name='merged_image.png')
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': f'Error downloading file: {str(e)}'}), 500

@app.route('/get-default-image')
def get_default_image():
    """Return default base image information"""
    try:
        default_image_path = os.path.join('static', 'images', 'default-base.png')
        if os.path.exists(default_image_path):
            with Image.open(default_image_path) as img:
                width, height = img.size
                img_base64 = image_to_base64(img)
                
            # Copy to uploads folder with unique name
            unique_filename = f"default_base_{uuid.uuid4()}.png"
            upload_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            with Image.open(default_image_path) as img:
                img.save(upload_path)
            
            return jsonify({
                'success': True,
                'filename': unique_filename,
                'width': width,
                'height': height,
                'image_data': img_base64
            })
        else:
            return jsonify({'success': False, 'error': 'Default image not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))