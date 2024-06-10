const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();

const jwt = require("jsonwebtoken");

const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());
console.log(process.env.DB_USER);
console.log(process.env.DB_PASSWORD);
//mongodb connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.4lrtvjx.mongodb.net/?retryWrites=true&w=majority`;

console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
//jsonwentoken create
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unathorized Access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const mealCollection = client.db("cloudKichen").collection("meals");
    const postCollection = client.db("cloudKichen").collection("posts");
    //jwt token related API
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1hr",
      });
      res.send({ token });
    });
    // limited meal items GET related api
    app.get("/meals", async (req, res) => {
      const query = {};
      const options = {
        projection: {
          ingredients: 0,
        },
        sort: {
          meal_id: -1,
        },
      };

      const cursor = mealCollection.find(query, options);
      const meals = await cursor.limit(3).toArray();
      res.send(meals);
    });
    //All meal items GET related API
    app.get("/all_meals", async (req, res) => {
      const query = {};
      const options = {
        projection: {
          ingredients: 0,
        },
      };
      const cursor = mealCollection.find(query, options);
      const all_meals = await cursor.toArray();
      res.send(all_meals);
    });
    //All meals dynamically route related API
    app.get("/all_meals/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const meal = await mealCollection.findOne(query);
      res.send(meal);
    });
    //Review section related API
    app.post("/posts", verifyToken, async (req, res) => {
      const post = req.body;
      const posts = await postCollection.insertOne(post);
      res.send(posts);
    });

    app.get("/posts", verifyToken, async (req, res) => {
      const cursor = postCollection.find().sort({ date: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    app.delete("/posts/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await postCollection.deleteOne(query);
      res.send(result);
    });
    app.put("/posts/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const post = req.body;
      const query = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updatedDoc = {
        $set: {
          rating: post?.rating !== undefined ? post.rating : "0",
          message: post?.message !== undefined ? post.message : "",
        },
      };

      console.log(updatedDoc);

      const result = await postCollection.updateOne(query, updatedDoc, option);
      res.send(result);
    });
    //Add Meals related API
    app.post("/add_meals", verifyToken, async (req, res) => {
      const item = req.body;
      const result = await mealCollection.insertOne(item);
      res.send(result);
    });
  } finally {
  }
}
run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("cloud kichen is running");
});

app.listen(port, () => {
  console.log(`cloud kichen is running on ${port}`);
});
