const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.set('strictQuery', false);

mongoose.connect(process.env.MONGO_URI)
  .then(()=> console.log('MongoDB connected successfully.'))
  .catch(e=>console.log(e));

const convoSchema = new Schema({
    content: String,
    role: String
});
  
const crashSchema = new Schema({
    _id: Date,
    error: String,
    convo: Schema.Types.Mixed,
    details: Schema.Types.Mixed
});
const Convo = mongoose.model('convo', convoSchema);
const Crash = mongoose.model('error', crashSchema);

module.exports = { Convo, Crash };