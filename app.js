const { setInterval } = require('timers');

require('dotenv').config();
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 8081;

// worker connect kafka
const { Kafka, logLevel } = require('kafkajs')


const kafka = new Kafka({
    logLevel: logLevel.INFO,
    brokers: [`${process.env.KAFKA_HOST}:${process.env.KAFKA_PORT}`],
    clientId: 'example-consumer',
})

const topic = process.env.KAFKA_TOPIC_IMAGE
const consumer = kafka.consumer({ groupId: 'test-group' })

const run = async () => {
    await consumer.connect()
    await consumer.subscribe({ topic, fromBeginning: true })
    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            io.emit('result', message.value.toString());
        }
    })
}



run().catch(e => console.error(`[example/consumer] ${e.message}`, e))

const errorTypes = ['unhandledRejection', 'uncaughtException']
const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2']

errorTypes.map(type => {
    process.on(type, async e => {
        try {
            console.log(`process.on ${type}`)
            console.error(e)
            await consumer.disconnect()
            process.exit(0)
        } catch (_) {
            process.exit(1)
        }
    })
})

signalTraps.map(type => {
    process.once(type, async () => {
        try {
            await consumer.disconnect()
        } finally {
            process.kill(process.pid, type)
        }
    })
})

http.listen(port, function(){
    console.log('listening on *:' + port);
});



