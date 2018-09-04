const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create Schema
const SubscriberSchema = new Schema({
  "first_name": {
    type: String,
    required: true
  },
  "last_name": {
    type: String,
    required: true
  },
  "email": {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

mongoose.model('subscribers', SubscriberSchema);
