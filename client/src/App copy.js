import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ImageAnnotation from './ImageAnnotation';
import SegmentedImages from './SegmentedImages';
import Results from './Results';

function App() {
  return (
    <Router>
      <nav style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>
        <Link to="/" style={{ marginRight: '15px' }}>Annotate Image</Link>
        <Link to="/segmented" style={{ marginRight: '15px' }}>View Segmented Images</Link>
        <Link to="/results">View Results</Link>
      </nav>
      <Routes>
        <Route path="/" element={<ImageAnnotation />} />
        <Route path="/segmented" element={<SegmentedImages />} />
        <Route path="/results" element={<Results />} />
      </Routes>
    </Router>
  );
}

export default App;
