import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config()
const authenticate = (req, res, next) => {
    try {
      const cookie = req.headers.cookie;
  
      if (!cookie) {
        return res.status(401).json({ msg: "No Token Provided" });
      }
  
      const [name, token] = cookie.trim().split('=');
      console.log(name);
      console.log(token);
  
      if (name === 'productToken' && token) {
        const verified = jwt.verify(token, process.env.SECRET_KEY);
        req.userid = verified.userId;
        req.email = verified.email;
        req.role = verified.role;
        console.log(req.userid);
        console.log(req.email);
        next();
      } else {
        return res.status(401).json({ msg: "Invalid Token" });
      }
    } catch (error) {
      console.error("Authentication Error", error);
      return res.status(401).json({ msg: "Invalid Token" });
    }
  };
  export { authenticate };
  