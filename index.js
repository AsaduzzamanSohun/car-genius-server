const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.USER}:${process.env.PASSWORD}@cluster0.k7dzav4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;



const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});




// middlewares
const logger = async (req, res, next) => {
    console.log('called: ', req.host, req.originalUrl);
    next();
};


const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    console.log("verify token: ", token);
    if (!token) {
        return res.status(401).send({ message: 'not authorized' })
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized' })
        }

        // if token is valid then decoded
        console.log('value in the token', decoded);
        req.user = decoded;
        next();

    })

}





async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)

        const servicesCollection = client.db('carGenius').collection('services');
        const bookingsCollection = client.db('carGenius').collection('bookings');

        // console.log(process.env.ACCESS_TOKEN_SECRET);

        app.post('/jwt', logger, async (req, res) => {
            const user = req.body;
            console.log(user);

            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            })

            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: false
                })
                .send();
        })


        // services

        app.get('/services', logger, async (req, res) => {
            const cursor = servicesCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        });


        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }

            const options = {

                projection: { title: 1, price: 1, service_id: 1, img: 1 },
            };

            const result = await servicesCollection.findOne(query, options);
            res.send(result);
        });


        // bookings

        app.get('/bookings', logger, verifyToken, async (req, res) => {
            console.log(req.query.email);

            // console.log('token: ', req.cookies.token);

            console.log('user in the valid token: ', req.user);

            if (req.query.email !== req.user.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const cursor = bookingsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            console.log(booking);
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });



        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedBooking = req.body;
            console.log(updatedBooking);
            const updateDoc = {
                $set: {
                    status: updatedBooking.status
                }
            };
            const result = await bookingsCollection.updateOne(filter, updateDoc);
            res.send(result)
        })


        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingsCollection.deleteOne(query);
            res.send(result);
        })



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error

    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send("Doctor is running....")
});

app.listen(port, () => console.log(`My Fucking server is running on ${port}`));