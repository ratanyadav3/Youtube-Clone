import mongoose, { isValidObjectId } from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    if (!userId) {
        throw new ApiError(401, "User not Authenticated");
    }

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid UserID");
    }

    // Get total subscribers count
    const totalSubscribers = await Subscription.countDocuments({
        channel: userId
    });

    // Get total videos and total views using aggregation
    const videoStats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group: {
                _id: null,
                totalVideos: { $sum: 1 },
                totalViews: { $sum: "$views" }
            }
        }
    ]);

    // Get total likes on user's videos
    const likeStats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $group: {
                _id: null,
                totalLikes: { $sum: { $size: "$likes" } }
            }
        }
    ]);

    // Get total likes on user's tweets/comments (if applicable)
    const userContentLikes = await Like.countDocuments({
        likedBy: userId
    });

    // Extract values or set defaults
    const totalVideos = videoStats.length > 0 ? videoStats[0].totalVideos : 0;
    const totalViews = videoStats.length > 0 ? videoStats[0].totalViews : 0;
    const totalLikesOnVideos = likeStats.length > 0 ? likeStats[0].totalLikes : 0;

    // Get channel's recent activity (last 5 videos)
    const recentVideos = await Video.find({ owner: userId })
        .select("title views createdAt")
        .sort({ createdAt: -1 })
        .limit(5);

    const channelStats = {
        totalSubscribers,
        totalVideos,
        totalViews,
        totalLikesOnVideos,
        userContentLikes,
        recentVideos,
        averageViewsPerVideo: totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0
    };

    return res.status(200).json(
        new ApiResponse(200, channelStats, "Channel stats fetched successfully")
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { page = 1, limit = 10, sortBy = "createdAt", sortType = "desc" } = req.query;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User ID");
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Define sort order
    const sortOrder = sortType === "desc" ? -1 : 1;

    // Get videos with detailed information using aggregation
    const videos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "comments"
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                commentsCount: { $size: "$comments" }
            }
        },
        {
            $project: {
                title: 1,
                description: 1,
                thumbnail: 1,
                videoFile: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                likesCount: 1,
                commentsCount: 1,
                createdAt: 1,
                updatedAt: 1
            }
        },
        {
            $sort: { [sortBy]: sortOrder }
        },
        {
            $skip: skip
        },
        {
            $limit: parseInt(limit)
        }
    ]);

    // Get total count for pagination
    const totalVideos = await Video.countDocuments({ owner: userId });

    // Calculate pagination info
    const totalPages = Math.ceil(totalVideos / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const response = {
        videos,
        pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalVideos,
            hasNextPage,
            hasPrevPage,
            limit: parseInt(limit)
        }
    };

    return res.status(200).json(
        new ApiResponse(200, response, "Channel videos fetched successfully")
    );
});

export {
    getChannelStats,
    getChannelVideos
}