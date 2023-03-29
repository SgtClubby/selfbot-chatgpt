// Write a class to add, update and remove users from the database using mongoose
// The mongoose schema is saved in the file ./mongo/schema.js
//
//
// The class should have the following methods:
//
// Add: Add should take in an object and add it to the database
// Update: Update should take in an object and update it in the database, having an argument to specify which field to update and what to update it to
// Remove: Remove should take in an string and remove it from the database using the steamid as the identifier
const { Convo, Crash } = require("./schema.js");


class MongoDB {
    constructor() {
        this.Player = Player;
    }

    static async getConvo() {
        const convo = await Convo.find({}, { _id: 0, __v: 0 });
        return convo;
    }

    static async addConvo(convo) {
        const newConvo = new Convo(convo);
        return await newConvo.save();
    }
    // clear the convo database
    static async clearConvo() {
        const removedConvo = await Convo.deleteMany();
        return removedConvo;
    }
    
    static async saveLastCrash(errorMessage, convo, details) {
        const crashObj = {
            _id: new Date(),
            error: errorMessage,
            convo: convo,
            details: JSON.stringify(details)
        }

        const newCrash = new Crash(crashObj);
        return await newCrash.save();
    }

}

module.exports = MongoDB;