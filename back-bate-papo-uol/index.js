import express, {json} from "express";
import cors from "cors";
import chalk from "chalk";
import { MongoClient } from "mongodb";
import joi from 'joi';
import dotenv from "dotenv";
dotenv.config();


const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect(() =>{
    db = mongoClient.db(process.env.BANCO_MONGO)
})

const app = express();
app.use(cors());
app.use(json());

app.post("/participants", async (req,res) =>{
    const {name} = req.body
    const schema = joi.string()
    const {error} = schema.validate(name)

    try{
        if(error){
            return res.sendStatus(422);
        }
        const participant = await db.collection("participants").insertOne({name, lastStatus: Date.now()})
        res.send(participant).status(201);
    }catch(e){
        console.error(e)
        res.sendStatus(500);
    }
});

app.get("/",(req,res)=>{
    res.send("Deu bom!")
})

app.listen(process.env.PORTA,()=>{
console.log(chalk.green.bold(`Server is running on: http://localhost:${process.env.PORTA}`))
})