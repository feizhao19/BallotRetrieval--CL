import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ImageAnnotation() {
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const [image, setImage] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [scaleFactor, setScaleFactor] = useState(1);
  const [picName, setPicName] = useState('');
  const [processing, setProcessing] = useState(false);

  const MAX_WIDTH = 800;
  const MAX_HEIGHT = 600;

  // Handle image upload: upload file to server and then load it into the canvas.
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    fetch('http://127.0.0.1:5000/api/upload-image', {
      method: 'POST',
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Uploaded file:", data.filename);
        setPicName(data.filename);
        // Now load the image into the canvas.
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const scale = Math.min(MAX_WIDTH / img.width, MAX_HEIGHT / img.height, 1);
            setScaleFactor(scale);
            const canvas = canvasRef.current;
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            drawCanvas(img, boxes, scale);
          };
          img.src = event.target.result;
          setImage(img);
        };
        reader.readAsDataURL(file);
      })
      .catch((error) => {
        console.error("Error uploading file:", error);
      });
  };

  // Draw image and boxes onto the canvas.
  const drawCanvas = (img, boxesArray, scale = scaleFactor) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (img) {
      ctx.drawImage(img, 0, 0, img.width * scale, img.height * scale);
    }
    boxesArray.forEach((box) => {
      const [origX1, origY1, origX2, origY2] = box;
      const x1 = origX1 * scale;
      const y1 = origY1 * scale;
      const x2 = origX2 * scale;
      const y2 = origY2 * scale;
      ctx.beginPath();
      ctx.rect(x1, y1, x2 - x1, y2 - y1);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "red";
      ctx.stroke();
    });
  };

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    setStartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    const x1 = Math.min(startPos.x, currentX);
    const y1 = Math.min(startPos.y, currentY);
    const x2 = Math.max(startPos.x, currentX);
    const y2 = Math.max(startPos.y, currentY);
    drawCanvas(image, boxes, scaleFactor);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.rect(x1, y1, x2 - x1, y2 - y1);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "red";
    ctx.stroke();
  };

  const handleMouseUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const rect = canvasRef.current.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    const x1Scaled = Math.min(startPos.x, endX);
    const y1Scaled = Math.min(startPos.y, endY);
    const x2Scaled = Math.max(startPos.x, endX);
    const y2Scaled = Math.max(startPos.y, endY);
    const newBox = [
      x1Scaled / scaleFactor,
      y1Scaled / scaleFactor,
      x2Scaled / scaleFactor,
      y2Scaled / scaleFactor,
    ];
    const updatedBoxes = [...boxes, newBox];
    setBoxes(updatedBoxes);
    drawCanvas(image, updatedBoxes, scaleFactor);
    console.log("Recorded Boxes (Original Scale):", updatedBoxes);
  };

  const handleUndo = () => {
    const updatedBoxes = boxes.slice(0, -1);
    setBoxes(updatedBoxes);
    drawCanvas(image, updatedBoxes, scaleFactor);
  };

  // Save boxes and picture name to the server, triggering segment_anything.py.
  const handleSaveBoxes = async () => {
    console.log("Saving boxes, picName:", picName, "boxes:", boxes);
    try {
      const response = await fetch('http://127.0.0.1:5000/api/save-boxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boxes, picName }),
      });
      if (response.ok) {
        console.log("Boxes and picName sent successfully");
        // Show progress modal and start polling for segmented images.
        setProcessing(true);
      } else {
        console.error("Failed to send boxes and picName");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Poll the backend by checking the /api/generated-images endpoint.
  useEffect(() => {
    let intervalId;
    if (processing) {
      // Poll every 3 seconds.
      intervalId = setInterval(() => {
        fetch('http://127.0.0.1:5000/api/generated-images')
          .then((res) => res.json())
          .then((data) => {
            // If segmented images exist, consider segmentation complete.
            if (data.images && data.images.length > 0) {
              clearInterval(intervalId);
              setProcessing(false);
              // Navigate to the segmented images page.
              navigate('/segmented');
            }
          })
          .catch((error) => {
            console.log("Segmentation not complete yet...", error);
          });
      }, 3000);
    }
    return () => clearInterval(intervalId);
  }, [processing, navigate]);

  useEffect(() => {
    drawCanvas(image, boxes, scaleFactor);
  }, [image, boxes, scaleFactor]);

  return (
    <div>
      <h2>Image Annotation with React</h2>
      <input type="file" accept="image/*" onChange={handleImageUpload} />
      <button onClick={handleUndo} disabled={boxes.length === 0}>
        Undo Last Box
      </button>
      <button onClick={handleSaveBoxes} disabled={!picName || boxes.length === 0}>
        Save Boxes
      </button>
      <br /><br />
      <canvas
        ref={canvasRef}
        style={{ border: '1px solid #ccc', cursor: 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
      <div>
        <h3>Recorded Boxes (Original Scale: [x1, y1, x2, y2])</h3>
        <pre>{JSON.stringify(boxes, null, 2)}</pre>
      </div>
      {/* Progress Modal */}
      {processing && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.modal}>
            <h3>Segmenting Image, please wait...</h3>
            <div style={modalStyles.progressBarContainer}>
              <div style={modalStyles.progressBar}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
    width: '300px',
  },
  progressBarContainer: {
    marginTop: '15px',
    width: '100%',
    height: '10px',
    backgroundColor: '#ddd',
    borderRadius: '5px',
    overflow: 'hidden',
  },
  progressBar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4caf50',
    animation: 'progress 2s infinite',
  },
};

const style = document.createElement('style');
style.innerHTML = `
@keyframes progress {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(0); }
  100% { transform: translateX(100%); }
}
`;
document.head.appendChild(style);

export default ImageAnnotation;
