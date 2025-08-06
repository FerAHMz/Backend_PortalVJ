const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const paymentRoutes = require('./routes/paymentRoutes');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const profileRoutes = require('./routes/profileRoutes');
const superUserRoutes = require('./routes/superUserRoutes');
const superUserPlanificationRoutes = require('./routes/superUserPlanificationRoutes');
const familyRoutes = require('./routes/familyRoutes');
const inscripcionRoutes = require('./routes/inscripcionRoutes');

const attendanceRoutes = require('./routes/attendanceRoutes'); 
const studentAttendanceRoutes = require('./routes/studentAttendanceRoutes'); 

// Configure CORS with specific options
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/user', profileRoutes);
app.use('/api/superuser', superUserRoutes);
app.use('/api/superuser/planifications', superUserPlanificationRoutes);
app.use('/api/superuser/families', familyRoutes);
app.use('/api/courses', attendanceRoutes); 
app.use('/api/students', studentAttendanceRoutes); 

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

module.exports = app;