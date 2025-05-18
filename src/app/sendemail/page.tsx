'use client';

import { useState } from 'react';

export default function SendEmail() {
  const [message, setMessage] = useState('');

  const handleClick = async () => {
    try {
      const response = await fetch('/api/send', {
        method: 'POST',
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Email sent successfully!');
        console.log('Email sent:', data);
      } else {
        setMessage(`Error sending email: ${data.error?.message || 'Unknown error'}`);
        console.error('Error sending email:', data.error);
      }
    } catch (error) {
      setMessage(`Error sending email: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Error sending email:', error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <button 
        onClick={handleClick}
        style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
      >
        Send Email
      </button>
      {message && <p style={{ marginTop: '20px' }}>{message}</p>}
    </div>
  );
}