FROM alpine:3.19

USER root

## Move all the files from the project to the metareg directory
COPY ./ /backend

WORKDIR /backend

RUN apk add --no-cache python3 py3-pip

# Create a virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip and install dependencies in the venv
RUN pip install --upgrade pip -r ./requirements.txt


## Create user groups
RUN addgroup -g 3000 appgroup \
	&& adduser -u 1000 -g 3000 -h /home/nonroot -D nonroot

## Specify the volumes
VOLUME ./data ./logs

## Create the directories
RUN mkdir -p ./logs
RUN mkdir -p ./data

## Update user permissions
RUN chown -R 1000:3000 /backend && chmod -R 775 /backend/

COPY ./resources/docs/* ./resources/docs

## Choose the user
USER 1000:3000

## Expose default port
EXPOSE 8000

## Execute the application
CMD ["python3","./init.py", "--host", "0.0.0.0", "--port", "8000"]
