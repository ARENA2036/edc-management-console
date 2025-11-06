FROM python:3.14.0-alpine3.22 AS builder

USER root

# Create user groups
RUN addgroup -g 3000 appgroup \
	&& adduser -u 1000 -g 3000 -h /home/nonroot -D nonroot

COPY . /app

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    build-base \
    python3-dev \
    musl-dev \
    libffi-dev \
    openssl-dev \
    bzip2-dev \
    zlib-dev \
    xz-dev \
    readline-dev \
    sqlite-dev \
    rust \
    cargo

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install --upgrade pip setuptools wheel && \
    pip install pydantic-core==2.33.2 && \
    pip install --no-cache-dir -r requirements.txt

# Specify the volumes
VOLUME ./data ./logs

# Create the directories
RUN mkdir -p ./logs && \
    mkdir -p ./data

## Update user permissions
RUN chown -R 1000:3000 /app && chmod -R 775 /app/

# Choose the user
USER 1000:3000

## Expose default port
EXPOSE 8001

## Execute the application
CMD ["python3","./init.py", "--host", "0.0.0.0", "--port", "8001"]