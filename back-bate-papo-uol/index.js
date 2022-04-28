import express, {json} from "express";
import cors from "cors";
import chalk from "chalk";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();


const app = express();
app.use(cors());
app.use(json());

let db;
const mongoClient = new MongoClient(process.env.MONGO_URI);

// mongoClient.connect().then(() => {
// 	db = mongoClient.db("meu_lindo_projeto");
// });


app.get("/",(req,res)=>{
    res.send("Deu bom!")
})

app.listen(5000,()=>{
console.log(chalk.green.bold("Server is running on: http://localhost:5000"))
})