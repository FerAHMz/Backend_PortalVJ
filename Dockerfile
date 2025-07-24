# Use the official Node.js image as the base image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json from backend folder to the working directory
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Install bcrypt explicitly (required for authentication)
RUN npm install bcrypt@^5.0.1

# Copy the backend application code to the working directory
COPY backend/ .

# Expose the port the application will run on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
