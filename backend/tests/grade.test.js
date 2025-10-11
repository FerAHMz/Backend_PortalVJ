const db = require('../database_cn');
const GradeController = require('../controllers/gradeController');

// Mock the database connection
jest.mock('../database_cn', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn()
  }))
}));

describe('Grade Controller Tests', () => {
  // Test 1: Get Task Grades
  test('getTaskGrades should return grades for a specific task and course', async () => {
    // Arrange
    const mockGrades = [
      { carnet_estudiante: 'A123', nota: 85 },
      { carnet_estudiante: 'B456', nota: 90 }
    ];

    const mockReq = {
      params: {
        courseId: '1',
        taskId: '1'
      }
    };

    const mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    db.getPool().query.mockResolvedValueOnce({ rows: mockGrades });

    // Act
    await GradeController.getTaskGrades(mockReq, mockRes);

    // Assert
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: mockGrades
    });
  });

  // Test 2: Update Grade
  test('updateGrade should successfully update a student grade', async () => {
    // Arrange
    const mockReq = {
      params: {
        courseId: '1',
        taskId: '1',
        studentId: 'A123'
      },
      body: {
        nota: 95
      }
    };

    const mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    db.getPool().query.mockResolvedValueOnce({});

    // Act
    await GradeController.updateGrade(mockReq, mockRes);

    // Assert
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true
    });
  });
});
