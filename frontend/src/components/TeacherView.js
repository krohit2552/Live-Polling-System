import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import ChatPopup from './ChatPopup';

const TeacherView = ({ onReset }) => {
  const [socket, setSocket] = useState(null);
  const [activePoll, setActivePoll] = useState(null);
  const [studentCount, setStudentCount] = useState(0);
  const [canAskNewQuestion, setCanAskNewQuestion] = useState(true);
  const [pollHistory, setPollHistory] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [participatingStudents, setParticipatingStudents] = useState([]);
  const [students, setStudents] = useState(new Map());

  // Poll creation form state
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [timeLimit, setTimeLimit] = useState(60);

  const API_BASE = process.env.REACT_APP_API_BASE || (window.location.hostname === 'localhost' ? '' : 'https://live-pollingsystem.onrender.com');

  useEffect(() => {
    const newSocket = io('https://live-pollingsystem.onrender.com');
    setSocket(newSocket);

    // Socket event listeners
    newSocket.on('student-count-update', (count) => {
      setStudentCount(count);
    });

    newSocket.on('student-joined', (studentData) => {
      setStudents(prev => new Map(prev).set(studentData.socketId, studentData));
    });

    newSocket.on('student-left', (socketId) => {
      setStudents(prev => {
        const newMap = new Map(prev);
        newMap.delete(socketId);
        return newMap;
      });
    });

    newSocket.on('poll-results-update', (data) => {
      if (activePoll) {
        setActivePoll(prev => ({ ...prev, results: data.results }));
        setParticipatingStudents(data.participatingStudents);
      }
    });

    newSocket.on('poll-ended', (data) => {
      setActivePoll(null);
      setCanAskNewQuestion(true);
      setParticipatingStudents([]);
      // Add to history
      setPollHistory(prev => [data.poll, ...prev]);
    });

    // If another teacher creates a poll, reflect it
    newSocket.on('new-poll', (poll) => {
      setActivePoll({ ...poll, results: poll.results || {} });
      setCanAskNewQuestion(false);
      setParticipatingStudents([]);
    });

    // Surface socket errors
    newSocket.on('error', (message) => {
      console.error('Socket error:', message);
    });

    // Fetch initial data
    fetchPollStatus();
    fetchPollHistory();

    return () => newSocket.close();
  }, []);

  const fetchPollStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/poll-status`);
      const data = await response.json();
      setActivePoll(data.activePoll);
      setStudentCount(data.studentCount);
      setCanAskNewQuestion(data.canAskNewQuestion);
      setParticipatingStudents(data.participatingStudents || []);
    } catch (error) {
      console.error('Error fetching poll status:', error);
    }
  };

  const fetchPollHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/poll-history`);
      const data = await response.json();
      setPollHistory(data);
    } catch (error) {
      console.error('Error fetching poll history:', error);
    }
  };

  const handleCreatePoll = () => {
    if (!question.trim() || options.some(opt => !opt.trim())) {
      alert('Please fill in all fields');
      return;
    }

    const pollData = {
      question: question.trim(),
      options: options.filter(opt => opt.trim()),
      timeLimit: parseInt(timeLimit)
    };

    socket.emit('create-poll', pollData);
    setActivePoll({
      ...pollData,
      id: Date.now(),
      results: {},
      isActive: true,
      createdAt: new Date()
    });
    setCanAskNewQuestion(false);
    setParticipatingStudents([]);

    // Reset form
    setQuestion('');
    setOptions(['', '']);
    setTimeLimit(60);
  };

  const handleEndPoll = () => {
    socket.emit('end-poll');
  };

  const handleKickStudent = (studentId) => {
    if (window.confirm('Are you sure you want to kick out this student?')) {
      socket.emit('remove-student', studentId);
      // Remove from participating students list
      setParticipatingStudents(prev => prev.filter(student => student.id !== studentId));
    }
  }

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  return (
    <div style={{
      minHeight: '100vh',
      background: 'white',
      padding: '20px',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        maxWidth: '1200px',
        margin: '0 auto 32px auto'
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#333'
        }}>
          Teacher Dashboard
        </h1>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => setShowChat(!showChat)}
            style={{
              background: '#667eea',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            💬 Chat
          </button>

          <button
            onClick={onReset}
            style={{
              background: 'none',
              border: '2px solid #667eea',
              color: '#667eea',
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            🔄 Switch Role
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '32px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Left Column - Poll Creation */}
        <div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#333',
            marginBottom: '24px'
          }}>
            Create New Poll
          </h2>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '8px'
            }}>
              Question:
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter your question here..."
              disabled={!canAskNewQuestion}
              style={{
                width: '100%',
                padding: '16px',
                border: '2px solid #e9ecef',
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.3s ease',
                background: canAskNewQuestion ? 'white' : '#f8f9fa'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '12px'
            }}>
              Options:
            </label>
            {options.map((option, index) => (
              <div key={index} style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '12px',
                alignItems: 'center'
              }}>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  disabled={!canAskNewQuestion}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.3s ease',
                    background: canAskNewQuestion ? 'white' : '#f8f9fa'
                  }}
                />
                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(index)}
                    disabled={!canAskNewQuestion}
                    style={{
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      cursor: canAskNewQuestion ? 'pointer' : 'not-allowed',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addOption}
              disabled={!canAskNewQuestion}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: canAskNewQuestion ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease'
              }}
            >
              + Add Option
            </button>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '8px'
            }}>
              Time Limit (seconds):
            </label>
            <input
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              min="10"
              max="300"
              disabled={!canAskNewQuestion}
              style={{
                width: '100%',
                padding: '16px',
                border: '2px solid #e9ecef',
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.3s ease',
                background: canAskNewQuestion ? 'white' : '#f8f9fa'
              }}
            />
          </div>

          <button
            onClick={handleCreatePoll}
            disabled={!canAskNewQuestion}
            style={{
              width: '100%',
              background: '#28a745',
              color: 'white',
              border: 'none',
              padding: '16px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: canAskNewQuestion ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease',
              marginBottom: '16px'
            }}
          >
            {activePoll ? 'Update Poll' : 'Create Poll'}
          </button>

          {activePoll && (
            <button
              onClick={handleEndPoll}
              style={{
                width: '100%',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '16px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              End Poll
            </button>
          )}
        </div>

        {/* Right Column - Live Results & Students */}
        <div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#333',
            marginBottom: '24px'
          }}>
            Live Results
          </h2>

          <div style={{
            marginBottom: '24px',
            padding: '20px',
            background: '#f8f9fa',
            borderRadius: '12px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '8px'
            }}>
              Connected Students: {studentCount}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#666',
              marginBottom: '16px'
            }}>
              {studentCount === 0 ? 'No students connected yet' :
                studentCount === 1 ? '1 student is connected' :
                  `${studentCount} students are connected`}
            </div>

            {/* Show all connected students with kick-out buttons */}
            {studentCount > 0 && (
              <div style={{
                display: 'grid',
                gap: '8px',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#495057',
                  padding: '8px 0',
                  borderBottom: '1px solid #e9ecef'
                }}>
                  All Connected Students
                </div>
                {Array.from(students.values()).map((student, index) => (
                  <div key={student.socketId} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'white',
                    borderRadius: '6px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#667eea',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {student.name.charAt(0)}
                      </div>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#333'
                      }}>
                        {student.name}
                      </span>
                      {student.hasAnswered && (
                        <span style={{
                          background: '#28a745',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          fontSize: '10px',
                          fontWeight: '600'
                        }}>
                          ✓ Answered
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleKickStudent(student.id)}
                      style={{
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease'
                      }}
                      title="Kick out student"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Participating Students Section */}
          {activePoll && (
            <div style={{
              background: 'white',
              border: '1px solid #e9ecef',
              borderRadius: '12px',
              marginBottom: '24px',
              overflow: 'hidden',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                background: '#495057',
                color: 'white',
                padding: '16px 20px',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                Participating Students ({participatingStudents.length}/{studentCount})
              </div>

              <div style={{ padding: '20px' }}>
                {participatingStudents.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '14px',
                    padding: '20px'
                  }}>
                    No students have answered yet...
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gap: '12px'
                  }}>
                    {participatingStudents.map((student, index) => (
                      <div key={student.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px solid #e9ecef'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
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
                            fontSize: '14px',
                            fontWeight: '600'
                          }}>
                            {student.name.charAt(0)}
                          </div>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#333'
                          }}>
                            {student.name}
                          </span>
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span style={{
                            fontSize: '12px',
                            color: '#666'
                          }}>
                            Answered:
                          </span>
                          <span style={{
                            background: '#28a745',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {student.answer}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            color: '#999'
                          }}>
                            {formatTime(student.answeredAt)}
                          </span>
                          <button
                            onClick={() => handleKickStudent(student.id)}
                            style={{
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '24px',
                              height: '24px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginLeft: '8px',
                              transition: 'all 0.3s ease'
                            }}
                            title="Kick out student"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activePoll ? (
            <>
              <div style={{
                background: 'white',
                border: '1px solid #e9ecef',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                marginBottom: '24px'
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
                    const votes = activePoll.results[option] || 0;
                    const percentage = studentCount > 0 ? (votes / studentCount) * 100 : 0;
                    const isHighestVote = votes === Math.max(...Object.values(activePoll.results));

                    return (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        marginBottom: '16px',
                        padding: '12px 16px',
                        background: isHighestVote ? '#667eea' : '#f8f9fa',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease'
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
                          fontSize: '14px',
                          fontWeight: '600',
                          flexShrink: 0
                        }}>
                          {index + 1}
                        </div>

                        <span style={{
                          fontSize: '16px',
                          fontWeight: '500',
                          color: isHighestVote ? 'white' : '#333',
                          flex: 1
                        }}>
                          {option}
                        </span>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          minWidth: '120px'
                        }}>
                          <div style={{
                            background: isHighestVote ? 'rgba(255,255,255,0.3)' : '#e9ecef',
                            height: '24px',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            position: 'relative',
                            flex: 1,
                            minWidth: '80px'
                          }}>
                            <div
                              style={{
                                background: isHighestVote ? 'white' : '#667eea',
                                height: '100%',
                                width: `${percentage}%`,
                                transition: 'width 0.5s ease',
                                borderRadius: '12px'
                              }}
                            />
                          </div>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: isHighestVote ? 'white' : '#333',
                            minWidth: '40px',
                            textAlign: 'right'
                          }}>
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ask New Question Button */}
              <div style={{ textAlign: 'right', marginBottom: '32px' }}>
                <button
                  onClick={() => {
                    setQuestion('');
                    setOptions(['', '']);
                    setTimeLimit(60);
                    setCanAskNewQuestion(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '16px 32px',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  + Ask a new question
                </button>
              </div>
            </>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              background: '#f8f9fa',
              borderRadius: '12px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
              <p style={{
                fontSize: '16px',
                color: '#666',
                marginBottom: '8px'
              }}>
                No active poll
              </p>
              <p style={{
                fontSize: '14px',
                color: '#999'
              }}>
                Create one to see live results!
              </p>
            </div>
          )}


          {/* Poll History */}
          <h3 style={{
            marginTop: '32px',
            fontSize: '20px',
            fontWeight: '600',
            color: '#333',
            marginBottom: '16px'
          }}>
            Poll History
          </h3>
          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            background: '#f8f9fa',
            borderRadius: '12px',
            padding: '16px'
          }}>
            {pollHistory.length === 0 ? (
              <p style={{
                textAlign: 'center',
                color: '#666',
                fontSize: '14px'
              }}>
                No polls created yet
              </p>
            ) : (
              pollHistory.map((poll, index) => (
                <div key={index} style={{
                  padding: '12px',
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  background: 'white'
                }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '8px'
                  }}>
                    {poll.question}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#666'
                  }}>
                    {new Date(poll.createdAt).toLocaleString()} - {poll.studentCount} students
                  </div>
                  {poll.participatingStudents && poll.participatingStudents.length > 0 && (
                    <div style={{
                      fontSize: '12px',
                      color: '#28a745',
                      marginTop: '4px'
                    }}>
                      {poll.participatingStudents.length} students participated
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Chat Popup */}
      {showChat && (
        <ChatPopup
          socket={socket}
          isTeacher={true}
          onClose={() => setShowChat(false)}
          participatingStudents={participatingStudents}
        />
      )}
    </div>
  );
};

export default TeacherView;
