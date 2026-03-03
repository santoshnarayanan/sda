import os
import pika
import json

RABBITMQ_URL = os.getenv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672/%2F')

QUEUE_NAME = 'sda_agent_tasks'

def get_connection():
    parms = pika.URLParameters(RABBITMQ_URL)
    return pika.BlockingConnection(parms)

def publish_task(task:dict):
    connection = get_connection()
    channel = connection.channel()

    channel.queue_declare(queue=QUEUE_NAME, durable=True)

    channel.basic_publish(
        exchange='',
        routing_key=QUEUE_NAME,
        body=json.dumps(task),
        properties=pika.BasicProperties(
            delivery_mode=2,  # make message persistent
        ))
    print(f" [x] Sent task: {task}")
    connection.close()