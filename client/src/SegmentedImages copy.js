import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function SegmentedImages() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/generated-images')
      .then(response => response.json())
      .then(data => {
        const sortedImages = data.images.sort((a, b) => {
          // Split the filename by '_' and '.' to extract the number.
          const numA = parseInt(a.split('_')[2].split('.')[0]);
          const numB = parseInt(b.split('_')[2].split('.')[0]);
          return numA - numB;
        });
        setImages(sortedImages);
      })
      .catch(error => {
        console.error("Error fetching generated images:", error);
      });
  }, []);

  const handleCalculateSimilarity = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/calculate-similarity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        // When finished, navigate to the results page.
        navigate('/results');
      } else {
        console.error("Error calculating similarity");
      }
    } catch (error) {
      console.error("Error calculating similarity:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Sidebar with the image list */}
      <div style={styles.sidebar}>
        <div style={styles.imageListContainer}>
          {images.map((img, index) => (
            <div key={index} style={styles.imageContainer}>
              <img
                src={`/static/segmented_images/${img}`}
                alt={`Segmented ${index}`}
                style={styles.image}
              />
              <div style={styles.imageName}>{img}</div>
            </div>
          ))}
        </div>
        <button onClick={handleCalculateSimilarity} disabled={loading}>
          {loading ? "Calculating..." : "Calculate Similarity"}
        </button>
      </div>
      {/* Main content area (optional) */}
      <div style={styles.mainContent}>
        <h2>Segmented Images</h2>
        {/* Additional content if needed  */}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: '100vh'
  },
  sidebar: {
    width: '300px',
    borderRight: '1px solid #ccc',
    overflowY: 'auto',
    padding: '10px'
  },
  imageListContainer: {
    display: 'flex',
    flexDirection: 'column'
  },
  imageContainer: {
    marginBottom: '15px',
    textAlign: 'center'
  },
  image: {
    width: '100%',
    objectFit: 'contain'
  },
  imageName: {
    marginTop: '5px',
    fontSize: '14px',
    color: '#333'
  },
  mainContent: {
    flex: 1,
    padding: '20px'
  }
};

export default SegmentedImages;
