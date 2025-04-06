# imagen de Node
FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# puerto 
EXPOSE 3000

# arrancar el servidor
CMD ["node", "index.js"]
