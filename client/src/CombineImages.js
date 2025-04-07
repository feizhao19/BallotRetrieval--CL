import React, { useState } from 'react';

function CombineImages() {
  const [image1, setImage1] = useState(null);
  const [image2, setImage2] = useState(null);
  const [combinedImage, setCombinedImage] = useState(null);
  const [exportedName, setExportedName] = useState(null);

  // Handle file selection and load image along with its metadata.
  const handleFileChange = (e, setImage) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Determine orientation based on natural dimensions.
        const orientation = img.naturalWidth >= img.naturalHeight ? "landscape" : "portrait";
        setImage({
          src: event.target.result,
          width: img.naturalWidth,
          height: img.naturalHeight,
          orientation: orientation,
          img: img, // save the Image object for later drawing
        });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Combine images based on their orientations.
  const combineImages = () => {
    if (!image1 || !image2) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // If both images have the same orientation:
    if (image1.orientation === image2.orientation) {
      if (image1.orientation === "portrait") {
        // Vertical combination.
        const combinedWidth = Math.max(image1.width, image2.width);
        const scale1 = combinedWidth / image1.width;
        const scale2 = combinedWidth / image2.width;
        const newHeight1 = image1.height * scale1;
        const newHeight2 = image2.height * scale2;
        const combinedHeight = newHeight1 + newHeight2;
        canvas.width = combinedWidth;
        canvas.height = combinedHeight;
        ctx.drawImage(image1.img, 0, 0, image1.width * scale1, image1.height * scale1);
        ctx.drawImage(image2.img, 0, newHeight1, image2.width * scale2, image2.height * scale2);
      } else if (image1.orientation === "landscape") {
        // Horizontal combination.
        const combinedHeight = Math.max(image1.height, image2.height);
        const scale1 = combinedHeight / image1.height;
        const scale2 = combinedHeight / image2.height;
        const newWidth1 = image1.width * scale1;
        const newWidth2 = image2.width * scale2;
        const combinedWidth = newWidth1 + newWidth2;
        canvas.width = combinedWidth;
        canvas.height = combinedHeight;
        ctx.drawImage(image1.img, 0, 0, image1.width * scale1, image1.height * scale1);
        ctx.drawImage(image2.img, newWidth1, 0, image2.width * scale2, image2.height * scale2);
      }
    } else {
      // If one image is portrait and one is landscape, combine horizontally.
      const combinedHeight = Math.max(image1.height, image2.height);
      const scale1 = combinedHeight / image1.height;
      const scale2 = combinedHeight / image2.height;
      const newWidth1 = image1.width * scale1;
      const newWidth2 = image2.width * scale2;
      const combinedWidth = newWidth1 + newWidth2;
      canvas.width = combinedWidth;
      canvas.height = combinedHeight;
      ctx.drawImage(image1.img, 0, 0, image1.width * scale1, image1.height * scale1);
      ctx.drawImage(image2.img, newWidth1, 0, image2.width * scale2, image2.height * scale2);
    }
    const dataURL = canvas.toDataURL();
    setCombinedImage(dataURL);
  };

  // Export the combined image by sending it to the backend.
  const handleExportCombined = async () => {
    if (!combinedImage) {
      alert("No combined image available to export.");
      return;
    }
    try {
      const response = await fetch('http://127.0.0.1:5000/api/export-combined', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ combinedImage }),
      });
      if (response.ok) {
        const data = await response.json();
        setExportedName(data.filename);
        alert(`Combined image exported as ${data.filename}`);
      } else {
        alert("Failed to export combined image.");
      }
    } catch (error) {
      console.error("Error exporting combined image:", error);
      alert("Error exporting combined image.");
    }
  };

  return (
    <div className="container my-3">
      <h2>Combine Images</h2>
      <div className="mb-3">
        <label className="form-label">Upload Image 1:</label>
        <input
          type="file"
          accept="image/*"
          className="form-control"
          onChange={(e) => handleFileChange(e, setImage1)}
        />
        {image1 && (
          <div className="mt-2">
            <img src={image1.src} alt="Preview 1" style={{ maxWidth: "100%", maxHeight: "200px" }} />
          </div>
        )}
      </div>
      <div className="mb-3">
        <label className="form-label">Upload Image 2:</label>
        <input
          type="file"
          accept="image/*"
          className="form-control"
          onChange={(e) => handleFileChange(e, setImage2)}
        />
        {image2 && (
          <div className="mt-2">
            <img src={image2.src} alt="Preview 2" style={{ maxWidth: "100%", maxHeight: "200px" }} />
          </div>
        )}
      </div>
      <button className="btn btn-primary me-2" onClick={combineImages} disabled={!(image1 && image2)}>
        Combine Images
      </button>
      {combinedImage && (
        <>
          <div className="mt-4">
            <h4>Combined Image:</h4>
            <img src={combinedImage} alt="Combined result" style={{ width: "100%" }} />
          </div>
          <button className="btn btn-success mt-3" onClick={handleExportCombined}>
            Export Combined
          </button>
          {exportedName && (
            <div className="alert alert-info mt-2">
              Combined image saved as: <strong>{exportedName}</strong>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CombineImages;
