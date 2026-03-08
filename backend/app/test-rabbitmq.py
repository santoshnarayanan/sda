import pika

connection =  pika.BlockingConnection(pika.URLParameters('amqp://sda:sda123@localhost:5672/%2F'))

channel = connection.channel()
channel.queue_declare(queue='hello test rabbitmq')

print(" [x] Sent 'Hello World!'")
connection.close()
