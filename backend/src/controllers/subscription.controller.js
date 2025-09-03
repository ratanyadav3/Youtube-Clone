import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    
    // Validate channelId
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID")
    }
    
    // Get the current user ID (assuming it's available from auth middleware)
    const userId = req.user?._id
    if (!userId) {
        throw new ApiError(401, "User not authenticated")
    }
    
    // Check if user is trying to subscribe to themselves
    if (userId.toString() === channelId) {
        throw new ApiError(400, "You cannot subscribe to yourself")
    }
    
    // Check if channel exists
    const channel = await User.findById(channelId)
    if (!channel) {
        throw new ApiError(404, "Channel not found")
    }
    
    // Check if subscription already exists
    const existingSubscription = await Subscription.findOne({
        subscriber: userId,
        channel: channelId
    })
    
    if (existingSubscription) {
        // Unsubscribe: Delete the subscription
        await Subscription.findByIdAndDelete(existingSubscription._id)
        
        return res.status(200).json(
            new ApiResponse(200, null, "Unsubscribed successfully")
        )
    } else {
        // Subscribe: Create new subscription
        const newSubscription = await Subscription.create({
            subscriber: userId,
            channel: channelId
        })
        
        return res.status(201).json(
            new ApiResponse(201, newSubscription, "Subscribed successfully")
        )
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    
    // Validate channelId
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID")
    }
    
    // Check if channel exists
    const channel = await User.findById(channelId)
    if (!channel) {
        throw new ApiError(404, "Channel not found")
    }
    
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    
    // Create aggregation pipeline to get subscribers with their details
    const pipeline = [
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails"
            }
        },
        {
            $unwind: "$subscriberDetails"
        },
        {
            $project: {
                _id: 1,
                subscriber: {
                    _id: "$subscriberDetails._id",
                    username: "$subscriberDetails.username",
                    fullName: "$subscriberDetails.fullName",
                    avatar: "$subscriberDetails.avatar"
                },
                createdAt: 1
            }
        },
        {
            $sort: { createdAt: -1 }
        }
    ]
    
    // Apply pagination
    const options = {
        page,
        limit,
        customLabels: {
            totalDocs: 'totalSubscribers',
            docs: 'subscribers'
        }
    }
    
    const subscribers = await Subscription.aggregatePaginate(
        Subscription.aggregate(pipeline),
        options
    )
    
    return res.status(200).json(
        new ApiResponse(200, subscribers, "Subscribers fetched successfully")
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    
    // Validate subscriberId
    
    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber ID")
    }
    
    // Check if user exists
    const user = await User.findById(subscriberId)
    if (!user) {
        throw new ApiError(404, "User not found")
    }
    
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    
    // Create aggregation pipeline to get subscribed channels with their details
    const pipeline = [
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails"
            }
        },
        {
            $unwind: "$channelDetails"
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "channel",
                foreignField: "channel",
                as: "subscriberCount"
            }
        },
        {
            $project: {
                _id: 1,
                channel: {
                    _id: "$channelDetails._id",
                    username: "$channelDetails.username",
                    fullName: "$channelDetails.fullName",
                    avatar: "$channelDetails.avatar",
                    subscribersCount: { $size: "$subscriberCount" }
                },
                createdAt: 1
            }
        },
        {
            $sort: { createdAt: -1 }
        }
    ]
    
    // Apply pagination
    const options = {
        page,
        limit,
        customLabels: {
            totalDocs: 'totalSubscriptions',
            docs: 'subscriptions'
        }
    }
    
    const subscriptions = await Subscription.aggregatePaginate(
        Subscription.aggregate(pipeline),
        options
    )
    
    return res.status(200).json(
        new ApiResponse(200, subscriptions, "Subscribed channels fetched successfully")
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}