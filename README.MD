# RabbitMQ and MongoDB Docker Setup

This project provides a Docker-based setup for running RabbitMQ and MongoDB services. It simplifies the process of deploying and managing these services for development or testing purposes.

## Prerequisites

Ensure you have the following installed on your system:
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd rabbitmq-mongo-docker
   ```

2. Start the services using Docker Compose:
   ```bash
   docker-compose up -d
   ```

3. Verify that the services are running:
   - RabbitMQ: Access the management UI at `http://localhost:15672` (default username: `guest`, password: `guest`).
   - MongoDB: Connect to `mongodb://localhost:27017` using your preferred MongoDB client.

## Usage

- Use RabbitMQ for message queuing and MongoDB for data storage in your applications.
- Modify the `docker-compose.yml` file to customize configurations as needed.

## Project Structure

The project contains the following key files and directories:
- `docker-compose.yml`: Defines the Docker services for RabbitMQ and MongoDB.
- `config/`: Contains configuration files for RabbitMQ (e.g., `rabbitmq.conf`) and MongoDB (e.g., `mongod.conf`).
- `LICENSE`: The license file for the project.
- `README.MD`: Documentation for the project.
- `.env` (optional): Environment variables for customizing service configurations.

## Stopping the Services

To stop and remove the containers, run:
```bash
docker-compose down
```

## Troubleshooting

Here are some common issues and their solutions:

1. **RabbitMQ Management UI is not accessible**:
   - Ensure the RabbitMQ container is running by executing:
     ```bash
     docker ps
     ```
   - Check if port `15672` is already in use on your system. If so, modify the `docker-compose.yml` file to use a different port.

2. **MongoDB connection issues**:
   - Verify the MongoDB container is running:
     ```bash
     docker ps
     ```
   - Ensure your MongoDB client is configured to connect to `localhost:27017`.

3. **Docker Compose command fails**:
   - Ensure Docker and Docker Compose are installed and running.
   - Check for syntax errors in the `docker-compose.yml` file.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
