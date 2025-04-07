import React, { useState, useEffect, useRef } from 'react';
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
  const [combinedImageName, setCombinedImageName] = useState(null);

  const MAX_WIDTH = 800;
  const MAX_HEIGHT = 600;

  // Fetch the combined image name from the backend when the component mounts.
  useEffect(() => {
    fetch('http://localhost:8000/api/get-combined-image')
      .then(res => res.json())
      .then(data => {
        setCombinedImageName(data.combinedImageName);
      })
      .catch(err => {
        console.error("Error fetching combined image:", err);
        setCombinedImageName(null);
      });
  }, []);

  // Helper to get accurate mouse position on the canvas.
  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Handle image upload: send the image to the server and load it for preview.
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    fetch('http://localhost:8000/api/upload-image', {
      method: 'POST',
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Uploaded file:", data.filename);
        setPicName(data.filename);
        // Load the image locally for preview.
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

  // Draw the image and boxes on the canvas.
  const drawCanvas = (img, boxesArray, scale = scaleFactor) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (img) {
      ctx.drawImage(img, 0, 0, img.width * scale, img.height * scale);
    }
    boxesArray.forEach((box) => {
      const [x1Orig, y1Orig, x2Orig, y2Orig] = box;
      const x1 = x1Orig * scale;
      const y1 = y1Orig * scale;
      const x2 = x2Orig * scale;
      const y2 = y2Orig * scale;
      ctx.beginPath();
      ctx.rect(x1, y1, x2 - x1, y2 - y1);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "red";
      ctx.stroke();
    });
  };

  // Mouse event handlers.
  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    setStartPos(pos);
    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);
    const x1 = Math.min(startPos.x, pos.x);
    const y1 = Math.min(startPos.y, pos.y);
    const x2 = Math.max(startPos.x, pos.x);
    const y2 = Math.max(startPos.y, pos.y);
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
    const pos = getMousePos(e);
    const x1 = Math.min(startPos.x, pos.x);
    const y1 = Math.min(startPos.y, pos.y);
    const x2 = Math.max(startPos.x, pos.x);
    const y2 = Math.max(startPos.y, pos.y);
    const newBox = [x1 / scaleFactor, y1 / scaleFactor, x2 / scaleFactor, y2 / scaleFactor];
    const updatedBoxes = [...boxes, newBox];
    setBoxes(updatedBoxes);
    drawCanvas(image, updatedBoxes, scaleFactor);
    console.log("Recorded Boxes (Original Scale):", updatedBoxes);
  };

  // Undo the last drawn box.
  const handleUndo = () => {
    const updatedBoxes = boxes.slice(0, -1);
    setBoxes(updatedBoxes);
    drawCanvas(image, updatedBoxes, scaleFactor);
  };

  // Save boxes and picture name to server to trigger segmentation.
  const handleSegmentation = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/save-boxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boxes, picName }),
      });
      if (response.ok) {
        setProcessing(true);
      } else {
        console.error("Failed to send boxes and picName");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Use Combined Image: load the combined image from the uploads folder.
  const handleUseCombinedImage = () => {
    if (!combinedImageName) return;
    const url = `http://localhost:8000/uploads/${combinedImageName}`;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const scale = Math.min(MAX_WIDTH / img.width, MAX_HEIGHT / img.height, 1);
      setScaleFactor(scale);
      const canvas = canvasRef.current;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      drawCanvas(img, [], scale); // clear any existing boxes.
      setImage(img);
      setPicName(combinedImageName);
      setBoxes([]);
    };
    img.src = url;
  };

  // Clear cache (remove segmented images and result.json).
  const handleClearCache = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/clear-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        alert("Cache cleared successfully!");
      } else {
        alert("Failed to clear cache.");
      }
    } catch (error) {
      console.error("Error clearing cache:", error);
      alert("Error clearing cache.");
    }
  };

  // Poll the backend for segmented images, then navigate to the segmented images page.
  useEffect(() => {
    let intervalId;
    if (processing) {
      intervalId = setInterval(() => {
        fetch('http://localhost:8000/api/generated-images')
          .then((res) => res.json())
          .then((data) => {
            if (data.images && data.images.length > 0) {
              clearInterval(intervalId);
              setProcessing(false);
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

  // Redraw canvas when image or boxes change.
  useEffect(() => {
    drawCanvas(image, boxes, scaleFactor);
  }, [image, boxes, scaleFactor]);

  return (
    <div className="card my-3">
      <div className="card-body">
        <h3 className="card-title">Annotate Image</h3>
        <p className="card-text">
          Upload an image, draw boxes to select areas of interest, then click <strong>Segment!</strong> to process.
        </p>
        <div className="mb-3">
          <label className="form-label"><strong>Select Image:</strong></label>
          <input className="form-control" type="file" accept="image/*" onChange={handleImageUpload} />
        </div>
        <div className="mb-3">
          <button className="btn btn-secondary me-2" onClick={handleUndo} disabled={boxes.length === 0}>
            Undo Last Box
          </button>
          <button className="btn btn-primary me-2" onClick={handleSegmentation} disabled={!picName || boxes.length === 0}>
            Segment!
          </button>
          <button className="btn btn-info me-2" onClick={handleUseCombinedImage} disabled={!combinedImageName}>
            Use Combined Image
          </button>
          <button className="btn btn-danger" onClick={handleClearCache}>
            Remove Cache
          </button>
        </div>
        <div className="row">
          <div className="col-md-8">
            <canvas
              ref={canvasRef}
              style={{ border: '1px solid #ccc', cursor: 'crosshair', width: '100%', maxHeight: '500px' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            />
          </div>
          <div className="col-md-4">
            <h5>Recorded Boxes (Original Scale)</h5>
            <pre style={{ background: '#f8f9fa', padding: '10px' }}>{JSON.stringify(boxes, null, 2)}</pre>
          </div>
        </div>
      </div>
      {processing && (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p-4 text-center">
              <h5>Segmenting Image, please wait...</h5>
              <div className="progress mt-3">
                <div className="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageAnnotation;
