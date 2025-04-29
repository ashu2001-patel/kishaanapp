const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const chatController = require('./controllers/chatcontroller'); // Import Chat Controller

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import Routes
const userRoutes = require('./routes/userRoutes');
const jobRoutes = require('./routes/jobroutes');
const animalRoutes = require('./routes/Animalroutes');
const applicationRoutes = require('./routes/applicationRoutes');
const reelRoutes = require('./routes/reelroutes');
const toolpestiroutes=require('./routes/toolpestiroutes');

app.use('/api/reels', reelRoutes);
app.use('/api/toolpesti',toolpestiroutes );
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/animals', animalRoutes);
app.use('/api/applications', applicationRoutes);

// Socket.io setup
io.on('connection', (socket) => {
  console.log('New client connected');

  // Join a chat room and send chat history to the user
  socket.on('joinRoom', async ({ chatId }) => {
    socket.join(chatId);
    console.log(`Client joined room: ${chatId}`);
    
    // Fetch and send the chat history to the user
    try {
      const chatHistory = await chatController.getChatHistory(chatId);
      socket.emit('chatHistory', chatHistory); // Send chat history to the client
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  });

  // Listen for messages, save to database, and broadcast within the room
  socket.on('sendMessage', async ({ chatId, senderId, message }) => {
    const messageData = {
      senderId,
      text: message,
      timestamp: new Date(),
    };
    
    // Save the message to the database
    try {
      const savedMessage = await chatController.saveMessage(chatId, senderId, message);
      io.to(chatId).emit('receiveMessage', savedMessage); // Send to all clients in the room
      console.log(`Message sent to room ${chatId}:`, savedMessage);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
