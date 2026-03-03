import os
import json
import pika

from app.main import get_db_connection
from app.agents.manager import run_agent_task
from app.models import AgentRunRequest
from dotenv import load_dotenv
load_dotenv()

RABBITMQ_URL = os.getenv('RABBITMQ_URL', 'amqp://sda:sda123@127.0.0.1:5672/%2F')
QUEUE_NAME = 'sda_agent_tasks'

def callback(ch, method, properties, body):
    data = json.loads(body)
    task_id = data.get('task_id')
    request_payload = data.get('request')

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Mark running
        cur.execute("UPDATE agent_tasks SET status = 'running' WHERE task_id = %s", (task_id,))
        conn.commit()

        req = AgentRunRequest(**request_payload)
        result = run_agent_task(req)

        cur.execute("UPDATE agent_tasks SET status = 'completed', result = %s WHERE task_id = %s", (json.dumps(result), task_id))
        conn.commit()
    except Exception as e:
        print(f"Error processing task {task_id}: {e}")
        cur.execute("UPDATE agent_tasks SET status = 'failed' WHERE task_id = %s", (task_id,))
        conn.commit()
    finally:
        cur.close()
        conn.close()
        ch.basic_ack(delivery_tag=method.delivery_tag)

def start_worker():
    # connection = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
    # channel = connection.channel()
    # channel.queue_declare(queue=QUEUE_NAME, durable=True)

    # channel.basic_qos(prefetch_count=1)
    # channel.basic_consume(queue=QUEUE_NAME, on_message_callback=callback)
    # print(' [*] Waiting for messages. To exit press CTRL+C')
    # channel.start_consuming()

    credentials = pika.PlainCredentials("sda", "sda123")

    parameters = pika.ConnectionParameters(
        host="127.0.0.1",
        port=5672,
        virtual_host="/",
        credentials=credentials,
    )

    print("Connecting with explicit credentials...")

    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    channel.queue_declare(queue=QUEUE_NAME, durable=True)

    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=callback)

    print(" [*] Waiting for messages. To exit press CTRL+C")
    channel.start_consuming()

if __name__ == "__main__":
    start_worker()