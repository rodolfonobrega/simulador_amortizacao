# Estágio de construção
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Estágio de execução
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Expor a porta padrão do Nginx
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
