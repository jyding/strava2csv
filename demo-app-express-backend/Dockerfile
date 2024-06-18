FROM node:14

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --build-from-source

# Install global dependencies
RUN npm install -g sequelize-cli && \
    apt-get update && apt-get install -y sqlite3

# Copy the application code
COPY . .

# Ensure the database file is created
RUN touch database.sqlite

# Run database migrations
RUN npx sequelize-cli db:migrate

# Expose port
EXPOSE 3002

# Start the application
CMD [ "npm", "start"]
