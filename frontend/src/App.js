import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function App() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null); // Lưu interval để quản lý

  const startInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current); // Xóa interval cũ nếu có

    intervalRef.current = setInterval(async () => {
      try {
        const response = await axios.get('http://localhost:3001/status');
        console.log(response.data);

        const progressValue = (response.data.processed / response.data.total) * 100;
        setProgress(progressValue);

        if (progressValue >= 100) {
          clearInterval(intervalRef.current);
          intervalRef.current = null; // Reset
          setLoading(false);
        }
      } catch (error) {
        console.error(error);
      }
    }, 1000);
  };

  useEffect(() => {
    return () => clearInterval(intervalRef.current); // Cleanup khi unmount
  }, []);

  const sendMessages = async () => {
    setLoading(true);
    setProgress(0);

    try {
      await axios.post('http://localhost:3001/send-messages');
      startInterval(); // Bắt đầu theo dõi tiến trình
    } catch (error) {
      console.error(error);
    }

    
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>RabbitMQ Consumer Status</h1>
      <button onClick={sendMessages} disabled={loading}>
        {loading ? 'Sending...' : 'Send 10,000 Messages'}
      </button>
      <div style={{ width: '80%', margin: '20px auto', background: '#ddd', height: '30px', borderRadius: '5px' }}>
        <div style={{
          width: `${progress}%`,
          background: 'green',
          height: '100%',
          borderRadius: '5px',
          transition: 'width 0.5s'
        }}></div>
      </div>
      <p>{Math.round(progress)}% completed</p>
    </div>
  );
}

export default App;
