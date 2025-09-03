import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    
    // Validate videoId
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const userId = req.user?._id
    if (!userId) {
        throw new ApiError(401, "User not authenticated")
    }

    // Check if like already exists
    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: userId
    })

    if (existingLike) {
        // Unlike: Remove the existing like
        await Like.findByIdAndDelete(existingLike._id)
        
        return res.status(200).json(
            new ApiResponse(200, { isLiked: false }, "Video unliked successfully")
        )
    } else {
        // Like: Create a new like
        const newLike = await Like.create({
            video: videoId,
            likedBy: userId
        })

        return res.status(201).json(
            new ApiResponse(201, { isLiked: true }, "Video liked successfully")
        )
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    
    // Validate commentId
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }

    const userId = req.user?._id
    if (!userId) {
        throw new ApiError(401, "User not authenticated")
    }

    // Check if like already exists
    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: userId
    })

    if (existingLike) {
        // Unlike: Remove the existing like
        await Like.findByIdAndDelete(existingLike._id)
        
        return res.status(200).json(
            new ApiResponse(200, { isLiked: false }, "Comment unliked successfully")
        )
    } else {
        // Like: Create a new like
        const newLike = await Like.create({
            comment: commentId,
            likedBy: userId
        })

        return res.status(201).json(
            new ApiResponse(201, { isLiked: true }, "Comment liked successfully")
        )
    }
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    
    // Validate tweetId
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }

    const userId = req.user?._id
    if (!userId) {
        throw new ApiError(401, "User not authenticated")
    }

    // Check if like already exists
    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: userId
    })

    if (existingLike) {
        // Unlike: Remove the existing like
        await Like.findByIdAndDelete(existingLike._id)
        
        return res.status(200).json(
            new ApiResponse(200, { isLiked: false }, "Tweet unliked successfully")
        )
    } else {
        // Like: Create a new like
        const newLike = await Like.create({
            tweet: tweetId,
            likedBy: userId
        })

        return res.status(201).json(
            new ApiResponse(201, { isLiked: true }, "Tweet liked successfully")
        )
    }
})

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id
    if (!userId) {
        throw new ApiError(401, "User not authenticated")
    }

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    // Aggregation pipeline to get liked videos with video details
    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId),
                video: { $exists: true }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails"
            }
        },
        {
            $unwind: "$videoDetails"
        },
        {
            $lookup: {
                from: "users",
                localField: "videoDetails.owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        {
            $unwind: "$ownerDetails"
        },
        {
            $project: {
                _id: 1,
                createdAt: 1,
                video: {
                    _id: "$videoDetails._id",
                    title: "$videoDetails.title",
                    description: "$videoDetails.description",
                    thumbnail: "$videoDetails.thumbnail",
                    videoFile: "$videoDetails.videoFile",
                    duration: "$videoDetails.duration",
                    views: "$videoDetails.views",
                    createdAt: "$videoDetails.createdAt",
                    owner: {
                        _id: "$ownerDetails._id",
                        username: "$ownerDetails.username",
                        fullName: "$ownerDetails.fullName",
                        avatar: "$ownerDetails.avatar"
                    }
                }
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $skip: skip
        },
        {
            $limit: limit
        }
    ])

    // Get total count for pagination
    const totalLikedVideos = await Like.countDocuments({
        likedBy: userId,
        video: { $exists: true }
    })

    const totalPages = Math.ceil(totalLikedVideos / limit)

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                likedVideos,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: totalLikedVideos,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            },
            "Liked videos fetched successfully"
        )
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}