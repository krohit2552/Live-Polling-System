import React, { useState, useEffect, useRef } from 'react';

const ChatPopup = ({ socket, isTeacher, studentName, onClose, participatingStudents = [] }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (socket) {
      socket.on('chat-message', (message) => {
        setMessages(prev => [...prev, message]);
      });

      return () => {
        socket.off('chat-message');
      };
    }
  }, [socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      socket.emit('chat-message', { message: newMessage.trim() });
      setNewMessage('');
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      right: '20px',
      transform: 'translateY(-50%)',
      width: '350px',
      height: '500px',
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      border: '1px solid #e9ecef'
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        padding: '20px 20px 0 20px',
        borderBottom: '1px solid #e9ecef'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <span style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#333'
          }}>
            Live Chat
          </span>
          <button 
            onClick={onClose}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#666', 
              fontSize: '20px', 
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>
        
        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e9ecef'
        }}>
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'chat' ? '3px solid #667eea' : '3px solid transparent',
              color: activeTab === 'chat' ? '#667eea' : '#666',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('participants')}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'participants' ? '3px solid #667eea' : '3px solid transparent',
              color: activeTab === 'participants' ? '#667eea' : '#666',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Participants
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'chat' ? (
          /* Chat Tab */
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px'
            }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
                  <div style={{ fontSize: '16px', fontWeight: '500' }}>No messages yet</div>
                  <div style={{ fontSize: '14px', color: '#999', marginTop: '8px' }}>
                    Start the conversation!
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: '16px',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div style={{
                      fontSize: '12px',
                      color: '#666',
                      marginBottom: '4px',
                      fontWeight: '500'
                    }}>
                      {message.sender}
                    </div>
                    <div style={{
                      background: message.senderType === 'student' ? '#e3f2fd' : '#f3e5f5',
                      padding: '12px 16px',
                      borderRadius: '16px',
                      maxWidth: '80%',
                      alignSelf: message.senderType === 'student' ? 'flex-start' : 'flex-end',
                      wordBreak: 'break-word'
                    }}>
                      {message.message}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#999',
                      marginTop: '4px',
                      alignSelf: message.senderType === 'student' ? 'flex-start' : 'flex-end'
                    }}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Chat Input */}
            <div style={{
              padding: '20px',
              borderTop: '1px solid #e9ecef'
            }}>
              <form onSubmit={handleSendMessage} style={{
                display: 'flex',
                gap: '12px'
              }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  disabled={!socket}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '1px solid #e9ecef',
                    borderRadius: '20px',
                    outline: 'none',
                    fontSize: '14px'
                  }}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || !socket}
                  style={{
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px'
                  }}
                >
                  ➤
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Participants Tab */
          <div style={{
            padding: '20px',
            height: '100%',
            overflowY: 'auto'
          }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '16px'
            }}>
              Name
            </div>
            
            {participatingStudents.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: '#666',
                marginTop: '40px'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                <div style={{ fontSize: '16px', fontWeight: '500' }}>No participants yet</div>
                <div style={{ fontSize: '14px', color: '#999', marginTop: '8px' }}>
                  Students will appear here when they join
                </div>
              </div>
            ) : (
              participatingStudents.map((participant, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px 0',
                    borderBottom: index < participatingStudents.length - 1 ? '1px solid #f0f0f0' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
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
                    {participant.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{
                      fontSize: '14px',
                      color: '#333',
                      fontWeight: '500'
                    }}>
                      {participant.name}
                    </span>
                    {participant.answer && (
                      <div style={{
                        fontSize: '12px',
                        color: '#28a745',
                        marginTop: '2px'
                      }}>
                        ✓ Answered: {participant.answer}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPopup;
