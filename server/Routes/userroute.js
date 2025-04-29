import {Router} from 'express';
import bcrypt from 'bcrypt';
import { User } from '../Model/user.js';
import jwt from 'jsonwebtoken'
import { Products } from '../Model/product.js';
import { authenticate } from '../Middleware/authenticate.js';
import { upload } from '../Middleware/upload.js';


const userroute=Router();

const convertToBase64 = (buffer) => {
  return buffer.toString('base64');
}; 

userroute.post('/signup',async(req,res)=>{
    try
    {
      const {name,email,password}=req.body;
      console.log(name);

      const existingUser=await User.findOne({email:email});
      if(existingUser || email=='admin@123')
      {
        res.status(400).send("Email Already EXist");
        console.log("Email Already Exist");
      }
      else{
        const newPassword=await bcrypt.hash(password,10);
        console.log(newPassword);
        
        const newUser=new User({
            name,
            email,
            password:newPassword
        });
        await newUser.save();
        res.status(201).send('SignedUp Successfully')
        console.log("Signed Up");
      }
      
    }
    catch(error)
    {
     console.error(error);
     res.status(500).send("Internal Server Error")
     
    }
});

userroute.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

  
    if (email === 'admin@123' && password === '123') {
      const token = jwt.sign(
        { email: 'admin@123', role: 'admin' },
        process.env.SECRET_KEY,
        { expiresIn: '1h' }
      );
      res.cookie('productToken', token, { httpOnly: true });

      return res.status(200).json({
        message: 'Admin Logged in Successfully',
        role: 'admin'
      });
    }

  
    const result = await User.findOne({ email: email });

    if (!result) {
      return res.status(400).json({ msg: "Invalid Email ID" });
    }

    const valid = await bcrypt.compare(password, result.password);
    if (valid) {
      const token = jwt.sign(
        { email: result.email, userId: result._id, role: 'user' },
        process.env.SECRET_KEY,
        { expiresIn: '1h' }
      );
      res.cookie('productToken', token, { httpOnly: true });

      return res.status(200).json({
        message: "User Logged in Successfully",
        userId: result._id,
        role: 'user'
      });
    } else {
      return res.status(401).json({ msg: "Unauthorized Access" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
});


userroute.post('/addproduct', authenticate, upload.single("productImage"), async (req, res) => {
  try {
    const { name, category, price, description } = req.body;
    const imageBase64 = req.file ? req.file.buffer.toString("base64") : null;

    let userProducts = await Products.findOne({ user: req.userid });

    if (!userProducts) {
      userProducts = new Products({
        user: req.userid,
        products: []
      });
    }

    userProducts.products.push({ name, category, price, description, image: imageBase64 });
    await userProducts.save();
    
    const addedProduct=userProducts.products
    res.status(201).json({ message: "Product added Successfully", Products: userProducts.products,productId:addedProduct._id });
    
    console.log("Product Added Successfully:", userProducts.products);
  } catch (error) {
    console.error("Error adding Product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



userroute.get('/getAllProducts', authenticate, async (req, res) => {
  try {
    console.log("Fetching products for user:", req.userid);

    const page = parseInt(req.query.page) || 1; // Default page = 1
    const limit = 5; // Max 5 products per page
    const skip = (page - 1) * limit;

    const userProducts = await Products.findOne({ user: req.userid });

    if (!userProducts) {
      return res.json({ products: [], currentPage: page, totalPages: 0 });
    }

    const totalProducts = userProducts.products.length;
    const paginatedProducts = userProducts.products.slice(skip, skip + limit);

    res.json({ 
      products: paginatedProducts,
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit)
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Internal Server Error' });
  }
});

userroute.get('/searchProductByName', authenticate, async (req, res) => {
  const { name } = req.query;

  if (!name) {
    return res.status(400).json({ message: "Please provide a product name to search" });
  }

  try {
    const allProductDocs = await Products.find();

    let matchingProducts = [];

    allProductDocs.forEach(doc => {
      const matches = doc.products.filter(product =>
        product.name.toLowerCase().includes(name.toLowerCase())
      );
      matchingProducts = matchingProducts.concat(matches);
    });

    res.status(200).json({ matchingProducts });

  } catch (error) {
    console.error("Error searching product:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

userroute.get('/Sort', authenticate, async (req, res) => {
  const { category, price } = req.query;

  if (!category) {
    return res.status(400).json({ message: "Please provide a valid category" });
  }

  try {
    const allProductsDocs = await Products.find();
    const allProducts = allProductsDocs.flatMap(doc => doc.products);

    
    let matchingProducts = allProducts.filter(product =>
      product.category.toLowerCase() === category.toLowerCase()
    );

    if (price === 'asc' || price === 'desc') {
      const sortOrder = price === 'asc' ? 1 : -1;
      matchingProducts.sort((a, b) => (a.price - b.price) * sortOrder);
    }
    

    res.status(200).json({ matchingProducts });

  } catch (error) {
    console.error("Error sorting products:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


userroute.put('/updateproduct', authenticate, upload.single('productImage'), async (req, res) => {
  try {
    const { productId, name, category, price, description } = req.body;
    const imageBase64 = req.file ? req.file.buffer.toString("base64") : null;

    const userProducts = await Products.findOne({ user: req.userid });

    if (!userProducts) {
      return res.status(404).json({ message: "No products found for this user" });
    }

    const product = userProducts.products.id(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    
    if (name) product.name = name;
    if (category) product.category = category;
    if (price) product.price = price;
    if (description) product.description = description;
    if (imageBase64) product.image = imageBase64;

    await userProducts.save();

    console.log("Updated product:", product);

    res.status(200).json({ message: "Product updated successfully", product });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

userroute.delete('/deleteproduct', authenticate, async (req, res) => {
  const { productId } = req.body;

  try {
    const userProducts = await Products.findOne({ 'products._id': productId });

    if (!userProducts) {
      return res.status(404).json({ message: "No such product found" });
    }

    // Find the specific product
    const product = userProducts.products.id(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if the owner of the Products document matches OR if user is admin
    const isOwner = userProducts.user.toString() === req.userid;
    const isAdmin = req.role === 'admin'; 

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Unauthorized to delete this product" });
    }

    // Pull the product safely
    userProducts.products.pull({ _id: productId });
    await userProducts.save();

    res.status(200).json({ message: "Product deleted successfully" });
    
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});




export {userroute}
