const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

router.get('/', async (req, res) => {
  try {
    // Check database connection
    await sequelize.authenticate();
    
    // Get table counts
    const [results] = await sequelize.query(`
      SELECT 
        (SELECT COUNT(*) FROM fields) as fields_count,
        (SELECT COUNT(*) FROM lecturers) as lecturers_count,
        (SELECT COUNT(*) FROM students) as students_count,
        (SELECT COUNT(*) FROM lecturer_fields) as assignments_count
    `);
    
    const stats = results[0];
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
      version: process.env.npm_package_version || '1.0.0',
      stats: {
        fields: parseInt(stats.fields_count),
        lecturers: parseInt(stats.lecturers_count),
        students: parseInt(stats.students_count),
        fieldAssignments: parseInt(stats.assignments_count)
      },
      services: {
        kobo: {
          configured: !!(process.env.KOBO_API_URL && process.env.KOBO_TOKEN && process.env.FORM_UID)
        }
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: 'disconnected'
    });
  }
});

module.exports = router;
