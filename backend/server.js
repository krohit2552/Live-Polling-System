const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const config = require('./config');

const io = socketIo(server, {
  cors: config.corsOptions
});

app.use(cors());
app.use(express.json());

// Store active polls and students
let activePoll = null;
let students = new Map(); // socketId -> studentData
let pollResults = [];
let participatingStudents = []; // Track which students have answered

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Handle student joining
  socket.on('student-join', (studentData) => {
    students.set(socket.id, {
      ...studentData,
      socketId: socket.id,
      hasAnswered: false
    });
    
    // Send current poll state to new student
    if (activePoll) {
      socket.emit('poll-active', activePoll);
    }
    
    // Update teacher with new student count and student data
    io.emit('student-count-update', students.size);
    io.emit('student-joined', {
      ...studentData,
      socketId: socket.id,
      hasAnswered: false
    });
  });

  // Handle teacher creating a new poll
  socket.on('create-poll', (pollData) => {
    if (activePoll && !canAskNewQuestion()) {
      socket.emit('error', 'Cannot create new poll until all students have answered the previous question');
      return;
    }

    activePoll = {
      id: uuidv4(),
      question: pollData.question,
      options: pollData.options,
      timeLimit: pollData.timeLimit || 60,
      createdAt: new Date(),
      results: {},
      isActive: true
    };

    // Reset student answer status and participating students
    students.forEach(student => {
      student.hasAnswered = false;
    });
    participatingStudents = [];

    // Broadcast new poll to all clients
    io.emit('new-poll', activePoll);
    
    // Start timer
    startPollTimer(activePoll.id, activePoll.timeLimit);
  });

  // Handle student submitting answer
  socket.on('submit-answer', (data) => {
    const student = students.get(socket.id);
    if (!student || !activePoll || student.hasAnswered) {
      socket.emit('error', 'Invalid submission');
      return;
    }

    // Record the answer
    if (!activePoll.results[data.answer]) {
      activePoll.results[data.answer] = 0;
    }
    activePoll.results[data.answer]++;

    student.hasAnswered = true;
    students.set(socket.id, student);

    // Add to participating students list
    if (!participatingStudents.find(s => s.id === student.id)) {
      participatingStudents.push({
        id: student.id,
        name: student.name,
        answer: data.answer,
        answeredAt: new Date()
      });
    }

    // Check if all students have answered
    if (allStudentsAnswered()) {
      endPoll();
    } else {
      // Update results and participating students for all clients
      io.emit('poll-results-update', {
        results: activePoll.results,
        participatingStudents: participatingStudents
      });
    }
  });

  // Handle teacher ending poll manually
  socket.on('end-poll', () => {
    if (activePoll) {
      endPoll();
    }
  });

  // Handle teacher removing student
  socket.on('remove-student', (studentId) => {
    const student = Array.from(students.values()).find(s => s.id === studentId);
    if (student) {
      students.delete(student.socketId);
      io.to(student.socketId).emit('removed-by-teacher');
      io.emit('student-count-update', students.size);
      io.emit('student-left', student.socketId);
    }
  });

  // Handle chat messages
  socket.on('chat-message', (messageData) => {
    const sender = students.get(socket.id) || { name: 'Teacher' };
    const chatMessage = {
      id: uuidv4(),
      sender: sender.name,
      message: messageData.message,
      timestamp: new Date(),
      senderType: students.has(socket.id) ? 'student' : 'teacher'
    };
    
    io.emit('chat-message', chatMessage);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const student = students.get(socket.id);
    if (student) {
      students.delete(socket.id);
      io.emit('student-count-update', students.size);
      io.emit('student-left', socket.id);
    }
  });
});

// Helper functions
function canAskNewQuestion() {
  return !activePoll || allStudentsAnswered();
}

function allStudentsAnswered() {
  if (students.size === 0) return true;
  return Array.from(students.values()).every(student => student.hasAnswered);
}

function startPollTimer(pollId, timeLimit) {
  setTimeout(() => {
    if (activePoll && activePoll.id === pollId && activePoll.isActive) {
      endPoll();
    }
  }, timeLimit * 1000);
}

function endPoll() {
  if (activePoll) {
    activePoll.isActive = false;
    activePoll.endedAt = new Date();
    
    // Store poll results for history
    pollResults.push({
      ...activePoll,
      studentCount: students.size,
      participatingStudents: participatingStudents
    });
    
    // Broadcast poll end and final results
    io.emit('poll-ended', {
      poll: activePoll,
      results: activePoll.results,
      participatingStudents: participatingStudents
    });
    
    activePoll = null;
    participatingStudents = [];
  }
}

// API endpoints
app.get('/api/poll-status', (req, res) => {
  res.json({
    activePoll,
    studentCount: students.size,
    canAskNewQuestion: canAskNewQuestion(),
    participatingStudents: participatingStudents
  });
});

app.get('/api/poll-history', (req, res) => {
  res.json(pollResults);
});

server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Frontend URL: ${config.frontendUrl}`);
});
