import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const subscriptionSchema = new Schema({

    subscriber:{
        type: Schema.Types.ObjectId, // one who subscribing
        ref:"user"
    },
    channel:{
        type: Schema.Types.ObjectId, // one whom get subscribed
        ref:"user"
    }
    

},{timestamps:true})

subscriptionSchema.plugin(mongooseAggregatePaginate);

export const Subscription = mongoose.model("Subscription",subscriptionSchema);