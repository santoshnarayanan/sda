import os
import json
import pika
import threading

from app.main import get_db_connection
from app.agents.manager import run_agent_task
from app.models import AgentRunRequest
from dotenv import load_dotenv

# Only load .env if not inside Docker
if not os.getenv("DOCKER_ENV"):
    load_dotenv()

RABBITMQ_URL = os.getenv('RABBITMQ_URL', 'amqp://sda:sda123@rabbitmq:5672/%2F')

MAIN_QUEUE = 'sda_agent_tasks'
RETRY_QUEUE = 'sda_agent_tasks_retry'
DLQ_QUEUE = 'sda_agent_tasks_dlq'

MAX_RETRIES = 3

# Note: In production, consider using a more robust task queue system like Celery or RQ with Redis, 
# which handle retries, scheduling, and monitoring out of the box. This is a simplified example for demonstration purposes.
def threaded_callback(ch, method, properties, body):
    threading.Thread(
        target=callback,
        args=(ch, method, properties, body),
        daemon=True
    ).start()

def callback(ch, method, properties, body):
    data = json.loads(body)
    task_id = data.get('task_id')
    request_payload = data.get('request')

    retry_count = data.get("retry_count", 0)

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Mark running
        cur.execute(
            "UPDATE agent_tasks SET status = 'running' WHERE task_id = %s",
            (task_id,)
        )
        conn.commit()

        req = AgentRunRequest(**request_payload)
        result = run_agent_task(req)

        cur.execute(
            "UPDATE agent_tasks SET status = 'completed', result = %s WHERE task_id = %s",
            (json.dumps(result.model_dump(mode="json")), task_id)
        )
        conn.commit()

        print(f"Task {task_id} completed successfully")

    except Exception as e:

        print(f"Error processing task {task_id}: {e}")

        if retry_count < MAX_RETRIES:

            retry_count += 1
            data["retry_count"] = retry_count

            print(f"Retrying task {task_id} (attempt {retry_count})")

            ch.basic_publish(
                exchange='',
                routing_key=RETRY_QUEUE,
                body=json.dumps(data),
                properties=pika.BasicProperties(
                    delivery_mode=2
                )
            )

        else:

            print(f"Task {task_id} exceeded retry limit. Sending to DLQ.")

            ch.basic_publish(
                exchange='',
                routing_key=DLQ_QUEUE,
                body=json.dumps(data),
                properties=pika.BasicProperties(
                    delivery_mode=2
                )
            )

            cur.execute(
                "UPDATE agent_tasks SET status = 'failed' WHERE task_id = %s",
                (task_id,)
            )
            conn.commit()

    finally:
        cur.close()
        conn.close()

        ch.basic_ack(delivery_tag=method.delivery_tag)


def start_worker():

    print("Connecting with explicit credentials...")

    connection = pika.BlockingConnection(
        pika.URLParameters(RABBITMQ_URL)
    )

    channel = connection.channel()

    # Declare queues
    channel.queue_declare(queue=MAIN_QUEUE, durable=True)
    channel.queue_declare(queue=RETRY_QUEUE, durable=True)
    channel.queue_declare(queue=DLQ_QUEUE, durable=True)

    # Simple parallel processing with prefetch_count
    channel.basic_qos(prefetch_count=5)

    # Consume from both main and retry queue
    channel.basic_consume(
        queue=MAIN_QUEUE,
        on_message_callback=threaded_callback
    )

    channel.basic_consume(
        queue=RETRY_QUEUE,
        on_message_callback=threaded_callback
    )

    print(" [*] Waiting for messages. To exit press CTRL+C")

    channel.start_consuming()


if __name__ == "__main__":
    start_worker()