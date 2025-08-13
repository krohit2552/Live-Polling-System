import React, { useState } from 'react';
import TeacherView from './components/TeacherView';
import StudentView from './components/StudentView';
import './App.css';

function App() {
  const [persona, setPersona] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);

  const selectPersona = (selectedPersona) => {
    setPersona(selectedPersona);
  };

  const resetPersona = () => {
    setPersona(null);
    setSelectedRole(null);
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
  };

  const handleContinue = () => {
    if (selectedRole) {
      selectPersona(selectedRole);
    }
  };

  if (!persona) {
    return (
      <div className="App">
        <div style={{ textAlign: 'center', maxWidth: '800px', padding: '20px' }}>
          {/* Intervue Poll Badge */}
          <div className="intervue-badge">
            <div className="star-icon">★</div>
            Intervue Poll
          </div>
          
          {/* Main Title */}
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: '700', 
            color: '#333', 
            marginBottom: '16px' 
          }}>
            Welcome to the Live Polling System
          </h1>
          
          {/* Subtitle */}
          <p style={{ 
            fontSize: '16px', 
            color: '#666', 
            marginBottom: '32px',
            maxWidth: '500px',
            margin: '0 auto 32px auto'
          }}>
            Please select the role that best describes you to begin using the live polling system
          </p>
          
          {/* Role Selection Cards */}
          <div className="role-selection">
            <div 
              className={`role-card ${selectedRole === 'student' ? 'selected' : ''}`}
              onClick={() => handleRoleSelect('student')}
            >
              <div className="role-title">I'm a Student</div>
              <div className="role-description">
                Submit answers and view live poll results in real-time.
              </div>
            </div>
            
            <div 
              className={`role-card ${selectedRole === 'teacher' ? 'selected' : ''}`}
              onClick={() => handleRoleSelect('teacher')}
            >
              <div className="role-title">I'm a Teacher</div>
              <div className="role-description">
                Create polls, monitor results, and manage student participation.
              </div>
            </div>
          </div>
          
          {/* Continue Button */}
          <button 
            className="continue-btn" 
            onClick={handleContinue}
            disabled={!selectedRole}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {persona === 'teacher' ? (
        <TeacherView onReset={resetPersona} />
      ) : (
        <StudentView onReset={resetPersona} />
      )}
    </div>
  );
}

export default App;
