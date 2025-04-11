errorLogger.js
const logError = (process, error) => {
    const timestamp = new Date().toISOString();
    const errorLog = {
        timestamp,
        process,
        error: error.message,
        stack: error.stack
    };
    console.error('Error Log: ', errorLog);
};

module.exports = {
    logError
};