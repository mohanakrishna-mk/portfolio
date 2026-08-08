import React, { useState } from 'react';

export default function App() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [responseMsg, setResponseMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a file first.');
      return;
    }

    setIsLoading(true);
    setResponseMsg('');
    setIsError(false);

    // Construct FormData matching FastAPI's expected parameters
    const formData = new FormData();
    formData.append('file', file);
    if (message) {
      formData.append('message', message);
    }

    try {
      // Send request to your FastAPI Secure Gateway
      const res = await fetch('http://localhost:8000/api/v1/upload', {
        method: 'POST',
        body: formData,
        // IMPORTANT: Do NOT manually set 'Content-Type': 'multipart/form-data'. 
        // The browser automatically generates it with the correct unique boundary.
      });

      const data = await res.json();

      if (!res.ok) {
        setIsError(true);
        // Display backend error message (e.g. malware detection 400 or validation errors)
        setResponseMsg(data.message || 'Upload failed due to a security violation or error.');
      } else {
        setIsError(false);
        setResponseMsg('File passed security scan and was successfully uploaded!');
        console.log('Downstream Response:', data);
      }
    } catch (err) {
      setIsError(true);
      setResponseMsg('Network error: Unable to reach the secure gateway service.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '450px', margin: '40px auto', padding: '24px', fontFamily: 'Arial, sans-serif', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h2>Secure Gateway File Upload</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Select File:</label>
          <input type="file" onChange={handleFileChange} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Message (Optional):</label>
          <input 
            type="text" 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            placeholder="Enter metadata message..." 
            style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          style={{ 
            width: '100%', 
            padding: '12px', 
            backgroundColor: isLoading ? '#cccccc' : '#007bff', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {isLoading ? 'Scanning & Uploading...' : 'Upload Securely'}
        </button>
      </form>

      {responseMsg && (
        <div style={{ 
          marginTop: '20px', 
          padding: '12px', 
          backgroundColor: isError ? '#ffe6e6' : '#e6ffed', 
          color: isError ? '#cc0000' : '#006622',
          borderRadius: '4px',
          border: `1px solid ${isError ? '#ffcccc' : '#ccffcc'}`
        }}>
          <strong>{isError ? 'Security Alert / Error: ' : 'Success: '}</strong> {responseMsg}
        </div>
      )}
    </div>
  );
}
