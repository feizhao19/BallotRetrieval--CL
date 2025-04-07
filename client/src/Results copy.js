import React, { useState, useEffect } from 'react';

function Results() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/result')
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not OK");
        }
        return response.json();
      })
      .then((data) => {
        setResult(data);
      })
      .catch((error) => {
        console.error("Error fetching result:", error);
        setError(error.message);
      });
  }, []);

  return (
    <div style={styles.container}>
      <h2>Similarity Results</h2>
      {error && <div style={styles.error}>Error: {error}</div>}
      {!error && !result && <div>Loading...</div>}
      {result && (
        <div style={styles.resultsBox}>
          <div><strong>Similarity 1:</strong> {result.similarity1}</div>
          <div><strong>Similarity 2:</strong> {result.similarity2}</div>
          <div><strong>Similarity 3:</strong> {result.similarity3}</div>
          <div><strong>Overall Similarity:</strong> {result.overall_similarity}</div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    fontFamily: 'Arial, sans-serif'
  },
  resultsBox: {
    border: '1px solid #ccc',
    borderRadius: '4px',
    padding: '15px',
    marginTop: '20px',
    backgroundColor: '#f9f9f9'
  },
  error: {
    color: 'red'
  }
};

export default Results;
