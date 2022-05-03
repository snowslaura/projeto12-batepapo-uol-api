import express, {json} from "express";
import cors from "cors";
import chalk from "chalk";
import { MongoClient, ObjectId } from "mongodb";
import joi from 'joi';
import dayjs from "dayjs";
import 'dayjs/locale/pt-br.js'
import { stripHtml } from "string-strip-html";
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
    const {name} = req.body;

    const schema = joi.string().required().messages({
        'string.base': "Name must be string!",
        'string.empty': "Name shall not be empty!"
    })
    const {error} = schema.validate(name)
    if(error){
        res.status(422).json({error: "VALIDATION_ERROR", message: error.details[0].message});
        return 
    }   
    try{        
        const checkName = await db.collection("participants").findOne({name});
        if(checkName){
            res.sendStatus(409);
            return
        }
        const participant = await db.collection("participants").insertOne({
            name,
            lastStatus: Date.now()});

        const enteringMessage = await db.collection("messages").insertOne({
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format('HH:mm:ss')
        });
        res.sendStatus(201);        
    }catch(e){
        console.error(e);
        res.sendStatus(500);        
    }
});

app.get("/participants", async (req,res)=>{    
    try{       
        const participants = await db.collection("participants").find().toArray();
        res.send(participants);        
    }catch(e){
        console.error(e);
        res.sendStatus(500);        
    }
})

app.post("/messages", async (req,res) =>{
    const {to,text,type} = req.body;    
    const {user: from} = req.headers;
    const schema = joi.object({
                to:joi.string().required(),
                text:joi.string().required(),
                type:joi.valid('message','private_message').required(),
                from:joi.string().required()
            })            
    const {error} = schema.validate({to, text, type,from},{abortEarly: false});

    if(error){
        res.sendStatus(422);
        return 
    }
   
    try{       
        const participants = await db.collection("participants").find().toArray();
        const participantsArray = participants.find( participant => participant.name === from );
        if(!participantsArray){
            res.sendStatus(422);
            return 
        }
        
        await db.collection("messages").insertOne({
            to,
            text,
            type,
            from,
            time:dayjs().format('HH:mm:ss')})
        res.sendStatus(201); 
    }catch(e){
        console.error(e);
        res.sendStatus(500);        
    }
})

app.get("/messages", async (req,res) =>{
    const {limit} = parseInt(req.query);
    const {user} = req.headers;
    try{            
        const authorizedMessages = await db.collection("messages").find({$or:[{to:"Todos"},{to:user},{from:user}]}).toArray();
        if(!limit || authorizedMessages.length<limit){
            res.send(authorizedMessages);
            return
        }        
        const lastMessages = authorizedMessages.splice(-limit);
        console.log(lastMessages);
        res.send(lastMessages);
    }catch(e){
        console.error(e);
        res.sendStatus(500);        
    }
})

app.post("/status" , async (req,res)=>{
    const {user} = req.headers
    if(!user){
        res.sendStatus(404)
        return
    }
    try{
        const participants = await db.collection("participants");         
        const checkedUser = await participants.findOne({name: user});
        if(!checkedUser){
            res.sendStatus(404)
            return
        }        
        await participants.updateOne({name: user},{$set: {lastStatus:Date.now()} })
        res.sendStatus(200)
    }catch(e){
        console.error(e);
        res.sendStatus(500);        
    }
})


async function inactiveUser(){ 
    try{
        const participants = await db.collection("participants").find().toArray(); 
        const majorStatus = participants.filter(status => ((status.lastStatus + 10000) < Date.now())); 
        if(majorStatus){
            majorStatus.forEach(async status =>{
                await db.collection("participants").deleteOne({_id: new ObjectId(status._id)})
                await db.collection("messages").insertOne({
                    from: status.name,
                    to: 'Todos',
                    text: 'sai da sala...',
                    type: 'status',
                    time: dayjs().format('HH:mm:ss')
            })
            })
        }
    }catch(e){
        console.error(e)
        res.sendStatus(500)
    }     
   
}  

setInterval(inactiveUser, 15000) 


app.listen(process.env.PORTA,()=>{
console.log(chalk.green.bold(`Server is running on: http://localhost:${process.env.PORTA}`))
})