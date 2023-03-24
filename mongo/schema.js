const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.set('strictQuery', false);

mongoose.connect(
    process.env.MONGO_URI,
  )
  .then(()=> console.log('MongoDB connected successfully.'))
  .catch(e=>console.log(e));

const convoSchema = new Schema({
    content: String,
    role: String
});
    
const Convo = mongoose.model('convo', convoSchema);

module.exports = { Convo };