const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { errorHandler, logger } = require('./middleware/errorHandler');

// Import routes
const healthRoutes = require('./routes/health');
const fieldsRoutes = require('./routes/fields');
const lecturersRoutes = require('./routes/lecturers');
const studentsRoutes = require('./routes/students');
const syncRoutes = require('./routes/sync');
const assignmentRoutes = require('./routes/assignment');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || '*'
    : '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined', {
  stream: { write: message => logger.info(message.trim()) }
}));

// API routes
app.use('/api/health', healthRoutes);
app.use('/api/fields', fieldsRoutes);
app.use('/api/lecturers', lecturersRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/assignment', assignmentRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Student-Lecturer Matching System API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      fields: '/api/fields',
      lecturers: '/api/lecturers',
      students: '/api/students',
      sync: '/api/sync',
      assignment: '/api/assignment'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      status: 404
    }
  });
});

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
