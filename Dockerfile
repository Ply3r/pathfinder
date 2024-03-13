# Stage 1: Build Vue.js application
FROM node:18-alpine AS builder

WORKDIR /app

COPY ./package.json .

RUN npm install

COPY . .

RUN npm run build

# Stage 2: Serve the built Vue.js application with Nginx
FROM nginx:alpine

# Copy the built files from the previous stage into the Nginx container
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
