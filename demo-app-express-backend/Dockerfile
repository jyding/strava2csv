FROM node:14

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --build-from-source

# Copy the application code
COPY . .

# Expose port
EXPOSE 3002

# Start the application
CMD [ "npm", "start"]
