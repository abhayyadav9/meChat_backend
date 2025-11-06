import mongoose from "mongoose";


const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("database connected successfully");
  } catch (error) {
    console.log("unable to connect with database");
    console.log(error);
  }
};

export default connectDb;
