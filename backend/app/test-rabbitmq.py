import pika

connection =  pika.BlockingConnection(pika.URLParameters('amqp://guest:guest@localhost:5672/%2F'))

channel = connection.channel()
channel.queue_declare(queue='hello test rabbitmq')

channel.basic_publish(exchange='', routing_key='hello test rabbitmq', body='Hello World!')
print(" [x] Sent 'Hello World!'")
connection.close()
