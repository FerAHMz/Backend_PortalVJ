<div align="center">
  <h1>Portal Vanguardia Juvenil - Backend</h1>
  <p>
    Backend service for Portal Vanguardia Juvenil using Node.js, and PostgreSQL with Docker
  </p>
</div>

## Project Description

This backend service manages the Portal Vanguardia Juvenil system, handling user authentication, data management, and API endpoints. It uses a containerized environment with PostgreSQL for data persistence and Node.js for the API server.

## Features

- **User Authentication:** Secure login system for teachers, parents, and administrators
- **Database Management:** PostgreSQL with automated initialization
- **Password Security:** Bcrypt hashing for user passwords
- **Docker Support:** Containerized application for consistent deployment
- **API Endpoints:** RESTful services for frontend communication

## Prerequisites

- Docker Desktop installed and running
- Basic understanding of terminal/command prompt usage

## Running the Application

1. **Start Docker Desktop**
   - Ensure Docker Desktop is running on your machine

2. **Launch the Application**
   ```bash
   docker compose up --build -d
 ```

This command:
- Builds the necessary containers
- Starts the PostgreSQL database
- Initializes the database schema and data
- Starts the Node.js server
3. Verify Installation
   ```bash
   docker compose ps
    ```
    This shows the status of running containers
## API Endpoints
- Authentication
  
  - POST /login : User authentication
- Data Management
  
  - Additional endpoints to be documented
## Database Structure
- Teachers (maestros)
- Parents (padres)
- Administrators (administrativos)
- Additional tables to be documented
## Stopping the Application
```bash
docker compose down
 ```

## Troubleshooting
If you encounter issues:

1. Ensure Docker Desktop is running
2. Check if ports 3000 and 5434 are available
3. Try rebuilding the containers:
   ```bash
   docker compose down -v
   docker compose up --build -d
    ```
## Notes
- Database is automatically initialized with test data
- Passwords are securely hashed
- Backend runs on http://localhost:3000