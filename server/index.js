import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import {userroute} from './Routes/userroute.js'

dotenv.config();
const app=express();

app.use(express.json());

mongoose.connect("mongodb://localhost:27017/Product_Management").then(()=>{
    console.log("MONGODB Connected Successfully to Product Management Application");
    
}).catch((error)=>{
    console.error("MONGODB Connection Failed", error);
    
});

app.listen(process.env.PORT, function () {
    console.log(`Server is listening at ${process.env.PORT}`);
})

app.use('/',userroute)
