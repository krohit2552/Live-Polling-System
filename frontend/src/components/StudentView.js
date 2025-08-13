import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import ChatPopup from './ChatPopup';

const StudentView = ({ onReset }) => {
  const [socket, setSocket] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [activePoll, setActivePoll] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [pollResults, setPollResults] = useState({});
  const [kickedOut, setKickedOut] = useState(false);
  const [participatingStudents, setParticipatingStudents] = useState([]);

  useEffect(() => {
    if (hasJoined) {
      const newSocket = io('http://localhost:5000');
      setSocket(newSocket);

      // Join as student
      newSocket.emit('student-join', {
        id: Date.now().toString(),
        name: studentName,
        joinedAt: new Date()
      });

      // Socket event listeners
      newSocket.on('poll-active', (poll) => {
        setActivePoll(poll);
        setHasAnswered(false);
        setSelectedAnswer(null);
        setTimeLeft(poll.timeLimit);
      });

      newSocket.on('poll-results-update', (data) => {
        setPollResults(data.results);
        setParticipatingStudents(data.participatingStudents || []);
      });

      newSocket.on('poll-ended', (data) => {
        setActivePoll(null);
        setHasAnswered(false);
        setSelectedAnswer(null);
        setTimeLeft(0);
        setPollResults(data.results);
        setParticipatingStudents(data.participatingStudents || []);
      });

      newSocket.on('removed-by-teacher', () => {
        setKickedOut(true);
        newSocket.close();
      });

      return () => newSocket.close();
    }
  }, [hasJoined, studentName]);

  useEffect(() => {
    let timer;
    if (activePoll && timeLeft > 0 && !hasAnswered) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (!hasAnswered && selectedAnswer) {
              handleSubmitAnswer();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activePoll, timeLeft, hasAnswered, selectedAnswer]);

  const handleJoin = () => {
    if (studentName.trim()) {
      setHasJoined(true);
    } else {
      alert('Please enter your name');
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer && !hasAnswered) {
      socket.emit('submit-answer', { answer: selectedAnswer });
      setHasAnswered(true);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Kicked out state
  if (kickedOut) {
    return (
      <div className="App">
        <div style={{ textAlign: 'center', maxWidth: '600px', padding: '20px' }}>
          <div className="intervue-badge">
            <div className="star-icon">★</div>
            Intervue Poll
          </div>
          
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: '700', 
            color: '#333', 
            marginBottom: '24px' 
          }}>
            You've been Kicked out !
          </h1>
          
          <p style={{ 
            fontSize: '16px', 
            color: '#666', 
            marginBottom: '32px',
            lineHeight: '1.5'
          }}>
            Looks like the teacher had removed you from the poll system. Please<br />
            Try again sometime.
          </p>
          
          <button className="continue-btn" onClick={onReset}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Student login screen
  if (!hasJoined) {
    return (
      <div className="App">
        <div style={{ textAlign: 'center', maxWidth: '600px', padding: '20px' }}>
          <div className="intervue-badge">
            <div className="star-icon">★</div>
            Intervue Poll
          </div>
          
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: '700', 
            color: '#333', 
            marginBottom: '24px' 
          }}>
            Let's Get Started
          </h1>
          
          <p style={{ 
            fontSize: '16px', 
            color: '#666', 
            marginBottom: '32px',
            maxWidth: '500px',
            margin: '0 auto 32px auto',
            lineHeight: '1.5'
          }}>
            If you're a student, you'll be able to <strong>submit your answers</strong>, participate in live polls, and see how your responses compare with your classmates
          </p>
          
          <div style={{ 
            textAlign: 'left', 
            maxWidth: '400px', 
            margin: '0 auto 32px auto' 
          }}>
            <label style={{ 
              display: 'block', 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#333', 
              marginBottom: '12px' 
            }}>
              Enter your Name
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Enter your name here..."
              onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
              style={{
                width: '100%',
                padding: '16px',
                border: '2px solid #e9ecef',
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.3s ease'
              }}
            />
          </div>
          
          <button 
            className="continue-btn" 
            onClick={handleJoin}
            disabled={!studentName.trim()}
          >
            Continue
          </button>
          
          <button 
            onClick={onReset}
            style={{
              background: 'none',
              border: 'none',
              color: '#667eea',
              fontSize: '16px',
              cursor: 'pointer',
              marginTop: '16px',
              textDecoration: 'underline'
            }}
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  // Main student dashboard
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'white', 
      padding: '20px',
      position: 'relative'
    }}>
      {/* Header with Question and Timer */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: '700', 
          color: '#333' 
        }}>
          {activePoll ? 'Question 1' : 'Waiting...'}
        </div>
        
        {activePoll && timeLeft > 0 && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            color: '#dc3545',
            fontSize: '18px',
            fontWeight: '600'
          }}>
            ⏱️ {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Main Content */}
      {activePoll ? (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Poll Question Card */}
          <div style={{
            background: 'white',
            border: '1px solid #e9ecef',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            marginBottom: '24px'
          }}>
            {/* Question Header */}
            <div style={{
              background: '#495057',
              color: 'white',
              padding: '20px',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              {activePoll.question}
            </div>
            
            {/* Answer Options */}
            <div style={{ padding: '24px' }}>
              {activePoll.options.map((option, index) => (
                <div
                  key={index}
                  onClick={() => !hasAnswered && setSelectedAnswer(option)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    marginBottom: '12px',
                    background: selectedAnswer === option ? '#e3f2fd' : '#f8f9fa',
                    border: selectedAnswer === option ? '2px solid #667eea' : '2px solid #e9ecef',
                    borderRadius: '12px',
                    cursor: hasAnswered ? 'default' : 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: selectedAnswer === option ? '#667eea' : '#6c757d',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}>
                    {index + 1}
                  </div>
                  <span style={{
                    fontSize: '16px',
                    color: '#333',
                    fontWeight: '500'
                  }}>
                    {option}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          {!hasAnswered && (
            <div style={{ textAlign: 'center' }}>
              <button
                className="continue-btn"
                onClick={handleSubmitAnswer}
                disabled={!selectedAnswer}
                style={{ width: '200px' }}
              >
                Submit
              </button>
            </div>
          )}

          {/* Results Display */}
          {hasAnswered && (
            <div style={{ marginTop: '32px' }}>
              <div style={{
                background: 'white',
                border: '1px solid #e9ecef',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{
                  background: '#495057',
                  color: 'white',
                  padding: '20px',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  {activePoll.question}
                </div>
                
                <div style={{ padding: '24px' }}>
                  {activePoll.options.map((option, index) => {
                    const votes = pollResults[option] || 0;
                    const totalVotes = Object.values(pollResults).reduce((sum, val) => sum + val, 0);
                    const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                    
                    return (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '16px',
                        marginBottom: '12px'
                      }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: '#667eea',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: '600'
                        }}>
                          {index + 1}
                        </div>
                        
                        <div style={{ flex: 1 }}>
                          <div style={{
                            background: '#e9ecef',
                            height: '24px',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            position: 'relative'
                          }}>
                            <div 
                              style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                height: '100%',
                                width: `${percentage}%`,
                                transition: 'width 0.5s ease'
                              }}
                            />
                          </div>
                        </div>
                        
                        <span style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#333',
                          minWidth: '60px',
                          textAlign: 'right'
                        }}>
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Waiting State */
        <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            width: '120px',
            height: '120px',
            border: '8px solid #e9ecef',
            borderTop: '8px solid #667eea',
            borderRadius: '50%',
            margin: '0 auto 32px auto',
            animation: 'spin 1s linear infinite'
          }} />
          
          <p style={{
            fontSize: '18px',
            color: '#333',
            fontWeight: '500'
          }}>
            Wait for the teacher to ask questions..
          </p>
        </div>
      )}

      {/* Chat Icon */}
      <button
        onClick={() => setShowChat(!showChat)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          background: '#667eea',
          border: 'none',
          borderRadius: '12px',
          color: 'white',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
          transition: 'all 0.3s ease'
        }}
      >
        💬
      </button>

      {/* Chat Popup */}
      {showChat && (
        <ChatPopup 
          socket={socket} 
          isTeacher={false}
          studentName={studentName}
          onClose={() => setShowChat(false)}
          participatingStudents={participatingStudents}
        />
      )}

      {/* Back Button */}
      <button 
        onClick={onReset}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          background: 'none',
          border: 'none',
          color: '#667eea',
          fontSize: '16px',
          cursor: 'pointer',
          textDecoration: 'underline'
        }}
      >
        ← Go Back
      </button>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default StudentView;
