import os
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS, cross_origin
import subprocess
from datetime import datetime
import base64



app = Flask(__name__, static_url_path='/static')
CORS(app, resources={r"/*": {"origins": "*"}})

# Folder to save uploaded images.
UPLOAD_FOLDER = os.path.join(app.root_path, "uploads")
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/')
def index():
    return "Hello, Flask is running!"

# Endpoint to handle image uploads.
@app.route('/api/upload-image', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image part in request'}), 400
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    # In production, use secure_filename() from Werkzeug.
    filename = file.filename  
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)
    return jsonify({'filename': filename}), 200

# Endpoint to serve uploaded images.
@app.route('/uploads/<filename>')
@cross_origin()
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# Endpoint to receive boxes and pic name, save them, and trigger segmentation.
@app.route('/api/save-boxes', methods=['POST'])
def save_boxes():
    data = request.get_json()
    boxes = data.get('boxes')
    picName = data.get('picName')
    # Save the input data to a JSON file that segment_anything.py can read.
    input_data = {
        'picName': picName,
        'boxes': boxes
    }
    with open('input_data.json', 'w') as f:
        json.dump(input_data, f)
    # Trigger the segmentation script.
    try:
        subprocess.Popen(["python", "segment_anything.py"])

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    return jsonify({'success': True}), 200

@app.route('/api/generated-images', methods=['GET'])
def get_generated_images():
    # Adjust the path below to where your segmented images are stored.
    folder_path = os.path.join(app.root_path, 'static', 'segmented_images')
    # Get all .png files that start with 'segmented_'
    try:
        files = [
            f for f in os.listdir(folder_path)
            if f.startswith('segmented_') and f.endswith('.png')
        ]
    except Exception as e:
        files = []
    return jsonify({'images': files})

@app.route('/api/result', methods=['GET'])
def get_result():
    try:
        with open('result.json', 'r') as f:
            data = json.load(f)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/calculate-similarity', methods=['POST'])
def calculate_similarity():
    try:
        # This will run model.py and wait for it to finish.
        process = subprocess.run(["python", "model.py"], capture_output=True, text=True, check=True)
        print("Model stdout:", process.stdout)
        print("Model stderr:", process.stderr)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    return jsonify({'success': True}), 200

@app.route('/api/clear-cache', methods=['POST'])
def clear_cache():
    # Delete segmented images and uploaded images
    segmented_folder = os.path.join(app.root_path, 'static', 'segmented_images')
    if os.path.exists(segmented_folder):
        for filename in os.listdir(segmented_folder):
            file_path = os.path.join(segmented_folder, filename)
            if os.path.isfile(file_path):
                os.remove(file_path)
    uploaded_folder = os.path.join(app.root_path, 'uploads')
    if os.path.exists(uploaded_folder):
        for filename in os.listdir(uploaded_folder):
            file_path = os.path.join(uploaded_folder, filename)
            if os.path.isfile(file_path):
                os.remove(file_path)
    
    # set result to be -1 to show the result hasn't been calculateed
    similarity_data = {
    "similarity1": -1,
    "similarity2": -1,
    "similarity3": -1,
    "overall_similarity": -1
    }

    # Write to result.json
    with open("result.json", "w") as f:
        json.dump(similarity_data, f, indent=4)
    
    # erase the input_data
    with open("input_data.json", "w") as f:
        f.write("{}")

    return jsonify({'success': True}), 200

@app.route('/api/export-combined', methods=['POST'])
def export_combined():
    data = request.get_json()
    combined_data_url = data.get('combinedImage')
    if not combined_data_url:
        return jsonify({"error": "No combined image provided"}), 400
    # Expecting a data URL of the form "data:image/png;base64,...."
    try:
        header, encoded = combined_data_url.split(',', 1)
        image_data = base64.b64decode(encoded)
    except Exception as e:
        return jsonify({"error": "Invalid image data", "details": str(e)}), 400
    # Generate a unique filename using timestamp.
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filename = f"combined_{timestamp}.png"
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    with open(file_path, 'wb') as f:
        f.write(image_data)
    # Update input_data.json with the combined image name.
    input_file = os.path.join(app.root_path, "input_data.json")
    try:
        with open(input_file, "r") as f:
            input_data = json.load(f)
    except Exception:
        input_data = {}
    input_data["combinedImageName"] = filename
    with open(input_file, "w") as f:
        json.dump(input_data, f)
    return jsonify({"success": True, "filename": filename}), 200

@app.route('/api/get-combined-image', methods=['GET'])
def get_combined_image():
    input_file = os.path.join(app.root_path, "input_data.json")
    combined_name = None
    if os.path.exists(input_file):
        try:
            with open(input_file, "r") as f:
                data = json.load(f)
            combined_name = data.get("combinedImageName")
        except Exception as e:
            print("Error reading input_data.json:", e)
    if combined_name:
        file_path = os.path.join(app.root_path, "uploads", combined_name)
        if not os.path.exists(file_path):
            combined_name = None
    return jsonify({"combinedImageName": combined_name}), 200

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)



'''from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})  # global config

@app.route('/')
def index():
    return "Hello, Flask is running!"

@app.route('/api/save-boxes', methods=['POST', 'OPTIONS'])
def save_boxes():
    if request.method == "OPTIONS":
        return jsonify(success=True), 200
    data = request.get_json()
    boxes = data.get('boxes')
    with open('boxes.json', 'w') as f:
        json.dump(boxes, f)
    return jsonify(success=True), 200

@app.route('/api/generated-images', methods=['GET'])
def get_generated_images():
    # Adjust the path below to where your segmented images are stored.
    folder_path = os.path.join(app.root_path, 'static', 'segmented_images')
    # Get all .png files that start with 'segmented_'
    try:
        files = [
            f for f in os.listdir(folder_path)
            if f.startswith('segmented_') and f.endswith('.png')
        ]
    except Exception as e:
        files = []
    return jsonify({'images': files})

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
'''