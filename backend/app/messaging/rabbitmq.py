import os
import json
import pika

from dotenv import load_dotenv

load_dotenv(override=True)

RABBITMQ_URL = os.getenv(
    "RABBITMQ_URL",
    "amqp://sda:sda123@127.0.0.1:5672/%2F"
)

QUEUE_NAME = "sda_agent_tasks"


def publish_task(task: dict):
    print("Connecting to RabbitMQ:", RABBITMQ_URL)

    parameters = pika.URLParameters(RABBITMQ_URL)
    connection = pika.BlockingConnection(parameters)

    channel = connection.channel()

    channel.queue_declare(queue=QUEUE_NAME, durable=True)

    channel.basic_publish(
        exchange="",
        routing_key=QUEUE_NAME,
        body=json.dumps(task),
        properties=pika.BasicProperties(delivery_mode=2),
    )

    connection.close()

    print("Task published successfully.")