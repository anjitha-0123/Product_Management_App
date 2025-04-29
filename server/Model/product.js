import { Schema,model } from "mongoose";
const ProductSchema=new Schema({
    user:{type:Schema.Types.ObjectId,ref:"User",required:true,index:true},
    products:[{
        name:{type:String,required:true},
        category:{type:String,required:true},
        price:{type:String,required:true},
        description:{type:String,required:true},
        image:{type:String,required:true}
    }]
});

const Products = model("Products",ProductSchema);
export {Products};
