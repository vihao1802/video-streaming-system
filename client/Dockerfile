FROM node:18-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package.*json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "run", "dev"]
