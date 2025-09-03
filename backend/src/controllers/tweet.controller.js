import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body;
    
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Content is required");
    }
    
    // Creating tweet document
    const tweet = await Tweet.create({
        content: content.trim(),
        owner: req.user._id
    });

    const createdTweet = await Tweet.findById(tweet._id).populate("owner", "username avatar");

    if (!createdTweet) {
        throw new ApiError(500, "Something went wrong while creating Tweet");
    }

    return res.status(201).json(
        new ApiResponse(201, createdTweet, "Tweet created successfully")
    );
});

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Validate userId
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get user tweets with pagination
    const tweets = await Tweet.find({ owner: userId })
        .populate("owner", "username avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const totalTweets = await Tweet.countDocuments({ owner: userId });

    return res.status(200).json(
        new ApiResponse(200, {
            tweets,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalTweets / limit),
                totalTweets,
                hasNextPage: page < Math.ceil(totalTweets / limit),
                hasPrevPage: page > 1
            }
        }, "User tweets fetched successfully")
    );
});

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content } = req.body;

    // Validate tweetId
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    // Validate content
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Content is required");
    }

    // Find the tweet
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    // Check if user is the owner of the tweet
    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this tweet");
    }

    // Update the tweet
    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        { content: content.trim() },
        { new: true }
    ).populate("owner", "username avatar");

    return res.status(200).json(
        new ApiResponse(200, updatedTweet, "Tweet updated successfully")
    );
});

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    // Validate tweetId
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    // Find the tweet
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    // Check if user is the owner of the tweet
    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this tweet");
    }

    // Delete the tweet
    await Tweet.findByIdAndDelete(tweetId);

    return res.status(200).json(
        new ApiResponse(200, {}, "Tweet deleted successfully")
    );
});

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}