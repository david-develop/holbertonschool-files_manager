const { MongoClient } = require('mongodb');

const host = process.env.DB_HOST ? process.env.DB_HOST : 'localhost';
const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 27017;
const database = process.env.DB_DATABASE ? process.env.DB_DATABASE : 'files_manager';
const uri = `mongodb://${host}:${port}/${database}`;

const mongodbOptions = { useUnifiedTopology: true };
const client = new MongoClient(uri, mongodbOptions);

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    console.log(!!client && !!client.topology && client.topology.isConnected())
    // Establish and verify connection
    await client.db("admin").command({ ping: 1 });
    console.log("Connected successfully to server");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);
